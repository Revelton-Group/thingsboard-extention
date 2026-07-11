# Hotel Dashboard — Production Readiness Audit

**Scope:** `src/app/components/revelton-tb-extension-dashboard/` (~22,700 lines)
**Date:** 2026-07-11
**Focus areas requested:** loading machinery, data-update machinery, logic errors, unused code, performance.

All file paths below are relative to `src/app/components/revelton-tb-extension-dashboard/` unless stated otherwise. Line numbers refer to the state of the code **before** the fixes applied alongside this report; items marked ✅ **FIXED** were corrected in the same change set.

---

## Executive summary

The dashboard works, but it carries several **confirmed logic errors** (two of them user-visible: stale KPI stats and air-quality alerts that can never fire), a **startup HTTP/change-detection storm**, a **30-second polling loop that scales poorly** with device count, roughly **1,000+ lines of dead or duplicated code**, and **no error or loading UX** for the main grid. There is no test suite, so build + lint are the only automated gates.

Severity legend: 🔴 user-visible bug · 🟠 correctness/robustness risk · 🟡 performance/maintainability.

| Area | Verdict |
|------|---------|
| Logic correctness | 🔴 9 confirmed issues (L1–L9 below) — 8 fixed in this change set |
| Loading | 🟠 No loading state on main grid; connection errors invisible; startup fan-out of 5 HTTP calls per device |
| Data updating | 🟡 Zero OnPush; ~60 manual `detectChanges()`; 3 parallel 10s forced-CD timers; heavy per-cycle template work |
| Unused code | 🟡 ~15 dead members, 3 dead model interfaces, 8 unused components, massive helper duplication |
| Production readiness | 🟠 No tests, no error UX, singleton state never resets |

---

## 1. Logic errors

### L1 — Hotel KPI stats clobbered by stale re-emission ✅ FIXED
`core/services/hotel-state.service.ts:702-705`

`_doProcessDataUpdate()` calls `updateHotelStats(rooms, stats)`, which computes and emits the correct `HotelStats` object. Immediately afterwards it re-emitted the **stale spread copy** made at the top of the method (`this._hotelStats$.next(stats)`), overwriting the computed KPIs. The last-emitted value each cycle was always one cycle behind (zeros on first load). The bug was masked in practice only because discovery merges re-emit corrected stats asynchronously.

**Fix applied:** removed the stale re-emission; `updateHotelStats()` is the single emitter.

### L2 — Air-quality status thresholds in wrong units (alerts can never fire) ✅ FIXED
`core/services/room-data.service.ts:127-134` + `calcStatus` (:1016-1027)

`THRESHOLDS.airQuality` was overwritten from `config.airQuality.co2Max` in **ppm** (default 1000 → `{warning: 800, danger: 1000}`), but `calcStatus('airQuality', …)` compares against the **computed AQI index** (0–~200 scale) produced by `calculateAirQuality()`. Because `config$` is a `BehaviorSubject`, this fired immediately at startup, instantly replacing the correct AQI-scale initializer `{warning: 100, danger: 150}`. Result: **the air-quality warning/danger status on room cards could never trigger** (AQI would need to reach 800). Verified: `DEFAULT_CONTROL_PANEL_CONFIG.airQuality = {enabled: true, co2Max: 1000}` (`features/control-panel/models/control-panel.models.ts:176-177`).

**Fix applied:** thresholds stay in AQI units (`{warning: 100, danger: 150}`). The configured `co2Max`/`pm25Max`/… still shift the AQI curve itself via `customBreakpoints` in `aggregateAll()`, which is the correct mechanism.

### L3 — Duplicate `switch` case: plug status unreachable ✅ FIXED
`core/services/room-data.service.ts:426` vs `:582`

`case 'data_device_status':` appeared twice in the same `switch`. In JavaScript only the first label wins, so the plug/socket branch at :582 was dead — **plug devices never received their `deviceStatus` from `data_device_status` telemetry**.

**Fix applied:** the duplicate label was removed from the plug block and plug handling added to the first (reachable) case, guarded by `isPlugDevice()`.

### L4 — Mews heartbeat key typo ✅ FIXED
`core/services/hotel-state.service.ts:448`

The Mews key list contained `"lastheartbeautc"` (missing a `t`), so devices reporting `lastHeartbeatUtc` were not recognized by the key-based bridge detection. **Fix applied:** corrected to `"lastheartbeatutc"`.

### L5 — Mews bridge detection swallows unrelated devices ✅ FIXED
`core/services/hotel-state.service.ts:452`

`isMewsBridge = isMewsByName || (gateway && hasMewsKeys) || hasMewsKeys` — the trailing `|| hasMewsKeys` meant **any** device with a telemetry key named `is_online`, `error_message`, `rooms_synced`, etc. was treated as the Mews bridge and its telemetry silently dropped (`return`). **Fix applied:** tightened to `isMewsByName || (lowerName.includes("gateway") && hasMewsKeys)`.

> ⚠️ Behavior change: a Mews bridge that is matched *only* by its telemetry keys (name/profile contains neither "mews" nor "gateway") will no longer be detected. If such a bridge exists in production, rename it or set its device profile to contain "mews".

### L6 — 30s refresh timer polls a stale widget context ✅ FIXED
`core/services/hotel-state.service.ts:1168`

The periodic refresh timer closed over the `ctx` captured at discovery time. `lastCtx` (:208) was assigned on every data update but **never read** — the exact field that should have solved this. If ThingsBoard recreates the widget context, polling continued against the dead one. **Fix applied:** the timer now uses `this.lastCtx` (falls back to the captured ctx).

### L7 — Datasource dedup broken by object-typed entityId ✅ FIXED
`core/services/hotel-state.service.ts:626-631`

`item.datasource.entityId` was used raw as a `Set` key, although everywhere else the code carefully unwraps `{id}` objects vs strings. Object identities defeat `Set` dedup → duplicate datasources accumulated per room. **Fix applied:** normalized to the string id before keying.

### L8 — `checkPillClass` ternary with identical branches ✅ SIMPLIFIED (behavior preserved)
`core/services/room-data.service.ts:735`

`res.checkPillClass = isLate ? 'pill-wait' : 'pill-wait';` — both branches identical; the neighboring lines use `pill-danger`/`icon-orange` when a guest is late, so this looks like an unfinished edit. **Applied:** simplified to the constant `'pill-wait'` with no behavior change. **Open decision for the team:** if late arrivals should render a red pill, change it to `isLate ? 'pill-danger' : 'pill-wait'`.

### L9 — Fake immutable update (shallow copy) — NOT fixed here, scheduled for refactor
`core/services/room-data.service.ts:188`

`const newData = { ...currentData }` is a **shallow** copy: every nested device map (`tempDevices`, `trvDevices`, …) is the same object reference as the previous state. The "immutable update" is cosmetic; mutations write through to the old object. This only works because the whole dashboard runs Default change detection. It **blocks any OnPush migration** and makes state diffing impossible. Fixing it properly means introducing real per-slice immutable updates — deferred to Phase 3 of [SOLID_REFACTOR_PLAN.md](SOLID_REFACTOR_PLAN.md) (behavior-preserving processor migration) rather than risking a blind deep-copy performance hit now.

---

## 2. Loading section

- **No loading state for the main room grid.** `features/hotel-dashboard/revelton-hotel.component.html:488` renders an empty-state block when `rooms.length === 0` — indistinguishable from "still loading". Staff see "no rooms" during startup. Only `room-historical-data` implements a real `loading` flag + spinner (and it does it correctly — every set has a matching reset, including catch paths).
- **Connection errors are invisible.** `HotelStateService.connectionError$` (:174-175) emits on HTTP failure/timeout (:251, :263) but has **zero consumers** anywhere in the codebase. There is no error banner; a dead network looks like a healthy-but-empty hotel. → Wire a banner in refactor Phase 6.
- **`room-detail-panel` fetches silently.** `initializeSharedAttributes` (:474+) and `fetchHistoricalVitals` (:1550+) have no loading indicator (only a static "Loading devices…" text behind an `*ngIf` on an empty list).
- **Startup discovery fan-out.** Every discovered device triggers **5 HTTP calls** (keys + telemetry + 3 attribute scopes, `fetchDeviceData` :1409-1456), and before this change set every response individually re-emitted `rooms$` and recomputed hotel stats (`mergeDeviceDataIntoRoom` :1732-1739): N devices = N full re-emissions + N change-detection storms at load. ✅ Emissions are now **batched** (see §5); the 5-calls-per-device fan-out itself remains and is addressed in the refactor plan (batch/WebSocket strategy).
- **`httpGetWithRetry`** (:237-271) never clears its 10s timeout guard on success (harmless but leaves pending timers) and uses the deprecated `subscribe(next, err)` signature — as does most of the service.

## 3. Data-updating section

- **Zero `OnPush` components** in the entire dashboard (verified repo-wide grep). Instead, ~60 manual `detectChanges()` calls are spread across 6 components (revelton-hotel ~21, room-detail-panel ~18, control-panel ~20).
- **Three parallel 10-second `setInterval`s each force full CD:** `revelton-hotel.component.ts:320`, `room-card.component.ts:151`, `room-detail-panel.component.ts:428`. ✅ These now skip work while the tab is hidden. Additionally the `document:click` HostListener (revelton-hotel :221) runs `closeAllDropdowns()` + `detectChanges()` on *every click anywhere* in the ThingsBoard page.
- **One data tick used to cause 4–5 synchronous CD passes:** the four service subscriptions in revelton-hotel (:254-271) each call `detectChanges()`, and `_doProcessDataUpdate` emitted rooms$ + stats (twice, L1) + otherDevices$. L1 fix + discovery batching reduce this substantially.
- **30s full-telemetry re-poll scales poorly.** `refreshAllDeviceTelemetry` (:1745) re-runs the 5-call fan-out for every discovered device every 30 s. At ~30 rooms × 4 devices that is ≈ 600 requests/30s against the TB REST API. No batching, no use of TB WebSocket subscriptions, no visibility pause. → Refactor plan Phase 5.
- **Template hot paths** (all run every CD cycle because of Default CD):
  - `formatRoomTitle()` was called 3× per room per cycle (revelton-hotel.component.html:320-323) — ✅ now memoized.
  - `getSelectedRoomData()` (:496) and `getArray()` (:541-542) returned **fresh object/array references on every CD cycle**, churning child `ngOnChanges` while the room/historical overlays were open — ✅ now cached, recomputed only when the source changes.
  - `other-devices-panel` called `getThermostats`/`getEnvSensors`/`getSensors` **twice each** per room per cycle, each `.filter()`ing the device list, plus a `lowBatteryDevices` getter iterating all devices — ✅ now precomputed in `ngOnChanges`.
  - `room-detail-panel` evaluates ~13 function bindings per air-quality sensor row (`timeAgo`, `getSignalColor`, `getBatteryIcon`, … across 5 device loops) — left as-is; resolved by presentation components in the refactor.
  - `control-panel` rebuilds `getTimelineSegments()` per cycle — left as-is (panel usually closed).
- **Missing `trackBy`:** ✅ added to the highest-churn lists — `metricCards` (room-historical-data.component.html:22), `checkInsList`/`checkOutsList`/`batteryAlertDevices` (revelton-hotel), other-devices-panel loops. Remaining low-priority ones (static option lists, control-panel internals) are catalogued for the refactor.
- **`Intl.DateTimeFormat` constructed per room per stats pass** (`getPragueParts`, hotel-state.service.ts:766-783) — ✅ hoisted to cached module-level formatters (same for `updateTime` in revelton-hotel).
- **`timeAgo` strings frozen at ingestion time** (`room-data.service.ts:346`): the "x minutes ago" string is computed when telemetry arrives and only refreshes on the next data pass — display formatting living in the data layer. → Refactor: pipe-based, computed at render.
- **Singleton state never resets.** `HotelStateService` is `providedIn: 'root'`: `roomMap`, `discoveredDevices`, `triggeredOtherAssets`, `discoveryDone` persist across widget destroy/recreate; rooms deleted in ThingsBoard never disappear from the UI until a full page reload; `ngOnDestroy` (:228) effectively never fires for a root service, so the 30s timer survives widget removal. → Refactor Phase 5 introduces `RoomRegistry.reset()` tied to widget lifecycle.

## 4. Unused code & duplication

### Removed in this change set ✅
- `revelton-hotel.component.ts`: `toggleThemeDropdown`, `toggleControlDropdown`, `saveControlConfig` (empty stub), `selectTheme`, `setThemeMode`, backing state `showThemeDropdown`/`showControlDropdown` (the dropdown markup no longer exists in the template), `cleanDate`, `getTypeIcon`, `getPrimaryValue`.
- `room-detail-panel.component.ts`: `getThermostatSectionColor`, `closeHistoricalData`, `toggleMode`, `togglePreset`, `getLinkQualityClass`, `trackById` — all definition-only, zero references.

**Orphaned feature (kept, decision needed):** the "Vital Chart Expand Modal" in `room-detail-panel.component.html:416+` is a complete feature (state fields, `expandVital()`/`closeExpandedVital()`, `getVitalConfig()`, ~60-line template) whose **trigger was lost** — nothing calls `expandVital()`, so the modal can never open. It was deliberately built, so it was NOT deleted; either re-wire a click handler on the vital cards or remove the whole cluster.
- `room-data.service.ts`: `dataSubject`/`data$` (never nexted, never consumed), unused `HttpClient` injection.
- `core/models/room-card.models.ts`: `AirQualitySensor`, `RoomSensor`, `RoomAlert` interfaces (zero references).
- `hotel-state.service.ts`: stale "1:1 copy from revelton-hotel.component.ts" comment (that method no longer exists there); `lastCtx` is now actually used (L6) instead of being dead.

### Flagged only — do NOT delete blindly
**8 unused components:** `tb-activity-logs`, `tb-air-quality-sensor`, `tb-noise-sensor`, `tb-occupancy-sensor`, `tb-sensor-tile`, `tb-water-leak-sensor`, `tb-window-sensor` (all exported from `public-api.ts` → they may be referenced as widget entry points inside live ThingsBoard dashboards, like `tb-room-card` is), plus `tb-sparkline` (not in public-api). Root cause: `room-detail-panel.component.html` re-implements their markup inline. **The refactor plan reuses them as the presentation layer instead of deleting them.**

### Duplication catalogue (input to the refactor)
- `extractRoomNumber` — 3 divergent copies (`hotel-state.service.ts:284` full version, `room-card.component.ts:171` weaker version missing two fallbacks).
- `getLinkQualityText` ×11 files; `getLinkQualityClass` ×9 files.
- Battery helpers `getBatteryIcon`/`getBatteryColor`/`getBatteryBg` — byte-identical in thermostat-card ↔ room-detail-panel; signal helpers ×3 files.
- `timeAgo` ×2 (+ ingestion-time variant), `formatDatetimeLocal`/`parseDatetimeLocal`/`formatNum` duplicated across room-historical-data ↔ room-detail-panel.
- Custom date-range logic (`hasCustomRangeChanged`/`applyCustomRange`/`parseDateStr`) duplicated revelton-hotel ↔ room-historical-data.
- Socket helpers (`toggleSocket`/`isSocketOn`) duplicated smart-sockets-panel ↔ room-detail-panel; thermostat mode/preset handlers duplicated thermostat-card ↔ room-detail-panel.
- `t` translation getter re-declared in 18 files.
- Device-profile fetch block duplicated *within* hotel-state.service (:361-379 vs :1318-1336); `formatDeviceName` repeats the same type-map literal 3× inside one method (:958-1016).
- `compact-thermostat` and `compact-env-sensor` are near-identical twins (~8 shared members).
- 31 `console.*` statements across 6 files (10 in control-panel.service — ✅ info-level ones now gated behind a DEBUG flag; `console.error` kept).

## 5. Fixes applied alongside this report

**Logic (one commit):** L1–L8 as described above.
**Dead code (one commit):** everything under "Removed in this change set".
**Performance quick wins (one commit):**
1. Discovery emissions batched — `mergeDeviceDataIntoRoom`/`mergeDeviceDataIntoOther` now schedule a single debounced emit instead of emitting per HTTP response.
2. `formatRoomTitle` memoized (Map cache).
3. `getSelectedRoomData()` / `getArray()` replaced by cached properties recomputed only when their source changes.
4. `other-devices-panel` lists precomputed in `ngOnChanges`.
5. `trackBy` added to metricCards, check-ins/outs, battery list, other-devices loops.
6. `Intl.DateTimeFormat` instances hoisted and cached.
7. Weather no longer refetched on language switch — the cached weather code is re-mapped locally.
8. The three 10s periodic-CD timers skip work while `document.hidden`.
9. Control-panel info logs gated behind DEBUG.

## 6. Production-readiness gaps (not addressed in this change set)

1. **No test suite** — zero `*.spec.ts` files; the riskiest gap for any refactor. First specs should target the pure processor functions (see refactor plan Phase 6).
2. **No error UX** — wire `connectionError$` to a dismissible banner; add retry affordance.
3. **No skeleton/loading state** for the main grid (distinguish "loading" from "no rooms").
4. Weather fetched via bare `fetch()` with no timeout/abort.
5. `HotelStats.batteryAlertDevices` local type declares `battery: number` but `null` is pushed (hotel-state.service.ts:733-838) — typing looseness.
6. Deprecated RxJS `subscribe(next, err)` signatures throughout the services.
7. The 5-calls-per-device × 30s polling model should move to ThingsBoard WebSocket subscriptions or batched REST in the refactor.

## Next step

See [SOLID_REFACTOR_PLAN.md](SOLID_REFACTOR_PLAN.md) for the phased plan to rebuild the dashboard as typed, SOLID, OnPush component architecture reusing the existing (currently unused) shared sensor components.
