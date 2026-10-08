# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Revelton IoT Dashboard — an Angular library that builds into a ThingsBoard extension widget bundle. Used for hotel room monitoring and climate control (temperature, humidity, air quality, noise, occupancy, window/door sensors, water leaks). Integrates with Mews PMS for reservation data.

## Commands

```bash
# Install dependencies (Yarn Classic is required — npm will not work)
yarn install

# Release build of one dashboard (ng-packagr → install.js copies to target/generated-resources/<bundle>-<version>.js)
# Version comes from src/<project>/package.json; an existing file with different content is not overwritten (bump the version, or add --force)
yarn build:hotel
yarn build:utility

# Build both
yarn build:all

# Dev build (separate bundle name <bundle>-dev.js in dist/<project>-dev/; never touches target/)
yarn build:hotel:dev    # also build:utility:dev

# Serve the built bundles on port 5000 (serve.js + static.serve.conf.js; build first)
yarn serve

# Lint TypeScript and HTML templates of both projects
yarn lint
```

## Build Chain

Each dashboard is a separate Angular library project in `angular.json` and ships as its own bundle:

| Project | Source | Bundle |
|---------|--------|--------|
| `hotel-dashboard` | `src/hotel-dashboard/` | `hotel-dashboard-widgets.js` |
| `utility-dashboard` | `src/utility-dashboard/` | `utility-dashboard-widgets.js` |

```
ng-packagr → dist/<project>/system/<bundle>.js
                      │
             install.js <hotel|utility|all>
                                                                             copies to target/generated-resources/<bundle>-<version>.js
```

The bundle file name comes from the `name` field in `src/<project>/package.json`. `yarn serve` serves the release build at `http://localhost:5000/static/widgets/<bundle>.js` and the dev build at `.../<bundle>-dev.js`; the dev widget's Resources tab (Is extension) points at the `-dev.js` URL. The dev build comes from `src/<project>/ng-package.dev.json` via the `development` configuration in `angular.json` (only the output folder and `flatModuleFile` differ). Selectors are identical in dev and release, so never list both bundles as resources of one widget.

The projects don't share code: each has its own copy of the theme/translation services and models, so a fix to a copied file has to be made in every project that has it.

**Important build details**:
- `patches/`: Two patch-package patches (`@angular/compiler-cli`, `ng-packagr`). Run `yarn install` (triggers `postinstall-prepare`) to apply them. If you change dependencies without reinstalling, the patches won't apply and builds may fail.
  - **`@angular/compiler-cli` patch**: Nulls out `compileClassDebugInfo()` to reduce bundle size.
  - **`ng-packagr` patch** (critical): Converts the build output from ESM/FESM to **SystemJS format**. ThingsBoard requires SystemJS modules. The patch rewrites rollup config (`format: 'system'`), reads ThingsBoard's `modules-map.ts` to determine externals (so TB's own modules aren't bundled in), and redirects output to `system/` instead of `fesm2022/`.
- `install.js`: Post-build step that copies a bundle from `dist/<project>/system/` to `target/generated-resources/<bundle>-<version>.js` (the deployment-ready output directory; `<version>` is read from `src/<project>/package.json` and the `sourceMappingURL` comment is rewritten to match). Takes `hotel`, `utility` or `all`; with no argument it copies both. Refuses to overwrite an existing versioned file whose content differs unless `--force` is passed.
- No global CSS is injected into the ThingsBoard page and there is no Tailwind/PostCSS step: component styles stay in the components. (The former `lib-styles.ts` `<style>` in `<head>` held five utilities no template used; it and `tailwind.config.js`, `postcss.config.js`, `load-tb-classes.js` and the Tailwind/PostCSS dependencies were removed.)

## Architecture

### Module Structure

Each project has the same two-module layout:

```
<Name>DashboardWidgetsModule  ← root, exported to ThingsBoard (loads SCSS styles + i18n translations)
  └── <Name>DashboardModule   ← declares ALL components of that project
```

`<Name>` is `Hotel` or `Utility`, in `src/<project>/<project>-widgets.module.ts` and `src/<project>/<project>.module.ts`.

All components are **NgModule-based** (not standalone) for ThingsBoard 4.3.1 compatibility. Components must be declared in their project's `<project>.module.ts` **and** re-exported from `src/<project>/public-api.ts`.

### Two Main Widgets

**1. Hotel Dashboard** (`src/hotel-dashboard/`) — Real-time telemetry monitoring

| Layer | Path | Purpose |
|-------|------|---------|
| State/services | `core/services/` | `HotelStateService` (central brain — BehaviorSubjects for rooms$, hotelStats$, otherDevices$), `RoomDataService` (telemetry parsing, threshold calculations, AQI), `ThemeService`, `TranslationService` |
| Features | `features/hotel-dashboard/` | Main overview grid (`<tb-revelton-dashboard>`) |
| Features | `features/room-view/` | Room cards and detail panels (`<tb-room-card>`) |
| Features | `features/other-devices-panel/` | Non-room devices (lights, plugs, sensors in public areas) |
| Features | `features/control-panel/` | Centralized device control (thermostat automation, window alerts, Mews sync, Telegram notifications, air quality/noise thresholds) |
| Shared | `shared/components/` | `RoomCardViewComponent` (the card used by both the hotel grid and `<tb-room-card>`), thermostat cards (full and compact), compact env sensor, smart sockets panel, alerts panel, history chart. The room dialog's sensor cards are inline in `room-detail-panel.component.html`. |

**2. Utility Dashboard** (`src/utility-dashboard/`) — EV charger monitoring (also Clean Architecture)

| Layer | Path | Purpose |
|-------|------|---------|
| Interfaces | `core/interfaces/` | `IUtilityProcessor` — contract for utility device data processors |
| Models | `core/models/` | `EVChargerModels` — charger status, power, energy, session duration |
| Domain services | `domain/services/` | `UtilityStateService` — BehaviorSubject-based state for charger data |
| Domain processors | `domain/processors/` | `EVChargerProcessor` — implements `IUtilityProcessor` for EV charger telemetry |
| Features | `features/ev-charger-panel/` | Charger grid panel |
| Shared | `shared/components/` | `ChargerStatusCardComponent`, `EVStationHistoryModalComponent`, `UtilityHeaderComponent` |

### Data Flow

```
ThingsBoard WidgetContext (ctx)
  │  ctx.datasources[]  — entity metadata (aliasName, entityName, entityType, entityId)
  │  ctx.data[]         — telemetry items [{dataKey, data: [[ts, value]], datasource}]
  │  ctx.http           — Angular HttpClient for REST API calls
  │  ctx.settings       — widget settings from ThingsBoard dashboard config
  ▼
HotelStateService.processDataUpdate(ctx)
  │  Groups data by extracted room number (regex: _(\d+)_\d+$, _(\d+)$, Room\s*(\d+))
  │  Creates InlineRoom per room with a mock WidgetContext
  │  Runs RoomDataService.updateFromTelemetry() on each room
  │  Aggregates hotel-level stats (occupancy, battery alerts, check-ins/outs)
  │  Discovers child devices via TB REST API relations
  ▼
RoomDataService.updateFromTelemetry(ctx, currentData)
  │  Matches dataKey names (temp, humidity, contact, current_heating_setpoint, etc.)
  │  Routes to device maps (trvDevices, windowDevices, airSensors, etc.)
  │  Computes aggregates (avg temp, TRV status, window open count)
  │  Calculates status levels (normal/warning/danger) per threshold
  │  Computes AQI via static calculateAirQuality()
  │  Processes Mews reservation data (checkIn, checkOut, guestName, reservationState)
  ▼
Components subscribe to BehaviorSubjects:
  HotelStateService.rooms$      → room cards grid
  HotelStateService.hotelStats$ → KPI summary bar
  HotelStateService.otherDevices$ → other devices panel
```

### Key Patterns

- **Room number extraction**: Device/asset entity names encode room numbers (e.g., `TRV_Room_6_1` → room 6). The `extractRoomNumber()` method in both `HotelStateService` and `ReveltonDashboardComponent` handles this.
- **Backend discovery**: `HotelStateService.discoverDevices()` queries ThingsBoard REST API for `Contains` relations from room assets to child devices. Entities from the relation responses are queued and resolved in batches (`entitiesQuery/find/keys` for the timeseries keys, `entitiesQuery/find` for device profile, latest timeseries and attributes; per-entity REST calls only as fallback). The 30 s refresh is one batched `find` per entity type. A relation re-check runs every 5 minutes and prunes devices that lost their `Contains` relation.
- **Topology cache**: the discovered room→device→keys map is kept in `sessionStorage` (`revelton_topology_<datasource hash>`, version-stamped). It ages from the last completed discovery (`verifiedAt`), not from the last write; a reload within 5 minutes skips the reconcile.
- **`find/keys` limit**: `entitiesQuery/find/keys` only looks at the first 100 entities of a list, so key lookups go through `postKeysUnion` in slices of 100 and merge (a single call silently drops keys that exist only on later devices).
- **Noise sensor weighting**: a WS302 reports its instantaneous level and max as `data_LAI/LAImax`, `data_LAF/LAFmax` or `data_LAS/LASmax` depending on its configuration; they fill the same `lai`/`laimax` slots and `noiseDevices[name].weighting` holds the letter used for the labels. Barometric pressure outside 300–1100 hPa (a stuck sensor) is treated as no data, live and in history.
- **Per-widget state**: `HotelStateService`, `RoomDataService`, `ControlPanelService` are provided on the root components (`ReveltonDashboardComponent`, `RoomCardComponent`) and torn down with them; dialogs get `viewContainerRef` so they resolve the same instances. If the widget's datasources change in place, the service resets itself (epoch guard drops late responses).
- **Hotel identity**: the hotel asset is the ASSET that `Contains` the room assets (resolved once via the first room's relation; an alias named `Hotel` is only a fallback). Header name/address come from widget settings → hotel asset SERVER attributes `hotelName`/`hotelLocation` → asset name. The control-panel config JSON is read from / written to the hotel asset (older saves on the first room asset are still read as a fallback); flat thresholds still go to the room assets that the scope selects (an empty selection writes nothing). The Mews bridge id is the device `HotelStateService` classified as the bridge.
- **Browser storage is scoped per hotel** (`datasourceScopeKey` in `core/utils/scope-key.ts`): control-panel config and the alert archive/acknowledgements include it; theme keys are per bundle.
- **Timezone and weather coordinates** are still the constants in `core/models/dashboard.config.ts` (Europe/Prague, Karlovy Vary) — correct for the current hotels, not configurable per hotel.
- **Threshold system**: `RoomDataService` has configurable thresholds for temperature, humidity, air quality, and noise. Each metric maps to `normal / warning / danger` status driving visual indicators.
- **Alias routing**: ThingsBoard datasource alias names determine routing: aliases containing "room" → room cards, aliases containing "other"/"public"/"office" → other devices panel.

### Mews PMS Integration

The dashboard syncs reservation data from Mews PMS via a "Mews Bridge" device entity in ThingsBoard. The bridge is discovered automatically by `HotelStateService` (filtered by entity profile name `"Mews Bridge"`) and reports: online/offline status, number of rooms synced, alert status, error messages, and last activity timestamp.

Reservation data (checkIn, checkOut, guestName, reservationState) arrives on per-room asset entities. `RoomDataService` processes it into display fields:
- `checkDisplay` — `'In'`, `'Wait'`, `'Out'`, `'--'` based on current time vs check-in/check-out
- `bookDisplay` / `bookIconClass` / `bookPillClass` — visual status for guest presence
- `checkoutRemaining` — human-readable countdown (e.g., `'2h 30m'`)
- `statusSummary` — contextual label (e.g., `'Guest in room · checkout in 2h'`, `'Arriving today 15:00'`)

Reservation states handled: `confirmed`, `started` (checked in), `optional`, `processed` (checked out), `canceled`.

The **Control Panel** has a dedicated Mews Sync section allowing staff to configure the sync interval (5/15/30/60 minutes) via `ControlPanelService`.

### Translation / i18n

Translations are **not** JSON files on disk — they're inline `TranslationSet` objects in [TranslationService](src/hotel-dashboard/core/services/translation.service.ts). Two languages: English (`EN`) and Russian (`RU`). Active language persisted to `localStorage` key `revelton_lang` (shared on purpose: it is a user preference). Nothing is registered in ThingsBoard's global ngx-translate store.

**To add a new string**: Add the key to the `TranslationSet` interface, then add values to both `EN` and `RU` objects in the `translations` map. Components access translations via `translationService.t.keyName` (getter, reactive via `activeLangCode$`).

### Theme System

`ThemeService` paints CSS custom properties and `data-theme`/`data-mode` attributes onto the elements that called `attach(host)` — the widget root component and, for dialogs, the `.cdk-overlay-pane` they sit in (the dialog components attach themselves in `ngOnInit`). It never touches `<html>` or `<body>`, so one dashboard's theme cannot reach ThingsBoard or another widget. Multiple named themes (e.g., `'Revelton'`, `'Midnight'`) each with `light` and `dark` palettes. Persisted per bundle to `localStorage` keys `revelton_hotel_theme`/`revelton_hotel_mode` (`revelton_utility_*` for utility; the old shared `revelton_theme`/`revelton_mode` are read as a fallback).
**CSS custom properties set by ThemeService** (use these in SCSS — don't hardcode colors):

| Token | Legacy fallback | Purpose |
|-------|----------------|---------|
| `--bg` | — | Page background |
| `--panel`, `--panel2` | — | Panel/surface backgrounds |
| `--card`, `--inner` | — | Card and inner container backgrounds |
| `--border` | — | Borders and separators |
| `--accent`, `--accent-soft`, `--accent-muted` | — | Brand accent colors |
| `--tx`, `--t2`, `--t3` | `--text`, `--text-secondary`, `--text-muted` | Text hierarchy |
| `--ok`, `--ok-soft` | `--success`, `--success-bg` | Success/safe status |
| `--warn`, `--warn-soft` | `--warning`, `--warning-bg` | Warning status |
| `--alert`, `--alert-soft` | `--danger`, `--danger-bg` | Danger/alert status |
| `--ring-track` | `--border` | Ring/chart track color |

Theme definitions live in `core/models/theme.constants.ts`. Styles that depend on the mode use `[data-mode]` / `:host-context([data-mode=…])` selectors, which resolve against the attached host or pane. A new dialog component must call `themeService.attach(...)` on its pane, or its `var(--…)` colors are undefined.

### Stack

- **Angular 20** with NgModule architecture (standalone components not yet enforced — `@angular-eslint/prefer-standalone: off`)
- **TypeScript 5.9**, target ES2022
- **PrimeNG 20**, **Angular Material 20** (shared TB modules via `@shared`)
- **Chart.js 3.3**, **ECharts 5.5** for visualizations
- **NgRx Store 20**, **@ngx-translate/core 17** for state and i18n
- **RxJS 7.8** for reactive streams (BehaviorSubject-based services)
- **ThingsBoard UI types** from `node_modules/thingsboard` (path aliases: `@shared`, `@home`, `@app`, `@core`, `@modules`, `@env`)
- **ESLint 9** flat config (`eslint.config.mjs`) with `angular-eslint` and `typescript-eslint`. Unused args prefixed with `_` are allowed; the template a11y rules (`click-events-have-key-events`, `interactive-supports-focus`, `label-has-associated-control`) are warnings
- **No test suite** — there are zero `*.spec.ts` files in the project source. No Karma/Jest configuration exists.

### ThingsBoard Path Aliases

These `tsconfig.json` path aliases resolve into `node_modules/thingsboard/` and are available for imports:

| Alias | Resolves to |
|-------|------------|
| `@shared/*` | `node_modules/thingsboard/src/app/shared/*` |
| `@home/*` | `node_modules/thingsboard/src/app/modules/home/*` |
| `@app/*` | `node_modules/thingsboard/src/app/*` |
| `@core/*` | `node_modules/thingsboard/src/app/core/*` |
| `@modules/*` | `node_modules/thingsboard/src/app/modules/*` |
| `@env/*` | `node_modules/thingsboard/src/environments/*` |

The most commonly used import is `WidgetContext` from `@home/models/widget-component.models` — this is the entry point for all ThingsBoard widget data.

### ThingsBoard Widget Integration

In the ThingsBoard widget editor:
- **HTML tab**: `<tb-revelton-dashboard [ctx]="ctx"></tb-revelton-dashboard>` or `<tb-room-card [ctx]="ctx"></tb-room-card>`
- **JS tab**: Must implement `self.onInit` and `self.onDataUpdated` to call `component.updateSettings()` / `component.onDataUpdated()` and `self.ctx.detectChanges()`
- **Resources tab**: Check "Is extension" and point to that dashboard's bundle URL (`hotel-dashboard-widgets.js` or `utility-dashboard-widgets.js`)

### Reference Files

- [UPDATING.md](UPDATING.md) — Migration steps for upgrading to newer ThingsBoard/Angular versions
- [gateway-export.json](gateway-export.json) — Pre-configured MQTT mappings for ThingsBoard IoT Gateway (Zigbee2MQTT: TRVs, sensors)
- [thingsboard/](thingsboard/) — Telegram alert rule chain exports + [SETUP_GUIDE.md](thingsboard/SETUP_GUIDE.md). The Control Panel saves thresholds as flat server attributes on room assets (`co2Max`, `laeqMax`, `telegram_botToken`, etc.); this TB rule chain compares incoming telemetry against them and dispatches Telegram alerts

### File Registration Checklist

When adding a new component:
1. Create `.ts`, `.html`, `.scss` files
2. Declare in the project's `src/<project>/<project>.module.ts` (both `declarations` and `exports`)
3. Re-export from `src/<project>/public-api.ts` (the compiler reports NG3001 if a class referenced in the module isn't exported)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
