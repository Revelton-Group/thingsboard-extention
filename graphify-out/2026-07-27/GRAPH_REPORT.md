# Graph Report - thingsboard-extention  (2026-07-27)

## Corpus Check
- 129 files · ~102,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1650 nodes · 2808 edges · 153 communities (92 shown, 61 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4ae067f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- WaterLeakSensorComponent
- Community 65
- WindowPanelComponent
- Community 67
- theme.service.ts
- Community 69
- Community 70
- Community 71
- ControlPanelSectionId
- Community 73
- Community 74
- RoomCardComponent
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- ._doProcessDataUpdate
- Community 84
- Community 85
- Community 86
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Hotel Dashboard — Production Readiness Audit V2
- Community 125
- Community 126
- Room Card Alert / Border Color Logic
- QA Checklist — Round 2: refresh performance + loading UX
- water-leak-panel.component.ts
- base_instructions.md
- eslint-plugin-jsdoc
- graphify.md
- graphify.md
- 1. Logic errors
- AirQualityMetricsPanelComponent
- 3. Room Detail Panel & Historical Chart
- 1. Control Panel
- @angular/animations
- 2. Sensor Widgets
- angular-eslint
- .closeHistoricalData
- MetricCellComponent
- .isSocketOn
- .isSocketOn
- @angular/animations

## God Nodes (most connected - your core abstractions)
1. `RoomDetailPanelComponent` - 67 edges
2. `ControlPanelComponent` - 65 edges
3. `ReveltonDashboardComponent` - 65 edges
4. `TranslationService` - 49 edges
5. `EvStationHistoryModalComponent` - 45 edges
6. `HotelStateService` - 41 edges
7. `ThingsBoardTelemetryService` - 32 edges
8. `ThermostatCardComponent` - 30 edges
9. `ControlPanelService` - 29 edges
10. `RoomDataService` - 28 edges

## Surprising Connections (you probably didn't know these)
- `ReveltonDashboardComponent` --references--> `InlineRoom`  [EXTRACTED]
  src/app/components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component.ts → src/app/components/revelton-tb-extension-dashboard/core/services/hotel-state.service.ts
- `ReveltonDashboardComponent` --references--> `OtherDevice`  [EXTRACTED]
  src/app/components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component.ts → src/app/components/revelton-tb-extension-dashboard/core/services/hotel-state.service.ts
- `ReveltonDashboardComponent` --references--> `HotelStats`  [EXTRACTED]
  src/app/components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component.ts → src/app/components/revelton-tb-extension-dashboard/core/services/hotel-state.service.ts
- `RoomCardComponent` --references--> `RoomData`  [EXTRACTED]
  src/app/components/revelton-tb-extension-dashboard/features/room-view/room-card.component.ts → src/app/components/revelton-tb-extension-dashboard/core/services/room-data.service.ts
- `ControlPanelComponent` --references--> `ControlPanelConfig`  [EXTRACTED]
  src/app/components/revelton-tb-extension-dashboard/features/control-panel/control-panel.component.ts → src/app/components/revelton-tb-extension-dashboard/features/control-panel/models/control-panel.models.ts

## Import Cycles
- None detected.

## Communities (153 total, 61 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (5): HistoricalStateService, Injectable, ReveltonTbExtensionHistoricalDashboardComponent, Component, Input

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (3): ReveltonDashboardComponent, Component, Input

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (16): ExpandedChartDialogComponent, formatDuration(), formatTimeRange(), getBlockColor(), getBlockLabel(), getPragueParts(), normalizeBinaryValue(), PRAGUE_DATE_FORMATTER (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (41): @angular-devkit/architect, builders, dependencies, @angular-devkit/architect, rxjs, typescript, description, devDependencies (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (3): getPragueParts(), HotelStateService, Injectable

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (11): TIME_RANGE_LIST, TIME_RANGE_OPTIONS, TimeRangeOption, TimeRangeConfig, TimeRangeKey, TimeRangeService, Injectable, HistoricalFilterBarComponent (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (35): chart.js, echarts, flot, flot.curvedlines, moment, dependencies, chart.js, echarts (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (25): CONNECTOR_KEY_SUFFIXES, EV_CHARGER_ALL_KEYS, EV_CHARGER_CURRENT_KEYS, EV_CHARGER_ENERGY_KEYS, EV_CHARGER_IDENTIFIER_KEYS, EV_CHARGER_POWER_KEYS, EV_CHARGER_SESSION_KEYS, EV_CHARGER_STATION_KEYS (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (5): HISTORICAL_FEATURE_PANELS, UTILITY_FEATURES, TranslationService, TranslationSet, Injectable

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (4): RoomDetailPanelComponent, Component, Input, Output

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (7): ThermostatDevice, TrvMode, TrvPreset, ThermostatCardComponent, Component, Input, Output

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (3): ChargerStatusCardComponent, Component, Input

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (22): DEFAULT_ROOM_DETAILS(), FloorGroup, Room, RoomDetails, EMPTY_AIR_QUALITY_CHART(), AirQualityStats, DEFAULT_AIR_QUALITY_STATS(), DEFAULT_NOISE_STATS() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (3): CompactThermostatComponent, Component, Input

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (12): OCCUPANCY_KEYS, TEMPERATURE_VARIANTS, AirQualityResult, NoiseResult, OccupancyResult, SensorPanelResult, ThermostatResult, ChartPoint (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (21): @angular/cdk, @angular/common, @angular/core, @angular/forms, @angular/material, @angular/router, @ngrx/store, @ngx-translate/core (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (19): AirQualityThresholdConfig, CONTROL_PANEL_SECTIONS, ControlPanelSection, DEFAULT_CONTROL_PANEL_CONFIG, MewsSyncConfig, NoisePeriod, NoisePeriodThresholds, NoiseThresholdConfig (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (18): adopt(), architect_1, child_process_1, chokidar_1, express_1, fs_1, fulfilled(), createServer() (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (19): node_modules/@types, compilerOptions, baseUrl, declaration, downlevelIteration, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.05
Nodes (39): Build Verification, Colors (dark theme — becomes the CSS custom property defaults), Control Settings Modal, Control Settings Modal, Design Token Layer, Design Tokens to Apply, Global SCSS / Font Imports, Historical Data Modal (+31 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (3): CompactEnvSensorComponent, Component, Input

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (17): dist/widget-extension, node_modules/ace-builds/src-noconflict/ace.js, node_modules/thingsboard/src/app/*, node_modules/thingsboard/src/app/core/*, node_modules/thingsboard/src/app/modules/*, node_modules/thingsboard/src/app/modules/home/*, node_modules/thingsboard/src/app/shared/*, node_modules/tooltipster/dist/js/tooltipster.bundle.min.js (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (7): WindowResult, EntityId, TelemetryMap, ThingsBoardTelemetryService, Injectable, Injectable, WindowProcessor

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (15): ./app, ../node_modules/thingsboard/src, **/*.spec.ts, src/test.ts, ../tsconfig.json, angularCompilerOptions, compilationMode, compilerOptions (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (4): AcousticsPanelComponent, noiseStatusLabel(), Component, Input

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (15): schematics, type, typeSeparator, typeSeparator, typeSeparator, typeSeparator, typeSeparator, type (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): OccupancyPanelComponent, Component, Input

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (3): AirQualitySensorComponent, Component, Input

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (13): Data flow after refactor, Effort & sequencing notes, Guiding decision: copy the pattern that already exists in this repo, Hotel Dashboard — SOLID Component-Based Refactor Plan, Phase 1 — Shared utils (pure extraction, zero behavior change), Phase 2 — Typed models (compile-time only), Phase 3 — Processor registry (behavior-preserving Strategy migration), Phase 4 — Presentation components + OnPush (leaf-first) (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (3): OccupancySensorComponent, Component, Input

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (4): SmartSocketsPanelComponent, Component, Input, Output

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (13): @angular-devkit/schematics, eslint-plugin-import, ngrx-store-freeze, devDependencies, @angular/common, @angular/compiler-cli, @angular-devkit/schematics, @angular/router (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.23
Nodes (9): ExamplesModule, NgModule, addCustomWidgetLocale(), addLibraryStyles(), addStyleFromComponent(), LibStylesEntryComponent, Component, ThingsboardExtensionWidgetsModule (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (13): EV_CHARGER_LOG_KEYS, BarSlot, EMPTY_TIP, EvChargerHistoryModalData, EvStationHistoryModalComponent, GridLine, SessionRow, SocketFilter (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (12): build, serve, builder, defaultConfiguration, options, port, project, staticServeConfig (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (11): type, type, properties, port, project, staticServeConfig, tsConfig, $schema (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.06
Nodes (33): 10. File Inventory (Complete), 1. Directory Structure, 2. External Dependencies (Sister Project), 3. Core Models, 4. Services, 5.1 Hotel Dashboard (`features/hotel-dashboard/`), 5.2 Room Card (`features/room-view/room-card.component.ts`), 5.3 Room Detail Panel (`features/room-view/room-detail-panel.component.ts`) (+25 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (8): classes, distDir, fs, path, postcss, selectorParser, tbClassesJson, tbStylesCss

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (4): AlertsPanelComponent, Component, Input, Output

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (13): AIR_QUALITY_IDENTIFIER_KEYS, AIR_QUALITY_KEYS, THERMOSTAT_IDENTIFIER_KEYS, THERMOSTAT_KEYS, THERMOSTAT_TIMESERIES_KEYS, WINDOW_DEVICE_COLORS, WINDOW_EXCLUDE_NAME_FRAGMENTS, WINDOW_IDENTIFIER_KEYS (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): analytics, packageManager, schematicCollections, cli, newProjectRoot, projects, $schema, version (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (14): isValidPreset(), isValidSystemMode(), VALID_PRESETS, VALID_SYSTEM_MODES, HotelStats, InlineRoom, OtherDevice, PRAGUE_DATETIME_FORMATTER (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.06
Nodes (28): Architecture, Build Chain, Commands, Data Flow, File Registration Checklist, graphify, Key Patterns, Mews PMS Integration (+20 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (7): NOISE_KEYS, AirQualityProcessor, Injectable, NoiseProcessor, Injectable, ThermostatProcessor, Injectable

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (9): widget-extension, style, type, @schematics/angular:component, prefix, projectType, root, schematics (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (8): compilerOptions, importHelpers, module, outDir, sourceMap, target, files, ./static-serve/index.ts

### Community 51 - "Community 51"
Cohesion: 0.39
Nodes (7): StaticServeConfig, StaticServeOptions, createServer(), execute(), executeCliCommand(), initialize(), watchStyles()

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (3): OtherDevicesPanelComponent, Component, Input

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (3): SensorTileComponent, Component, Input

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (16): 1. Development Mode (Local Testing), 2. Production Mode (Deployment), 3. Widget Integration (HTML & JS), Gateway & Data Mapping, HTML Tab, JavaScript Tab, License, Prerequisites (+8 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (10): SparklineComponent, Component, Input, HistoricalSummaryCardComponent, Component, Input, ChargerCardViewModel, EvChargerPanelComponent (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (9): ThemeDefinition, ThemePalette, THEMES, ThemeMode, ThemeService, Injectable, Component, Input (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): angularCompilerOptions, enableI18nLegacyMessageIdFormat, fullTemplateTypeCheck, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave

### Community 60 - "Community 60"
Cohesion: 0.38
Nodes (5): fse, path, projectRoot(), sourcePackage(), targetPackage()

### Community 61 - "Community 61"
Cohesion: 0.39
Nodes (4): WATER_LEAK_KEYS, WaterLeakResult, Injectable, WaterLeakProcessor

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (4): ControlPanelConfig, ControlPanelService, debugWarn(), Injectable

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (6): lint, builder, options, lintFilePatterns, src/**/*.html, src/**/*.ts

### Community 64 - "WaterLeakSensorComponent"
Cohesion: 0.29
Nodes (3): Component, Input, WaterLeakSensorComponent

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (5): configurations, development, production, tsConfig, tsConfig

### Community 66 - "WindowPanelComponent"
Cohesion: 0.29
Nodes (3): Component, Input, WindowPanelComponent

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (7): 1. Single-Limit Sensors (Only MAX limit), 2. Dual-Limit Sensors (Both MIN and MAX limits), [Control Panel Component], [MODIFY] `control-panel.component.ts`, Open Questions, Proposed Changes, Threshold Logic Plan

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): dest, lib, entryFile, $schema

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (3): Component, Input, WindowSensorComponent

### Community 74 - "Community 74"
Cohesion: 0.67
Nodes (3): dom, es2020, lib

### Community 76 - "RoomCardComponent"
Cohesion: 0.15
Nodes (4): RoomCardComponent, Component, Input, ViewChild

### Community 83 - "._doProcessDataUpdate"
Cohesion: 0.29
Nodes (4): createEmptyRoomData(), error(), log(), warn()

### Community 90 - "Community 90"
Cohesion: 0.27
Nodes (4): HistoricalChartComponent, Component, Input, ViewChild

### Community 121 - "Community 121"
Cohesion: 0.18
Nodes (11): 2. Loading section, 3. Data-updating section, 4. Unused code & duplication, 5. Fixes applied alongside this report, 6. Production-readiness gaps (not addressed in this change set), Duplication catalogue (input to the refactor), Executive summary, Flagged only — do NOT delete blindly (+3 more)

### Community 124 - "Hotel Dashboard — Production Readiness Audit V2"
Cohesion: 0.22
Nodes (7): 4. Core Services (uncommitted diff review), 5. Fixes applied in this change set, CS1 — Deleted-device cleanup misses per-sensor-type maps 🟠 HIGH ✅ FIXED, Executive summary, Hotel Dashboard — Production Readiness Audit V2, Next step, Verification

### Community 127 - "Room Card Alert / Border Color Logic"
Cohesion: 0.29
Nodes (6): Debugging a specific red room, Important gotcha with a single "23" temperature setting, Room Card Alert / Border Color Logic, Threshold bands (not single cutoffs), What does NOT affect the border color, Where the border color comes from

### Community 128 - "QA Checklist — Round 2: refresh performance + loading UX"
Cohesion: 0.29
Nodes (6): Notes / anything odd, QA Checklist — Round 2: refresh performance + loading UX, SECTION E — Topology cache / refresh speed (the main goal), SECTION F — Loading skeleton, SECTION G — Connection error banner, SECTION H — Regression (quick confirm, ~1 min)

### Community 130 - "water-leak-panel.component.ts"
Cohesion: 0.29
Nodes (3): NoiseSensorComponent, Component, Input

### Community 131 - "base_instructions.md"
Cohesion: 0.40
Nodes (4): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution

### Community 136 - "1. Logic errors"
Cohesion: 0.20
Nodes (10): 1. Logic errors, L1 — Hotel KPI stats clobbered by stale re-emission ✅ FIXED, L2 — Air-quality status thresholds in wrong units (alerts can never fire) ✅ FIXED, L3 — Duplicate `switch` case: plug status unreachable ✅ FIXED, L4 — Mews heartbeat key typo ✅ FIXED, L5 — Mews bridge detection swallows unrelated devices ✅ FIXED, L6 — 30s refresh timer polls a stale widget context ✅ FIXED, L7 — Datasource dedup broken by object-typed entityId ✅ FIXED (+2 more)

### Community 137 - "AirQualityMetricsPanelComponent"
Cohesion: 0.11
Nodes (15): AirQualityChartData, ChartSeries, AirQualityMetricsPanelComponent, MetricTab, Component, Input, AirQualityPanelComponent, Component (+7 more)

### Community 138 - "3. Room Detail Panel & Historical Chart"
Cohesion: 0.22
Nodes (9): 3. Room Detail Panel & Historical Chart, RD1 — Stale guest/reservation info leaks across rooms on fast room-switch 🔴 CRITICAL ✅ FIXED, RD2 — Expanded chart's date-range refetch can silently pull from a different device than the small card 🟠 HIGH ✅ FIXED, RD3 — Window historical badge always renders green regardless of open/closed state 🟠 HIGH ✅ FIXED, RD4 — AQI min/max freeze after the first reading and leak across rooms 🟠 MEDIUM-HIGH (not fixed — deferred, currently masked), RD5 — Acknowledged-alert and attribute-init state carries over between rooms 🟠 MEDIUM (not fixed — deferred), RD6 — Expanded Chart Dialog's custom-range picker pre-seeded wrong; Apply armed by default 🟡 MEDIUM (not fixed — deferred), RD7 — Custom date-range parsed in browser-local time, not Prague time 🟡 LOW-MEDIUM (not fixed — deferred) (+1 more)

### Community 139 - "1. Control Panel"
Cohesion: 0.29
Nodes (7): 1. Control Panel, CP1 — "Exclude rooms" scope inverted: settings save to the wrong room set 🔴 CRITICAL ✅ FIXED, CP2 — Noise Day/Night threshold edits never reach the room-card alert engine 🟠 HIGH (not fixed — deferred), CP3 — Mews gateway lookup too narrow: Sync Interval save can silently no-op 🟠 HIGH ✅ FIXED, CP4 — Save/load failures are invisible to hotel staff 🟡 MEDIUM (not fixed — deferred), CP5 — Mews "Online" status and "Sync Now" are fully mocked 🟡 MEDIUM (not fixed — deferred), CP6 — Telegram notification config is unreachable 🟢 LOW-MEDIUM (not fixed — deferred)

### Community 142 - "2. Sensor Widgets"
Cohesion: 0.40
Nodes (5): 2. Sensor Widgets, SW1 — `compact-env-sensor` battery-low cutoff diverged (5% vs. 20% everywhere else) 🟠 HIGH ✅ FIXED, SW2 — `lastSeen` "X minutes ago" labels freeze between telemetry ticks 🟡 MEDIUM (not fixed — deferred), SW3 — Water-leak/noise sensor status falls back to the literal word "on" 🟢 LOW (currently dead code), SW4 — Unanchored substring room-number fallback match 🟢 INFO (currently a no-op, latent risk)

### Community 147 - "MetricCellComponent"
Cohesion: 0.50
Nodes (3): MetricCellComponent, Component, Input

## Knowledge Gaps
- **411 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `root` (+406 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **61 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ControlPanelComponent` connect `Community 4` to `water-leak-panel.component.ts`, `ControlPanelSectionId`, `Community 9`, `Community 13`, `Community 19`, `Community 58`, `Community 62`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `ReveltonDashboardComponent` connect `Community 1` to `Community 9`, `.closeAllDropdowns`, `RoomCardComponent`, `Community 46`, `.closeHistoricalData`, `.parseDateStr`, `WaterLeakPanelComponent`, `.setLanguage`, `.ngOnInit`, `Community 57`, `Community 58`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `EvStationHistoryModalComponent` connect `Community 37` to `Community 9`, `Community 12`, `Community 57`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _411 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11088709677419355 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07239819004524888 - nodes in this community are weakly interconnected._