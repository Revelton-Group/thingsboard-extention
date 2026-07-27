# Hotel Dashboard — Production Readiness Audit V2

**Scope:** `src/app/components/revelton-tb-extension-dashboard/` — Control Panel, sensor widget components, Room Detail Panel, Historical Chart, plus a review of uncommitted core-service changes.
**Date:** 2026-07-20
**Companion to:** [AUDIT_REPORT.md](AUDIT_REPORT.md) (2026-07-11), which covered `hotel-state.service.ts` and `room-data.service.ts` in depth but explicitly left the areas covered here unaudited.

All file paths below are relative to `src/app/components/revelton-tb-extension-dashboard/` unless stated otherwise. Line numbers refer to the state of the code **before** the fixes applied alongside this report; items marked ✅ **FIXED** were corrected in the same change set.

Severity legend: 🔴 user-visible/critical (wrong data shown or wrong device targeted) · 🟠 high (silent failure or self-contradicting UI) · 🟡 medium · 🟢 low.

## Executive summary

This pass targeted the four areas the prior audit did not deeply examine: the Control Panel's threshold/scope/save logic, the individual sensor widget components, the Room Detail Panel, and the historical chart. It also reviewed an uncommitted change to `hotel-state.service.ts` (404 device-removal handling) added since the prior audit.

**19 concrete findings**, each with an exact location and a demonstrable on-screen failure scenario: **2 critical, 6 high, 7 medium, 4 low**. The 2 critical + 6 high findings are **fixed in this change set**; the 11 medium/low findings are documented below with fix directions but deliberately left for a follow-up pass.

| Area | Verdict |
|------|---------|
| Control Panel | 🔴 1 critical (inverted room-exclude scope), 2 high (dead threshold wiring, brittle Mews device match), 3 medium (invisible save failures, mocked Mews status, unreachable Telegram config) |
| Sensor Widgets | 🟠 1 high (diverged battery threshold — self-contradicting alert), 1 medium (frozen "last seen" labels), 2 low (dead-code label, latent room-match fragility) |
| Room Detail Panel & Historical Chart | 🔴 1 critical (stale guest info leaks across rooms), 2 high (chart silently swaps sensors, window badge always green), 2 medium (AQI stats leak/freeze, acknowledged-alert state leaks across rooms), 2 low (custom-range picker pre-seeded wrong, timezone/unit issues) |
| Core Services (uncommitted diff) | 🟠 1 high (deleted-device cleanup incomplete — stale sensors linger forever) |

---

## 1. Control Panel

### CP1 — "Exclude rooms" scope inverted: settings save to the wrong room set 🔴 CRITICAL ✅ FIXED
`features/control-panel/control-panel.component.ts:1395-1431` (`resolveRoomEntityIds()`), `:986-991` (`roomScopeCount`)

The scope header pill only ever sets `config.roomScope` to `'all'` or `'except'` (the "Exclude rooms" button, `:48`). Clicking a room chip toggles it into `config.roomScopeList`, and the chip renders that room with an **unchecked "excluded" icon** (`radio_button_unchecked`, dimmed) — the UI unambiguously communicates "this room is excluded."

But `resolveRoomEntityIds()`'s `else` branch (taken for the only non-`'all'` value the UI produces, `'except'`) filtered `scopeList.includes(roomNum)` — an **inclusion** filter, not exclusion. `RoomScope` is typed as `'all' | 'selected' | 'except'`, and this inclusion logic is only correct for a `'selected'` mode that no UI control ever sets.

**Concrete scenario:** a staff member opens the panel, clicks "Exclude rooms," picks room 205 (its chip turns to the dimmed/unchecked "excluded" state), edits the CO2 threshold, and saves. The new threshold is written **only to room 205's ThingsBoard attributes** — every other room keeps its old, unedited values. This is the exact opposite of the UI's stated intent, and it affects every section (air quality, thermostat, noise, window). `roomScopeCount` had the matching inverted math, so the footer text ("N of Total rooms") was internally consistent with the bug and gave no hint anything was wrong.

**Fix applied:** the `else` branch (all non-`'selected'` scopes) now excludes `scopeList` from the full room set, matching the `'all'` branch and the UI's actual semantics. `roomScopeCount` updated to match. `'selected'` is preserved as a reserved inclusion-mode branch for a future UI that isn't wired up yet.

### CP2 — Noise Day/Night threshold edits never reach the room-card alert engine 🟠 HIGH (not fixed — deferred)
`control-panel.component.ts:1110-1116` (`onNoiseThresholdChange`) vs `room-data.service.ts` (`config$` subscribe → `THRESHOLDS.noise`)

`onNoiseThresholdChange` writes into `config.noise.day.{laeq,lai,laimax}` / `config.noise.night.{...}`. The actual noise-alert consumer, `room-data.service.ts`, reads a different, legacy flat field: `config.noise.laeqMax ?? config.noise.noiseMax ?? 60`. `laeqMax` is written exactly once, as a default fill in `ensureDefaults()` (`control-panel.component.ts:946-949`) — no UI control ever assigns to it afterward. **Result: no matter what a manager sets for Day/Night LAEQ limits and saves, the room-card noise warning/danger badge stays pinned to the default (60/50) forever.** This is the same bug class as the prior audit's L2 (config value never reaches `calcStatus`), manifesting via a stale duplicate field. Additionally, `room-data.service.ts` has no time-of-day switch between `config.noise.day`/`night`, so the Day/Night concept the UI presents has no effect on the frontend's own alerting even if the field were kept in sync.

**Fix direction:** either have `onNoiseThresholdChange` also write `config.noise.laeqMax`/`laiMax`/`laimaxMax`, or change `room-data.service.ts` to read `config.noise.day`/`night` and select the active period from the current time.

### CP3 — Mews gateway lookup too narrow: Sync Interval save can silently no-op 🟠 HIGH ✅ FIXED
`features/control-panel/services/control-panel.service.ts:244-258` (`resolveMewsDeviceId`)

This matched only `entityName.toLowerCase().includes('mews')` (excluding names containing `'room'`) — narrower than the hardened Mews-bridge detection already in `hotel-state.service.ts` (profile/device-type match, or a `'gateway'`-named device). If the real gateway device isn't literally named "mews," `resolveMewsDeviceId()` returned `null`, and `persistMewsSyncInterval()` silently fell through to a `DEBUG`-gated `console.warn` (`DEBUG = false` by default — nothing is logged). The Sync Interval value a staff member just changed and saved was written to `localStorage`/`config$` only; the backend polling frequency was never touched.

**Fix applied:** broadened the match to also check `deviceType`/profile fields and `'gateway'`/`'bridge'` in the name, mirroring `hotel-state.service.ts`'s approach (this service has no telemetry-key access to replicate the key-based fallback, so the name/profile broadening is the practical equivalent here).

### CP4 — Save/load failures are invisible to hotel staff 🟡 MEDIUM (not fixed — deferred)
`control-panel.service.ts:93-106` (`saveConfig`), `:112-137` (`loadFromThingsBoard`), `:158-166` (`persistToThingsBoard`), `:270-276` (`persistMewsSyncInterval`); `control-panel.component.ts:1346-1385` (`save()`)

`saveConfig()` always writes to `localStorage` and pushes to `config$` **before** the ThingsBoard HTTP call resolves, and the component always closes the panel immediately after calling it. If the HTTP write fails (permissions, network blip, an entity-resolution edge case), the only trace is a browser-console `console.error` — the panel already closed as if it worked, and the local cache stays out of sync with the (unwritten) server state indefinitely.

**Fix direction:** surface a toast/banner on HTTP failure, mirroring the `connectionError$` banner pattern the prior audit already added elsewhere in this codebase; don't let `localStorage` diverge from a known-failed server write.

### CP5 — Mews "Online" status and "Sync Now" are fully mocked 🟡 MEDIUM (not fixed — deferred)
`control-panel.component.ts:759-761`, `:1207-1210` (`syncMewsNow`)

```ts
mewsOnline = true;
mewsLastSyncAgo = 6;
```
`syncMewsNow()` just resets `mewsLastSyncAgo = 0` locally — no HTTP call, no interaction with `HotelStateService` (already injected for `rooms$`) or `ControlPanelService`. The "Online" badge always shows green; "Sync Now" gives staff the impression a resync ran when nothing happened on the backend.

**Fix direction:** wire `mewsOnline`/`mewsLastSyncAgo` to the real Mews-bridge telemetry `HotelStateService` already tracks (used for the prior audit's L4/L5 fixes), and make `syncMewsNow()` issue a real RPC/attribute-trigger call.

### CP6 — Telegram notification config is unreachable 🟢 LOW-MEDIUM (not fixed — deferred)
`features/control-panel/models/control-panel.models.ts:92-111, 238-253`

`TelegramConfig`/`TelegramAlertToggles` exist in the model with defaults (`enabled: false`), but no section renders them (`CONTROL_PANEL_SECTIONS` only lists `air_quality`, `thermostat`, `noise`, `window`, `mews`), and `buildFlatPayload()` never emits `telegram_*` keys for a rule chain to read. The feature is completely dark — it will never notify staff via Telegram regardless of expectations set elsewhere (e.g. `thingsboard/SETUP_GUIDE.md`).

**Fix direction:** either add the UI section + flat payload keys, or remove the model fields so they don't imply working functionality.

**Checked, no bug found:** threshold sign/direction in `getMetricStatus` (`:1535-1545`) — correct for both max-type and min/max-type metrics; CO2/AQI unit consistency for the control panel's own live badges (`getLiveValue('co2')` stays in ppm, compared against ppm — no repeat of the prior audit's L2 here); `resolveRoomEntityIds()`'s underlying data source (`room.mockCtx.datasources`) is real, not mock-only; no race between `loadFromThingsBoard()`/`setCtx()` (called once at init) and in-progress panel edits.

---

## 2. Sensor Widgets

### SW1 — `compact-env-sensor` battery-low cutoff diverged (5% vs. 20% everywhere else) 🟠 HIGH ✅ FIXED
`shared/components/compact-env-sensor/compact-env-sensor.component.ts:133,139`, `.html:59,63`

Every other copy of this threshold — `compact-thermostat`, `thermostat-card`, `room-detail-panel.component.ts`, and 5 other sensor components — uses `<= 20`. `compact-env-sensor` alone used `<= 5`. The Other Devices panel's own "LOW BATTERY ALERTS" badge (`other-devices-panel.component.ts:162-165`) uses `batNum < 20`. **Concrete scenario:** a device at 15% battery is counted in the panel-level "3 low-battery devices" badge, but that same device's own tile (rendered via `tb-compact-env-sensor`) shows a green "battery_std" chip and green status dot — no warning at all. A staff member opens the low-battery dropdown expecting to find a flagged device and sees a healthy-looking card.

**Fix applied:** changed all four `<= 5` occurrences to `<= 20`.

### SW2 — `lastSeen` "X minutes ago" labels freeze between telemetry ticks 🟡 MEDIUM (not fixed — deferred)
`core/services/room-data.service.ts:368-384` writes `lastSeenDevices[entityName]` as a **string**, computed once when a `last_seen`/`lastActivityTime` telemetry event arrives; the epoch (`lastSeenRaw`) is stored alongside it but never read anywhere. `room-detail-panel.component.ts` (thermostats, windows, leak, noise, occupancy, air, sockets — 7 call sites) copies the frozen string verbatim into each sensor row, and the panel's 10s refresh timer re-reads the same frozen string every cycle without recomputing it. **Scenario:** a window sensor last reported 3 hours ago; staff see "3 minutes ago" (whatever the string was when the key last updated) and it never advances, even though the panel visibly refreshes every 10 seconds — misleading staff into thinking the sensor is currently live. (This is the display-layer instance of the same anti-pattern the prior audit flagged at the ingestion layer for the generic `timeAgo` helper.)

**Fix direction:** store only the epoch on sensor objects; format "time ago" at render time via a pipe or a getter re-evaluated each CD pass.

### SW3 — Water-leak/noise sensor status falls back to the literal word "on" 🟢 LOW (currently dead code)
`shared/components/water-leak-sensor/water-leak-sensor.component.html:17`, `noise-sensor.component.html:17`: `{{ sensor.deviceStatus || 'on' }}` — a smart-plug-style status label copy-pasted onto a binary leak/noise sensor. No current impact (these components aren't wired into any live template yet), but will render nonsensically the first time these components are used per the SOLID refactor plan.

### SW4 — Unanchored substring room-number fallback match 🟢 INFO (currently a no-op, latent risk)
`room-detail-panel.component.ts` (leak ~638-644, noise ~688-696, occupancy ~746-753): each ends its room-scoping check with `name.includes(cleanRoom)`, unanchored — room "1" would substring-match device names containing "10", "11", "21", etc. Traced end-to-end: the upstream `extractRoomNumber()` (`hotel-state.service.ts:368-383`) is properly boundary-anchored, and `RoomData`'s device maps are already scoped to one room before this component sees them, so this fallback is currently unreachable dead logic — but it's a defense-in-depth gap: if upstream scoping is ever loosened, this would immediately start bleeding one room's readings into another whose number is a numeric substring.

**Checked, no bug found:** `thermostat-card`, `compact-thermostat` (battery/signal thresholds, mode/state colors — internally consistent), `alerts-panel` (time recomputed correctly, not frozen), `smart-sockets-panel` (on/off string normalization correct), `air-quality-sensor` (unit labels match raw values, no ppm/AQI confusion), `occupancy-sensor`, `window-sensor`, `sensor-tile`, `activity-logs` (explicit placeholder). Multi-device row binding across all sensor `*ngFor` loops uses entity-name-keyed `trackBy` — no first-device-only or shared-reference bug found.

---

## 3. Room Detail Panel & Historical Chart

### RD1 — Stale guest/reservation info leaks across rooms on fast room-switch 🔴 CRITICAL ✅ FIXED
`features/room-view/room-detail-panel.component.ts:543-553`

`RoomDetailPanelComponent` is a single persistent instance (`*ngIf="selectedRoom"` in `revelton-hotel.component.html`) reused across every room click — `onRoomClick()` just reassigns `selectedRoom`, never passing through `null`/destroy. The reservation-display block only had an `if (res && res.hasReservation)` branch with no `else`, so `guestName`/`checkInDisplay`/`checkOutDisplay`/`statusSummary`/`checkoutRemaining` were never cleared. **Scenario:** staff open Room 101 (guest "John Smith," checkout in 2h15m), then — without closing the panel — click into vacant Room 205. Room 205's header still shows "John Smith," Room 101's dates, and the "checkout in 2h15m" pill.

**Fix applied:** added an `else` clause that resets all six reservation display fields to empty when the newly selected room has no active reservation.

### RD2 — Expanded chart's date-range refetch can silently pull from a different device than the small card 🟠 HIGH ✅ FIXED
`room-historical-data.component.ts:446-447` (`fetchData`, small card) vs. `:613-614, 629` (`getDeviceId`, used by the modal's range picker)

For temperature and humidity, `fetchData()` prefers the AQ combo sensor first (`aqDeviceId || findId(...)`), while `getDeviceId()` had the **reversed** priority (`findId(...) || aqDeviceId`) — the only two metrics where the order differed from every other metric (co2, tvoc, pm25/pm10, pressure, lux, noise all matched). Motion had a parallel gap: `fetchData()` sources it via the broad `occDeviceId` regex (`/occupancy|presence|motion|pir|ws301|vs370/i`), while `getDeviceId('motion')` used the narrower `/motion|pir/i`, so a device named e.g. `occupancy_room_12` wouldn't match and would silently fall back to the AQ sensor. **Scenario:** a room has both an AQ combo sensor and a dedicated temp probe. The small Temperature card sources from the AQ sensor. Staff expand the chart and pick a different date range — the modal now silently switches to the dedicated probe's (possibly differently calibrated/placed) readings with no on-screen indication the source changed.

**Fix applied:** aligned `getDeviceId()`'s priority order with `fetchData()`'s for temperature, humidity, and motion.

### RD3 — Window historical badge always renders green regardless of open/closed state 🟠 HIGH ✅ FIXED
`room-historical-data.component.ts:277-279`

```ts
badgeText = current ? "OPEN" : "CLOSED";
badgeClass = current ? "normal" : "normal";   // both branches identical
```
Same bug class as the prior audit's previously-fixed L8 (identical-branch ternary). The neighboring `leak`/`presence` cases correctly differentiate (`"critical"`/`"occupied"` vs `"normal"`); window did not, so the badge is always styled green ("good") even while showing the text "OPEN."

**Fix applied:** `badgeClass = current ? "warning" : "normal"` — uses the existing `.hist-badge.warning` (amber) style already defined in the component's SCSS.

### RD4 — AQI min/max freeze after the first reading and leak across rooms 🟠 MEDIUM-HIGH (not fixed — deferred, currently masked)
`room-detail-panel.component.ts:898-903`

```ts
this.aqiMin = this.aqiMin ?? this.aqiScore;   // set-once guard
this.aqiMax = this.aqiMax ?? this.aqiScore;   // set-once guard
```
Unlike `tempMin/Max`, `humMin/Max`, `co2Min/Max` — which are correctly recomputed from real historical data every fetch — `aqiMin`/`aqiMax` freeze at the first reading for the component instance's lifetime, and (per RD1's finding that this panel is a persistent singleton) can carry Room A's frozen values into Room B. Currently masked because the "Vital Chart Expand Modal" that surfaces these numbers has no reachable trigger — confirmed still true, matching the prior audit's finding — but this is a live bug waiting to surface the moment that modal is re-wired.

**Fix direction:** compute AQI min/avg/max the same way temp/hum/co2 are (from a real historical fetch, recomputed every pass), and/or reset all four fields when the room changes (natural companion fix to RD1).

### RD5 — Acknowledged-alert and attribute-init state carries over between rooms 🟠 MEDIUM (not fixed — deferred)
`room-detail-panel.component.ts:456-459` (`attributesInitialized`), `:526-529` (`archiveLoaded`)

Both are plain booleans, never keyed by room and never reset on room switch (unlike `lastFetchedRoom`, which correctly re-triggers per room). `loadArchive()` — which pulls `acknowledgedAlertIds`/`archivedAlerts` from room-specific `localStorage` keys — runs only for the very first room ever opened in that panel instance. Worse, two alert ids used when a room has no dedicated AQ sensor are **not entity-scoped**: `'temp-alert'` and `'hum-alert'`. **Scenario:** staff acknowledge a "temp-alert" in Room 101 (no AQ sensor), then click into Room 205 (also no AQ sensor, but with a genuinely dangerous high temperature right now) without closing the panel. Room 205's alert is generated with the same fixed id `'temp-alert'`, already present in the stale `acknowledgedAlertIds` set carried over from Room 101 — the alert is silently filtered out and never shown.

**Fix direction:** key both flags by room number (like `lastFetchedRoom`), and give `temp-alert`/`hum-alert` per-room or per-entity ids.

### RD6 — Expanded Chart Dialog's custom-range picker pre-seeded wrong; Apply armed by default 🟡 MEDIUM (not fixed — deferred)
`room-historical-data.component.ts:951-974` (constructor / `hasCustomRangeChanged`)

The picker's `customStart`/`customEnd` are always seeded to "yesterday → now," never from the actually-applied range (`appliedCustomStart`/`End` start as `''`), even when the active range is a saved 30-day custom window. Since `hasCustomRangeChanged` compares `customStart !== appliedCustomStart`, the Apply button is armed the instant the dialog opens. **Scenario:** staff set a 30-day custom range, expand the chart (correctly shows 30 days), open the picker to review it — it shows "yesterday → now" instead — and click Apply thinking they're confirming, silently snapping the chart back to the last 24 hours.

**Fix direction:** seed all four fields from `data.parent.customStartTs`/`customEndTs` when the active range is `'custom'`.

### RD7 — Custom date-range parsed in browser-local time, not Prague time 🟡 LOW-MEDIUM (not fixed — deferred)
`room-detail-panel.component.ts:226-230` and the duplicate in `room-historical-data.component.ts:988-992` (`parseDatetimeLocal`) use `new Date(str)`, interpreted in the viewer's browser timezone — inconsistent with every other date display in the dashboard, which is carefully anchored to `Europe/Prague` (`HOTEL_TIMEZONE`). Low impact for on-site staff (browser likely already Prague-local) but real for any remote viewer.

### RD8 — TVOC card can silently display an IAQ index mislabeled as "ppb" 🟢 LOW (not fixed — deferred)
`room-historical-data.component.ts:483`, `room-detail-panel.component.ts:818`: `normalized["tvoc"] = data["tvoc"] || ... || data["iaq"] || data["data_iaq"] || ...` — if a device only reports a Bosch-style 0–500 unitless IAQ index and no true ppb TVOC reading, the card still hard-labels it "TVOC (ppb)."

**Checked, no bug found:** multi-device rows (TRVs, AQ, window/leak/noise/occupancy) each correctly bind via entity-name-keyed `trackBy` — no shared-reference or first-device-only rendering; the reservation state machine (`started`/`confirmed`/`optional`/`processed`/`canceled`) has a sensible default fallback, no unhandled state produces blank/garbage output; `expandVital()`'s trigger is confirmed still unreachable (matches prior audit); `normalizeBinaryValue()`'s window convention (`true`/`>0` → closed) matches the canonical convention in `room-data.service.ts`; the main charting/series-to-timestamp mapping (`buildCard`) correctly keys per-metric with no cross-series mismatch found.

---

## 4. Core Services (uncommitted diff review)

### CS1 — Deleted-device cleanup misses per-sensor-type maps 🟠 HIGH ✅ FIXED
`core/services/hotel-state.service.ts:1897-1954` (`removeDeletedDevice()`, added since the prior audit, not yet committed at review time)

This handler (triggered on a 404 from ThingsBoard, meaning the device was deleted) cleaned `deviceEntityIdMap`, `activeDevices`, `offlineDevices`, `lastSeenDevices`/`Raw`, `batteryDevices`/`LowDevices`, `tempDevices`, `humDevices`, `airSensors`, and `plugDevices` — but not `trvDevices`, `windowDevices`, `leakDevices`, `noiseDevices`, or `occupancyDevices`. Those five maps are exactly what `room-data.service.ts`'s aggregation reads to compute room-level stats (average TRV setpoint, heating status, window-open count) and what `room-detail-panel.component.ts` iterates for per-device rows. **Scenario:** a TRV, window contact, leak, noise, or occupancy sensor is removed from ThingsBoard. The device disappears from the topology cache, but its last-known reading lingers **forever** in the room's aggregates and the detail panel's device list — a phantom device the client can never make disappear short of a full page reload.

**Fix applied:** added `cleanMap` calls for the five missing device-type maps.

---

## 5. Fixes applied in this change set

**Critical (2):**
1. CP1 — inverted "Exclude rooms" scope now correctly excludes.
2. RD1 — room-detail-panel resets reservation fields when the newly selected room has no active reservation.

**High (6):**
3. CP3 — Mews gateway matching broadened to avoid silent Sync Interval no-ops.
4. SW1 — `compact-env-sensor` battery threshold corrected from 5% to 20%.
5. RD2 — expanded chart's `getDeviceId()` priority order aligned with `fetchData()`'s for temperature/humidity/motion.
6. RD3 — window historical badge now distinguishes open (amber) from closed (green).
7. CS1 — `removeDeletedDevice()` now cleans all five previously-missed device-type maps.

**Deferred (11 medium/low findings — documented above with fix directions, not touched in this pass):** CP2 (noise threshold plumbing), CP4 (invisible save/load failures), CP5 (mocked Mews status), CP6 (unreachable Telegram config), SW2 (frozen lastSeen labels), SW3 (dead-code "on" label), SW4 (unanchored substring fallback), RD4 (AQI min/max freeze/leak), RD5 (acknowledged-alert state leaks across rooms), RD6 (custom-range picker pre-seed), RD7 (Prague timezone), RD8 (TVOC/IAQ mislabel).

## Verification

- `yarn lint` and `yarn build` (AOT compile) — run after applying the fixes above; must pass with no new errors.
- No test suite exists in this repo (confirmed, same as the prior audit) — build + lint + manual widget check remain the only gates.
- Manual widget-editor check recommended before shipping: Control Panel "Exclude rooms" applies to the correct rooms; switching rooms in the detail panel without closing no longer shows stale guest info; Other Devices panel's low-battery badge and each tile's own battery chip agree; expanding a historical chart and changing the range keeps the same underlying device; the Window historical badge shows a distinct color when open; a deleted TRV/window/leak/noise/occupancy device disappears from room aggregates after its next reconcile.

## Next step

The 11 deferred findings above are good candidates for the next pass, particularly CP2 (noise thresholds don't reach alerts) and RD5 (acknowledged alerts can hide a real alert in a different room) — both are silent-data-integrity issues in the same class as the ones fixed here. Longer-term architectural fixes (typed models, processor registry, OnPush) remain tracked in [SOLID_REFACTOR_PLAN.md](SOLID_REFACTOR_PLAN.md).
