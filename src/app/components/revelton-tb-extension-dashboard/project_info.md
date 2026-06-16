# Revelton TB Extension Dashboard — Architecture Documentation

> **Last updated**: 2025-07-18  
> **Purpose**: Complete architectural reference for the dashboard codebase.

---

## 1. Directory Structure

```
revelton-tb-extension-dashboard/
│
├── core/                                    # Foundation layer
│   ├── models/
│   │   ├── room-card.models.ts              # TrvMode, TrvPreset, ThermostatDevice, AirQualitySensor, RoomSensor, RoomAlert
│   │   └── theme.constants.ts               # Theme palettes (light/dark per theme)
│   └── services/
│       ├── hotel-state.service.ts           # Central orchestrator — device discovery, telemetry aggregation, room grouping (~1600 lines)
│       ├── room-data.service.ts             # Per-room telemetry → structured RoomData (calculateAirQuality, computeReservationDisplay)
│       ├── theme.service.ts                 # Theme switching + CSS variable injection
│       └── translation.service.ts           # EN/RU translations via BehaviorSubject
│
├── features/
│   ├── hotel-dashboard/                     # Main dashboard: room grid, header, stats, weather, lang/theme toggles
│   │   ├── revelton-hotel.component.ts      # 636 lines — orchestrates rooms, stats, room click → dialog
│   │   ├── revelton-hotel.component.html
│   │   ├── revelton-hotel.component.scss
│   │   └── settings-schema.json
│   │
│   ├── room-view/                           # ★ ROOM VIEW FEATURE ★
│   │   ├── room-card.component.ts           # ThingsBoard widget — individual room card (click → dialog)
│   │   ├── room-card.component.html
│   │   ├── room-card.component.scss
│   │   ├── room-detail-panel.component.ts   # MatDialog — full room detail (thermostats, AQ, sensors, alerts)
│   │   ├── room-detail-panel.component.html
│   │   ├── room-detail-panel.component.scss
│   │   ├── room-historical-data.component.ts   # ★ MAIN FOCUS — historical data overlay ★
│   │   ├── room-historical-data.component.html
│   │   └── room-historical-data.component.scss
│   │
│   ├── control-panel/                       # Control panel (thermostat scheduling, MEWS sync, Telegram config)
│   │   ├── control-panel.component.ts
│   │   ├── control-panel.component.scss
│   │   ├── models/
│   │   │   └── control-panel.models.ts
│   │   └── services/
│   │       └── control-panel.service.ts
│   │
│   ├── other-devices-panel/                 # Non-room devices display
│   │   ├── other-devices-panel.component.ts
│   │   └── other-devices-panel.component.scss
│   │
│   └── settings-panel/                      # (empty — reserved for future use)
│
└── shared/
    ├── components/                          # 12 reusable widget components
    │   ├── thermostat-card/
    │   ├── air-quality-sensor/
    │   ├── window-sensor/
    │   ├── water-leak-sensor/
    │   ├── noise-sensor/
    │   ├── occupancy-sensor/
    │   ├── metric-cell/
    │   ├── alerts-panel/
    │   ├── activity-logs/
    │   ├── compact-env-sensor/
    │   ├── compact-thermostat/
    │   └── sensor-tile/
    └── layout/
        └── hotel-header/
```

---

## 2. External Dependencies (Sister Project)

```
revelton-tb-extension-historical-dashboard/
├── shared/components/historical-chart/      # ★ ECharts-based chart component ★
│   ├── historical-chart.component.ts        # Line/bar charts, dual Y-axis, dark mode, tooltips
│   ├── historical-chart.component.html
│   └── historical-chart.component.scss
└── features/
    ├── acoustics-panel/                     # `<revelton-acoustics-panel>` — used by room-historical-data
    ├── window-panel/                        # `<revelton-window-panel>` — used by room-historical-data
    └── water-leak-panel/                    # `<revelton-water-leak-panel>` — used by room-historical-data
```

---

## 3. Core Models

### room-card.models.ts

| Interface | Purpose | Key Fields |
|---|---|---|
| `TrvMode` | Thermostat mode option | `id`, `label`, `icon`, `color` |
| `TrvPreset` | Thermostat preset option | `id`, `label`, `icon`, `color` |
| `ThermostatDevice` | Full TRV state | `entityName`, `currentTemp`, `targetTemp`, `systemMode`, `runningState`, `preset`, `battery`, `offline`, UI state (`modeOpen`, `presetOpen`, `rpcPending`, locks) |
| `AirQualitySensor` | Full AQ sensor state | `entityName`, `overall`, `aqiScore`, `co2`, `tvoc`, `pm25`, `pm10`, `temperature`, `humidity`, etc. |
| `RoomSensor` | Window/Water/Noise sensor | `type`, `entityName`, `isOpen`/`isLeak`, `statusLabel`, `statusColor`, `tamper` |
| `RoomAlert` | Alert entry | `id`, `severity` (critical/warning), `title`, `message`, `time` |

### RoomData (from room-data.service.ts)

The central data object flowing through the entire dashboard. Key sections:

| Section | Purpose |
|---|---|
| `sensorData` | Current values: `roomNumber`, `temperature`, `humidity`, `airQuality`, `checkedIn`, `waterLeak`, `noise`, `booked`, `roomTitle` |
| `hasData` | Boolean flags per sensor type — indicates if data was received |
| `reservation` | MEWS reservation info: `checkIn`, `checkOut`, `guestName`, `reservationState`, computed displays (`bookDisplay`, `checkDisplay`, `statusSummary`) |
| `winAgg` | Window aggregate: `total`, `openCount`, `anyOpen`, `display` |
| `trvAgg` | Thermostat aggregate: `count`, `avgSetPoint`, `worstStatus`, `display` |
| `*Status` | Per-metric status: `tempStatus`, `humStatus`, `airStatus`, `noiseStatus`, `roomStatus` |
| `*Devices` | Device data maps keyed by entityName: `tempDevices`, `humDevices`, `windowDevices`, `trvDevices`, `leakDevices`, `noiseDevices`, `airSensors`, `batteryDevices`, `batteryLowDevices`, `offlineDevices`, `tamperDevices` |
| `deviceEntityIdMap` | `entityName → UUID` mapping for RPC calls |

---

## 4. Services

### HotelStateService (`core/services/hotel-state.service.ts`)

**Role**: Central orchestrator — manages all rooms and devices.

| Method | Description |
|---|---|
| `processDataUpdate()` | Main entry point. Receives raw telemetry, groups by room, creates mock contexts, calls `RoomDataService.updateFromTelemetry()` for each room |
| `discoverDevices()` | Discovers devices via ThingsBoard asset/relation APIs |
| `discoverDevicesForRoom()` | Discovers devices for a specific room asset |
| `discoverKeysAndFetch()` | Fetches available telemetry keys for a device, then fetches data |
| `fetchDeviceData()` | Fetches both telemetry and attributes for a device |
| `fetchDeviceTelemetry()` | Fetches latest telemetry values |
| `fetchDeviceAttributes()` | Fetches client-side attributes (model, firmware, etc.) |
| `mergeDeviceDataIntoRoom()` | Merges device data into the room's `RoomData` structure |
| `mergeDeviceDataIntoOther()` | Merges device data for non-room (other) devices |
| `updateHotelStats()` | Aggregates hotel-wide stats (battery alerts, check-ins, occupancy, etc.) |
| `refreshAllDeviceTelemetry()` | Periodic refresh of all device telemetry |

**Observables**:
- `rooms$: Observable<Map<string, RoomData>>` — all rooms
- `hotelStats$: Observable<HotelStats>` — hotel-wide statistics
- `otherDevices$: Observable<OtherDevice[]>` — non-room devices

### RoomDataService (`core/services/room-data.service.ts`)

**Role**: Processes raw telemetry into structured `RoomData`.

| Method | Description |
|---|---|
| `updateFromTelemetry(ctx, roomData)` | Main processing. Iterates datasources, extracts keys/values, updates `RoomData` |
| `calculateAirQuality(co2, tvoc, pm25, pm10, humidity, temp)` | Static — computes AQI score (0-500) using breakpoint-based linear interpolation |
| `computeReservationDisplay(res)` | Computes check-in/check-out display, overdue/late-arrival logic |
| `aggregateAll()` | Computes window, thermostat, and status aggregates |
| `calcStatus(value, thresholds)` | Determines normal/warning/danger status per metric |
| `timeAgo(seconds)` | Human-readable relative time |
| `getAirQualityLabel(aqi)` | Label for AQI score |
| `isAirSensor()`, `isTRV()` | Device type detection helpers |

### ThemeService (`core/services/theme.service.ts`)

| Method | Description |
|---|---|
| `setTheme(name)` | Switch to a named theme |
| `setMode('light'\|'dark')` | Set light/dark mode |
| `toggleMode()` | Toggle between light/dark |
| `applyTheme(target?)` | Injects CSS variables into `documentElement` or a specific element |

**Observables**: `theme$`, `mode$`

### TranslationService (`core/services/translation.service.ts`)

| Method | Description |
|---|---|
| `setLanguage(code)` | Switch language (EN/RU) |
| `t` (getter) | Returns current translation set |

**Observable**: `activeLangCode$`

---

## 5. Feature Components

### 5.1 Hotel Dashboard (`features/hotel-dashboard/`)

**Selector**: `revelton-hotel`

**Role**: Main dashboard widget. Displays:
- Hotel header with name, weather, time, language/theme controls
- Room cards grid (click → opens `RoomDetailPanelComponent`)
- Hotel stats (total rooms, online/offline, battery alerts, check-ins, MEWS status)
- Other devices panel

**Key methods**:
- `onRoomClick(room)` — opens room detail dialog
- `updateTime()` — real-time clock with timezone formatting
- `fetchWeather()` — Open-Meteo API integration
- `onDataUpdated()` — receives periodic data updates from `HotelStateService`

### 5.2 Room Card (`features/room-view/room-card.component.ts`)

**Selector**: `tb-room-card`

**Role**: ThingsBoard widget — individual room card. Displays compact metrics grid:
- Temperature, Humidity, Air Quality, Thermostat status, Windows, Occupancy, Water Leak, Noise, Booking status

**Click behavior**: Opens `RoomDetailPanelComponent` as a MatDialog, or fires ThingsBoard action if configured.

**Key methods**:
- `onDataUpdated()` — calls `RoomDataService.updateFromTelemetry()`
- `onWidgetClick()` — handles click → dialog or TB action
- `extractRoomNumber(name)` — parses room number from entity name

### 5.3 Room Detail Panel (`features/room-view/room-detail-panel.component.ts`)

**Selector**: `tb-room-card-dialog`

**Role**: MatDialog showing full room details:
- Header: room number, floor, quick stats, reservation info
- Row 1: Thermostat cards + Air Quality sensors
- Row 2: Window/Water/Noise/Occupancy sensors + Alerts panel
- "Timeline" button → opens `RoomHistoricalDataComponent` as overlay modal

**Key methods**:
- `buildFromPassedData()` — rebuilds thermostat, AQ, and sensor arrays from `RoomData`
- `selectMode()`, `selectPreset()`, `onTempChange()` — thermostat RPC control
- `saveAttribute()` — sends RPC to set device attribute
- `openHistoricalData()` / `closeHistoricalData()` — toggle history modal

### 5.4 Room Historical Data (`features/room-view/room-historical-data.component.ts`) ★

**Selector**: `tb-room-historical-data`

**Role**: Overlay modal displaying historical time-series data for a room.

**Inputs**:
| Input | Type | Source |
|---|---|---|
| `ctx` | `any` (WidgetContext) | Room detail panel's `data.ctx` |
| `deviceEntityIdMap` | `Record<string, string>` | Room detail panel's `deviceEntityIdMap` |
| `thermostats` | `any[]` | Room detail panel |
| `aqSensors` | `any[]` | Room detail panel |
| `tempDevices` | `Record<string, any>` | Room detail panel's `data.tempDevices` |
| `humDevices` | `Record<string, any>` | Room detail panel's `data.humDevices` |
| `windowDevices` | `Record<string, any>` | Room detail panel's `data.windowDevices` |
| `leakDevices` | `Record<string, any>` | Room detail panel's `data.leakDevices` |
| `noiseDevices` | `Record<string, any>` | Room detail panel's `data.noiseDevices` |

**Current Features**:

| Feature | Description |
|---|---|
| Time range selector | 24h, 7d, 30d buttons |
| Live stat pills | Temperature + Humidity with animated dots |
| Combined chart | Temp + Humidity dual-axis line chart (`revelton-historical-chart`) |
| Pollutant tabs | CO₂, TVOC, PM2.5, AQI — each with current value + individual chart |
| Acoustics panel | Delegates to `<revelton-acoustics-panel>` |
| Window panel | Delegates to `<revelton-window-panel>` |
| Water Leak panel | Delegates to `<revelton-water-leak-panel>` |
| Loading state | Custom glow-ring CSS animation |
| Error state | Error message + retry button |
| Dark/Light mode | Manual CSS variable toggling via `ThemeService.mode$` |

**Data Fetching**:
- Direct HTTP GET to `/api/plugins/telemetry/DEVICE/{id}/values/timeseries`
- Fetches keys: `temperature,humidity,co2,tvoc,iaq,pm25,pm10,pressure,temp,hum,noise,contact,waterLeak`
- Limit: 2000 data points per query
- Fetches unique device IDs concurrently via `Promise.all`

**Data Processing**:
- `toSeries(points)` — converts telemetry points to `[ts, value]` tuples
- `latest(points)` — extracts latest value for summary stats
- Device identification: matches AQ, temp, humidity, noise, window, leak sensors from input maps
- Normalizes alternate key names (`temp` → `temperature`, `hum` → `humidity`, `iaq`/`tvoc` aliasing)

**Chart Component**: Uses `<revelton-historical-chart>` (from `revelton-tb-extension-historical-dashboard`)

| Input | Description |
|---|---|
| `[data]` | Array of `{ name, values: [ts, value][] }` series |
| `[colors]` | Array of hex colors per series |
| `[type]` | `'line'` or `'bar'` |
| `[dualAxis]` | Enable dual Y-axis for Temp/Humidity |

---

## 6. Shared Components

### 6.1 Reusable Sensor Widgets

| Component | Selector | Input | Purpose |
|---|---|---|---|
| ThermostatCard | `tb-thermostat-card` | `[trv]` | Thermostat control with mode/preset/temp |
| AirQualitySensor | `tb-air-quality-sensor` | `[sensor]` | AQ sensor display |
| WindowSensor | `tb-window-sensor` | `[sensor]` | Window open/closed status |
| WaterLeakSensor | `tb-water-leak-sensor` | `[sensor]` | Leak detection status |
| NoiseSensor | `tb-noise-sensor` | `[sensor]` | Noise level display |
| OccupancySensor | `tb-occupancy-sensor` | `[sensor]` | Occupancy status |
| SensorTile | `tb-sensor-tile` | `[sensor]` | Generic sensor tile (fallback) |
| MetricCell | `tb-metric-cell` | `[icon]`, `[label]`, `[value]` | Metric grid cell |
| AlertsPanel | `tb-alerts-panel` | `[alerts]`, `(acknowledge)` | Alert list |
| ActivityLogs | `tb-activity-logs` | — | Activity log entries |
| CompactEnvSensor | — | — | Compact environmental sensor |
| CompactThermostat | — | — | Compact thermostat |

### 6.2 Historical Chart (`revelton-tb-extension-historical-dashboard/shared/components/historical-chart/`)

**Selector**: `revelton-historical-chart`

**Technology**: ECharts

| Input | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Chart title |
| `icon` | `string` | — | Material icon name |
| `data` | `any[]` | `[]` | Series array `{ name, values: [ts, value][] }` |
| `colors` | `string[]` | `['#8b5cf6', '#3b82f6', '#ef4444']` | Series colors |
| `type` | `'line' \| 'bar'` | `'line'` | Chart type |
| `sparkline` | `boolean` | `false` | Compact mode (hides axes/legends) |
| `dualAxis` | `boolean` | `false` | Dual Y-axis for first two series |

**Features**:
- Automatic dark/light mode detection from parent container
- Time-based X-axis with smart date formatting
- Rich tooltips with formatted timestamps
- Area fill for single-series charts
- Gradient bars for bar charts
- ResizeObserver for responsive sizing
- Dual Y-axis formatting (°C / %)

---

## 7. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ThingsBoard Telemetry API                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  HotelStateService.processDataUpdate()                           │
│  ├── Groups raw telemetry by room number                        │
│  ├── Creates mock WidgetContext per room                         │
│  ├── Calls RoomDataService.updateFromTelemetry(ctx, roomData)    │
│  └── Updates hotel-wide stats                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RoomDataService.updateFromTelemetry()                           │
│  ├── Iterates datasources, extracts telemetry keys/values        │
│  ├── Classifies devices (TRV, AQ, Window, Leak, Noise, etc.)    │
│  ├── Calls RoomDataService.calculateAirQuality()                 │
│  ├── Calls computeReservationDisplay() for MEWS data             │
│  ├── Calls aggregateAll() for window/TRV aggregates              │
│  └── Returns populated RoomData                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ReveltonDashboardComponent                                      │
│  ├── Displays room cards in grid                                │
│  ├── Shows hotel stats, weather, time                           │
│  └── onRoomClick(room) → opens RoomDetailPanelComponent          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ click
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RoomDetailPanelComponent (MatDialog)                             │
│  ├── buildFromPassedData() — builds thermostat/AQ/sensor arrays  │
│  ├── Renders thermostats, AQ, window/leak/noise sensors          │
│  └── "Timeline" button → showHistoricalData = true              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ timeline button
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RoomHistoricalDataComponent (Overlay Modal)                      │
│  ├── Receives ctx, deviceEntityIdMap, device maps from parent    │
│  ├── fetchData() — HTTP calls to telemetry API (time-series)     │
│  ├── Processes and normalizes data per metric                    │
│  ├── Renders via <revelton-historical-chart> (ECharts)           │
│  └── Delegates to <revelton-acoustics/window/water-leak-panel>   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Key Patterns & Conventions

### 8.1 Device Identification
- Entity names follow pattern: `PREFIX_ROOM_DEVICENUM` (e.g., `TRV_101_1`, `AQ_101_1`, `WIN_101_2`)
- Room number extracted via regex: `/(\d+)_\d+$/` or `/_(\d+)$/`
- `deviceEntityIdMap` maps entity names to ThingsBoard UUIDs for RPC

### 8.2 Theming
- CSS custom properties set via `ThemeService.applyTheme()`
- Variables: `--bg`, `--panel`, `--card`, `--border`, `--text`, `--accent`, `--success`, `--warning`, `--danger`
- Dark mode class: `.room-hist-container.light-mode` toggles variable overrides
- Chart component detects dark mode from parent `.revelton-dashboard-container`

### 8.3 RPC Communication
- Thermostat control via HTTP POST to `/api/plugins/telemetry/DEVICE/{id}/SHARED_SCOPE`
- Attributes: `current_heating_setpoint`, `system_mode`, `preset`
- Optimistic UI with lock mechanism (`modeLockUntil`, `presetLockUntil`, `tempLockUntil`)

### 8.4 Translation
- Accessed via `translationService.t` getter
- Keys: `temperature`, `humidity`, `airQuality`, `windows`, `waterLeak`, `noise`, `thermostats`, etc.
- Languages: EN, RU (stored in localStorage)

---

## 9. Current Limitations & Known Issues

### RoomHistoricalDataComponent
1. **Direct HTTP calls** — bypasses ThingsBoard's datasource/subscription mechanism; no automatic refresh
2. **Manual device identification** — relies on regex matching of entity names; fragile
3. **No real-time updates** — data is fetched once and never auto-refreshed
4. **Limited pollutant metrics** — only CO₂, TVOC, PM2.5, AQI; no PM10, pressure chart
5. **Window processing is simplified** — contact sensor events processed as binary open/closed without proper timeline
6. **Sub-panels conditionally shown** — `*ngIf` conditions may cause panels to disappear
7. **No export functionality** — cannot download/export historical data
8. **Hardcoded chart heights** — not responsive to container size changes
9. **Single-metric view** — can only view one pollutant at a time; no overlay/compare mode

### General
- `settings-panel/` directory is empty (reserved for future use)
- No module file — components are presumably declared elsewhere
- Settings schema (`settings-schema.json`) exists but implementation unclear

---

## 10. File Inventory (Complete)

### Core
| File | Lines | Purpose |
|---|---|---|
| `core/models/room-card.models.ts` | ~60 | TypeScript interfaces |
| `core/models/theme.constants.ts` | — | Theme definitions |
| `core/services/hotel-state.service.ts` | ~1606 | Central state orchestrator |
| `core/services/room-data.service.ts` | ~619 | Telemetry → RoomData processor |
| `core/services/theme.service.ts` | ~150 | Theme management |
| `core/services/translation.service.ts` | ~520 | Translations (EN/RU) |

### Features
| File | Lines | Purpose |
|---|---|---|
| `features/hotel-dashboard/revelton-hotel.component.ts` | ~636 | Main dashboard |
| `features/hotel-dashboard/revelton-hotel.component.html` | ~565 | Dashboard template |
| `features/hotel-dashboard/revelton-hotel.component.scss` | — | Dashboard styles |
| `features/room-view/room-card.component.ts` | ~180 | Room card widget |
| `features/room-view/room-detail-panel.component.ts` | ~510 | Room detail dialog |
| `features/room-view/room-historical-data.component.ts` | ~370 | ★ Historical data |
| `features/room-view/room-historical-data.component.html` | ~160 | Historical template |
| `features/room-view/room-historical-data.component.scss` | ~400 | Historical styles |
| `features/control-panel/control-panel.component.ts` | — | Control panel |
| `features/other-devices-panel/other-devices-panel.component.ts` | — | Other devices |

### Shared
| File | Purpose |
|---|---|
| `shared/components/thermostat-card/` | Thermostat card |
| `shared/components/air-quality-sensor/` | AQ sensor |
| `shared/components/window-sensor/` | Window sensor |
| `shared/components/water-leak-sensor/` | Water leak sensor |
| `shared/components/noise-sensor/` | Noise sensor |
| `shared/components/occupancy-sensor/` | Occupancy sensor |
| `shared/components/metric-cell/` | Metric cell |
| `shared/components/alerts-panel/` | Alerts panel |
| `shared/components/activity-logs/` | Activity logs |
| `shared/components/compact-env-sensor/` | Compact env sensor |
| `shared/components/compact-thermostat/` | Compact thermostat |
| `shared/components/sensor-tile/` | Generic sensor tile |
| `shared/layout/hotel-header/` | Header layout |

### External (sister project)
| File | Purpose |
|---|---|
| `revelton-tb-extension-historical-dashboard/shared/components/historical-chart/historical-chart.component.ts` | ECharts chart |
| `revelton-tb-extension-historical-dashboard/features/acoustics-panel/` | Acoustics panel |
| `revelton-tb-extension-historical-dashboard/features/window-panel/` | Window panel |
| `revelton-tb-extension-historical-dashboard/features/water-leak-panel/` | Water leak panel |
