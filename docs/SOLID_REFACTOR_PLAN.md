# Hotel Dashboard — SOLID Component-Based Refactor Plan

**Status:** Plan only — not yet implemented. Companion to [AUDIT_REPORT.md](AUDIT_REPORT.md).
**Goal:** Rebuild `revelton-tb-extension-dashboard/` as a typed, SOLID, OnPush component architecture **without ever breaking the shipped widget** — every phase is independently shippable and behavior-preserving unless stated.

## Guiding decision: copy the pattern that already exists in this repo

The **historical dashboard** (`revelton-tb-extension-historical-dashboard/`) already implements the target architecture and the team already knows it:

```
core/interfaces/   →  contracts (ISensorProcessor)
core/models/       →  typed models
data/services/     →  ThingsBoard REST access
domain/processors/ →  one processor per sensor type (Strategy pattern)
domain/services/   →  state orchestration
features/          →  smart panel components
shared/components/ →  dumb presentation components
```

The hotel dashboard refactor ports this exact layering. No new invented architecture.

---

## Where the hotel dashboard violates SOLID today

| Principle | Violation |
|-----------|-----------|
| **S**ingle Responsibility | `HotelStateService` (1,790 lines) does ctx parsing, room grouping, Mews detection, device discovery, HTTP retry, stats aggregation, device-type classification and polling. `RoomDataService` (1,098 lines) parses ~70 telemetry keys in one 460-line `switch`, computes aggregates, statuses, AQI **and** UI display strings (pill/icon CSS classes). `revelton-hotel.component.ts` (770 lines) owns branding, time, weather, theming, language, dropdowns, date-range parsing and data orchestration. |
| **O**pen/Closed | Adding a sensor type = editing the giant `switch` in `RoomDataService` + `getDeviceType()` name heuristics in `HotelStateService` + inline markup in `room-detail-panel.component.html`. Three files must change; nothing is pluggable. |
| **L**iskov Substitution | No abstractions exist to substitute — device maps are `any`, `mockCtx` is a structurally-faked `WidgetContext` that only works because consumers don't touch the parts it fakes. |
| **I**nterface Segregation | `RoomData` is a god-object (~25 fields, 18 of them `any` maps). Every component receives all of it even when rendering one temperature number. |
| **D**ependency Inversion | Components depend on concrete services and thread the raw `ctx` object everywhere; `RoomDataService` reaches *upward* into `features/control-panel/services/control-panel.service.ts` (core → feature dependency, inverted layering). |

Component-level: 8 shared sensor components exist but are **unused** because `room-detail-panel.component.html` re-implements their markup inline — which is also the root cause of the ×11 helper duplication (`getLinkQualityText` etc.).

---

## Target architecture

```
revelton-tb-extension-dashboard/
├── core/
│   ├── interfaces/
│   │   ├── sensor-processor.interface.ts     # ITelemetryProcessor (mirrors ISensorProcessor)
│   │   ├── telemetry-api.interface.ts        # ITelemetryApi (wraps ctx.http)
│   │   └── tokens.ts                         # TELEMETRY_API, CLOCK, TRANSLATION injection tokens
│   └── models/                               # typed models — NO `any` maps
│       ├── device.models.ts                  # DeviceHealth {battery, batteryLow, linkQuality, lastSeen, offline}
│       ├── room.models.ts                    # Room = {id, title, climate, reservation, devices, status}
│       ├── climate.models.ts                 # ClimateReadings, AirQualityReading, NoiseReading
│       └── reservation.models.ts             # ReservationInfo + ReservationDisplay
├── data/
│   └── services/
│       ├── tb-telemetry-api.service.ts       # ALL REST calls (relations, keys, values, attributes) + retry/timeout
│       └── tb-discovery.service.ts           # relation-based device discovery
├── domain/
│   ├── processors/                           # one class per sensor type, registered via multi-provider
│   │   ├── trv.processor.ts
│   │   ├── window.processor.ts
│   │   ├── air-quality.processor.ts
│   │   ├── noise.processor.ts
│   │   ├── water-leak.processor.ts
│   │   ├── occupancy.processor.ts
│   │   ├── plug.processor.ts
│   │   └── reservation.processor.ts
│   └── services/
│       ├── hotel-facade.service.ts           # public API: rooms$, hotelStats$, otherDevices$, errors$
│       ├── room-registry.service.ts          # room map + reset() on widget destroy
│       ├── telemetry-ingestion.service.ts    # ctx.data → processor dispatch
│       ├── hotel-stats.service.ts            # KPI aggregation
│       ├── mews-bridge.service.ts            # bridge detection + status
│       └── device-classifier.service.ts      # name/profile/model → DeviceType (ordered strategy list)
├── features/                                 # smart components (subscribe to facade, no business logic)
└── shared/
    ├── components/                           # dumb, OnPush, typed-@Input presentation components
    │   └── device-health-badge/              # NEW: battery + signal + link quality + last-seen (kills ×11 dup)
    ├── pipes/                                # timeAgo pipe (render-time), formatNum pipe
    └── utils/                                # extractRoomNumber (single source), date-range utils, formatters
```

### Data flow after refactor

```
TB WidgetContext (ctx)
  └─ TelemetryIngestionService.ingest(ctx)
       ├─ groups items by room (shared/utils/extractRoomNumber — ONE implementation)
       ├─ for each item: ProcessorRegistry.find(dataKey, device) → processor.apply(item, roomDraft)
       └─ RoomRegistry.commit(roomDrafts)      # real immutable per-slice updates (fixes audit L9)
            ├─ HotelStatsService.recompute()
            └─ HotelFacade emits: rooms$ (one emission per tick)
Components: vm$ = combineLatest([facade.rooms$, …]) │ async pipe │ OnPush — zero manual detectChanges()
```

---

## Phases (each shippable, verified with `yarn lint && yarn build` + manual widget check)

### Phase 1 — Shared utils (pure extraction, zero behavior change)
- Create `shared/utils/`: move `extractRoomNumber` (use the full `hotel-state.service.ts:284` version as the single source; `room-card` switches to it), `timeAgo`, `formatNum`, date-range parse/format, battery/signal/link-quality helper functions.
- Create `shared/pipes/time-ago.pipe.ts` — computed at render, fixing the frozen-string staleness (audit §3).
- All duplicated call sites switch to the utils. Delete the duplicated private copies.
- **Exit criteria:** grep shows one definition each for `extractRoomNumber`, `getLinkQualityText`, `getBatteryIcon`, `formatDatetimeLocal`.

### Phase 2 — Typed models (compile-time only)
- Introduce the `core/models/` interfaces above; replace the 18 `any` device maps in `RoomData` with typed `Record<string, X>` incrementally (one map per PR is fine).
- Split `RoomData` into composed slices (`climate`, `reservation`, `deviceHealth`, `windows`, `trvs`, …) while keeping a compatibility type `RoomData` = intersection, so existing templates keep working.
- Fix the inverted dependency: `RoomDataService` must stop importing `ControlPanelService` from `features/` — move `ControlPanelConfig` + a `ThresholdConfigService` into `core/` and have the control panel feed it.

### Phase 3 — Processor registry (behavior-preserving Strategy migration)
- Define `ITelemetryProcessor { supports(dataKey, deviceInfo): boolean; apply(item, draft): void }`.
- Port the 460-line `switch` in `RoomDataService.updateFromTelemetry` one sensor family at a time into `domain/processors/*` (TRV → Window → Air → Noise → Leak → Occupancy → Plug → Reservation). Register via an Angular multi-provider token so **adding a sensor type = adding one class** (Open/Closed).
- While porting each family, make its state update genuinely immutable (new map instances) — this is where audit **L9** gets properly fixed, slice by slice.
- Write the **first spec files** here: processors are pure and trivially testable (`describe(TrvProcessor)…`). This is the project's entry point into testing (currently zero tests).

### Phase 4 — Presentation components + OnPush (leaf-first)
- Rework `room-detail-panel.component.html` to compose the existing shared components (`tb-air-quality-sensor`, `tb-window-sensor`, `tb-water-leak-sensor`, `tb-noise-sensor`, `tb-occupancy-sensor`, `tb-sensor-tile`, `tb-activity-logs`) instead of its ~800 lines of inline re-implementation. The currently-unused components become the real presentation layer (this is why the audit did **not** delete them).
- Add `device-health-badge` component (battery/signal/link/last-seen) used by every sensor card.
- Flip components to `ChangeDetectionStrategy.OnPush` **leaf-first** (sensor components → panels → dashboard), replacing function-call bindings with typed `@Input` view models and pipes. Delete the corresponding manual `detectChanges()` calls as each subtree flips.
- Merge the `compact-thermostat`/`compact-env-sensor` twins into one configurable component.

### Phase 5 — Service decomposition behind a facade
- Introduce `HotelFacade` exposing the exact current public API (`rooms$`, `hotelStats$`, `otherDevices$`, `openHistoricalData()`, …) so **no template churn** occurs, then move `HotelStateService` internals out into `TelemetryIngestionService`, `TbDiscoveryService` (+ `TbTelemetryApiService` with centralized retry/timeout using modern RxJS `retry({delay})`/`timeout()`), `MewsBridgeService`, `HotelStatsService`, `DeviceClassifierService`, `RoomRegistry`.
- `RoomRegistry.reset()` wired to widget `ngOnDestroy` — fixes the singleton-never-resets problem (stale rooms, immortal 30s timer).
- Replace the 5-calls-per-device 30s polling with either (a) TB WebSocket telemetry subscriptions via `ctx.subscriptionApi`, or (b) batched REST with concurrency limit — decision to be made against the TB 4.3.1 API surface at implementation time.

### Phase 6 — Loading & error UX + hardening
- Skeleton grid state for the dashboard (`loading` until first `rooms$` emission — distinguishable from "0 rooms").
- Wire `connectionError$` (currently dead) to a dismissible error banner with retry.
- Loading indicators for room-detail-panel fetches.
- Weather: `AbortController` timeout + re-map cached code on language change (partially done in the quick-win round).
- Migrate remaining deprecated `subscribe(next, err)` signatures.

## Effort & sequencing notes

- Phases 1–2 are mechanical and low-risk; do them first and immediately — they also shrink Phases 3–5.
- Phase 3 is the highest-value correctness investment (testable business logic).
- Phase 4 delivers the visible performance win (OnPush + no per-cycle function bindings).
- Phases can ship as separate PRs; nothing requires a big-bang rewrite.
- **Verification for every phase:** `yarn lint`, `yarn build`, then load the widget bundle in the ThingsBoard widget editor (`yarn start`, dev URL `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`) and check: room grid renders with data, KPI bar correct, room detail opens, control panel saves, Other Devices panel populated, RU/EN switch, theme switch, no console errors. From Phase 3 onward, processor specs run in CI (requires adding a test runner — recommend Jest via `@angular-builders/jest` or Karma per UPDATING.md constraints; decide when Phase 3 starts).
