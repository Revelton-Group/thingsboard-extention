# Graph Report - .  (2026-07-27)

## Corpus Check
- 37 files · ~102,847 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1637 nodes · 2668 edges · 158 communities (98 shown, 60 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- EV Charger History Modal
- Hotel Control Panel
- Room Data Service
- Control Panel Logic
- Third-Party Libraries
- Audit Report Documents
- Historical Dashboard Telemetry
- Implementation Plan Docs
- Project Info Docs
- Sensor Keys Constants
- CLAUDE Config Docs
- Room Detail Panel UI
- Historical State Service
- Module Exports
- Theme System
- Hotel Dashboard Component
- Time Range Models
- Thermostat Card Component
- Sensor Chart Models
- Room and Floor Models
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
- Community 43
- Community 44
- Community 45
- Community 47
- Community 48
- Community 49
- Community 51
- Community 52
- Community 53
- Community 55
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 90
- Community 91
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
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 154
- Community 155
- Community 156
- Community 157

## God Nodes (most connected - your core abstractions)
1. `RoomDetailPanelComponent` - 67 edges
2. `ControlPanelComponent` - 65 edges
3. `ReveltonDashboardComponent` - 65 edges
4. `EvStationHistoryModalComponent` - 52 edges
5. `TranslationService` - 49 edges
6. `HotelStateService` - 41 edges
7. `ThingsBoardTelemetryService` - 32 edges
8. `ControlPanelService` - 29 edges
9. `RoomDataService` - 28 edges
10. `ThermostatCardComponent` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Compact Env Sensor Tile Template` --semantically_similar_to--> `Compact Thermostat Tile Template`  [INFERRED] [semantically similar]
  src/app/components/revelton-tb-extension-dashboard/shared/components/compact-env-sensor/compact-env-sensor.component.html → src/app/components/revelton-tb-extension-dashboard/shared/components/compact-thermostat/compact-thermostat.component.html
- `Thermostat Card Template` --semantically_similar_to--> `Compact Thermostat Tile Template`  [INFERRED] [semantically similar]
  src/app/components/revelton-tb-extension-dashboard/shared/components/thermostat-card/thermostat-card.component.html → src/app/components/revelton-tb-extension-dashboard/shared/components/compact-thermostat/compact-thermostat.component.html
- `ReveltonTbExtensionHistoricalDashboardComponent` --references--> `TimeRangeOption`  [EXTRACTED]
  src/app/components/revelton-tb-extension-historical-dashboard/revelton-tb-extension-historical-dashboard.component.ts → src/app/components/revelton-tb-extension-historical-dashboard/core/constants/time-range.constants.ts
- `AirQualityProcessor` --implements--> `ISensorProcessor`  [EXTRACTED]
  src/app/components/revelton-tb-extension-historical-dashboard/domain/processors/air-quality.processor.ts → src/app/components/revelton-tb-extension-historical-dashboard/core/interfaces/sensor-processor.interface.ts
- `OccupancyProcessor` --implements--> `ISensorProcessor`  [EXTRACTED]
  src/app/components/revelton-tb-extension-historical-dashboard/domain/processors/occupancy.processor.ts → src/app/components/revelton-tb-extension-historical-dashboard/core/interfaces/sensor-processor.interface.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Hotel Room Sensor UI Components** — src_app_components_revelton_tb_extension_dashboard_shared_components_compact_env_sensor_compact_env_sensor_component_env_sensor_tile, src_app_components_revelton_tb_extension_dashboard_shared_components_compact_thermostat_compact_thermostat_component_thermostat_tile, src_app_components_revelton_tb_extension_dashboard_shared_components_thermostat_card_thermostat_card_component_thermostat_card_template, src_app_components_revelton_tb_extension_dashboard_shared_components_smart_sockets_panel_smart_sockets_panel_component_sockets_panel_template [INFERRED 0.85]

## Communities (158 total, 60 thin omitted)

### Community 0 - "EV Charger History Modal"
Cohesion: 0.06
Nodes (12): BarSlot, EMPTY_TIP, EvChargerHistoryModalData, EvStationHistoryModalComponent, GridLine, SessionRow, SocketFilter, TipState (+4 more)

### Community 1 - "Hotel Control Panel"
Cohesion: 0.07
Nodes (16): ExpandedChartDialogComponent, formatDuration(), formatTimeRange(), getBlockColor(), getBlockLabel(), getPragueParts(), normalizeBinaryValue(), PRAGUE_DATE_FORMATTER (+8 more)

### Community 2 - "Room Data Service"
Cohesion: 0.05
Nodes (41): @angular-devkit/architect, builders, dependencies, @angular-devkit/architect, rxjs, typescript, description, devDependencies (+33 more)

### Community 4 - "Third-Party Libraries"
Cohesion: 0.06
Nodes (35): chart.js, echarts, flot, flot.curvedlines, moment, dependencies, chart.js, echarts (+27 more)

### Community 5 - "Audit Report Documents"
Cohesion: 0.06
Nodes (34): 1. Logic errors, 2. Loading section, 3. Data-updating section, 4. Unused code & duplication, 5. Fixes applied alongside this report, 6. Production-readiness gaps (not addressed in this change set), Duplication catalogue (input to the refactor), Executive summary (+26 more)

### Community 6 - "Historical Dashboard Telemetry"
Cohesion: 0.09
Nodes (10): NOISE_KEYS, WindowResult, ThingsBoardTelemetryService, Injectable, NoiseProcessor, Injectable, ThermostatProcessor, Injectable (+2 more)

### Community 7 - "Implementation Plan Docs"
Cohesion: 0.06
Nodes (33): Build Verification, Colors (dark theme — becomes the CSS custom property defaults), Control Settings Modal, Design Token Layer, Design Tokens to Apply, Global SCSS / Font Imports, Historical Data Modal, Implementation Plan: New UI Design for Hotel IoT Dashboard (+25 more)

### Community 8 - "Project Info Docs"
Cohesion: 0.06
Nodes (33): 10. File Inventory (Complete), 1. Directory Structure, 2. External Dependencies (Sister Project), 3. Core Models, 4. Services, 5.1 Hotel Dashboard (`features/hotel-dashboard/`), 5.2 Room Card (`features/room-view/room-card.component.ts`), 5.3 Room Detail Panel (`features/room-view/room-detail-panel.component.ts`) (+25 more)

### Community 9 - "Sensor Keys Constants"
Cohesion: 0.15
Nodes (15): AIR_QUALITY_IDENTIFIER_KEYS, AIR_QUALITY_KEYS, THERMOSTAT_IDENTIFIER_KEYS, THERMOSTAT_KEYS, THERMOSTAT_TIMESERIES_KEYS, WINDOW_DEVICE_COLORS, WINDOW_EXCLUDE_NAME_FRAGMENTS, WINDOW_IDENTIFIER_KEYS (+7 more)

### Community 10 - "CLAUDE Config Docs"
Cohesion: 0.06
Nodes (28): Architecture, Build Chain, Commands, Data Flow, File Registration Checklist, graphify, Key Patterns, Mews PMS Integration (+20 more)

### Community 11 - "Room Detail Panel UI"
Cohesion: 0.07
Nodes (4): RoomDetailPanelComponent, Component, Input, Output

### Community 12 - "Historical State Service"
Cohesion: 0.12
Nodes (5): HistoricalStateService, Injectable, ReveltonTbExtensionHistoricalDashboardComponent, Component, Input

### Community 13 - "Module Exports"
Cohesion: 0.19
Nodes (5): HISTORICAL_FEATURE_PANELS, UTILITY_FEATURES, TranslationService, TranslationSet, Injectable

### Community 14 - "Theme System"
Cohesion: 0.11
Nodes (10): ThemeDefinition, ThemePalette, THEMES, ThemeMode, ThemeService, Injectable, HistoricalChartComponent, Component (+2 more)

### Community 15 - "Hotel Dashboard Component"
Cohesion: 0.08
Nodes (3): ReveltonDashboardComponent, Component, Input

### Community 16 - "Time Range Models"
Cohesion: 0.15
Nodes (13): TIME_RANGE_LIST, TIME_RANGE_OPTIONS, TimeRangeOption, EntityId, TelemetryMap, TimeRangeConfig, TimeRangeKey, TimeRangeService (+5 more)

### Community 17 - "Thermostat Card Component"
Cohesion: 0.08
Nodes (4): ThermostatCardComponent, Component, Input, Output

### Community 18 - "Sensor Chart Models"
Cohesion: 0.13
Nodes (14): AirQualityChartData, ChartSeries, AirQualityStats, ThermostatStats, AirQualityMetricsPanelComponent, MetricTab, Component, Input (+6 more)

### Community 19 - "Room and Floor Models"
Cohesion: 0.18
Nodes (17): SensorPanelResult, DEFAULT_ROOM_DETAILS(), FloorGroup, Room, RoomDetails, EMPTY_AIR_QUALITY_CHART(), DEFAULT_AIR_QUALITY_STATS(), DEFAULT_NOISE_STATS() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (19): AirQualityThresholdConfig, CONTROL_PANEL_SECTIONS, ControlPanelSection, DEFAULT_CONTROL_PANEL_CONFIG, MewsSyncConfig, NoisePeriod, NoisePeriodThresholds, NoiseThresholdConfig (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (3): CompactThermostatComponent, Component, Input

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (21): @angular/cdk, @angular/common, @angular/core, @angular/forms, @angular/material, @angular/router, @ngrx/store, @ngx-translate/core (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (4): Optional, RoomDataService, Injectable, Inject

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (9): SparklineComponent, Component, Input, HistoricalSummaryCardComponent, Component, Input, EvChargerPanelComponent, Component (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (18): adopt(), architect_1, child_process_1, chokidar_1, express_1, fs_1, fulfilled(), createServer() (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (19): node_modules/@types, compilerOptions, baseUrl, declaration, downlevelIteration, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+11 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (3): getPragueParts(), HotelStateService, Injectable

### Community 28 - "Community 28"
Cohesion: 0.19
Nodes (4): ControlPanelConfig, ControlPanelService, debugWarn(), Injectable

### Community 29 - "Community 29"
Cohesion: 0.27
Nodes (4): createEmptyRoomData(), error(), log(), warn()

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (3): CompactEnvSensorComponent, Component, Input

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (16): 1. Development Mode (Local Testing), 2. Production Mode (Deployment), 3. Widget Integration (HTML & JS), Gateway & Data Mapping, HTML Tab, JavaScript Tab, License, Prerequisites (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (8): EvChargerResult, IUtilityProcessor, UtilityPanelResult, ChargerCardViewModel, ChargingStatus, EvChargerStats, SocketState, SocketViewModel

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): ./app, ../node_modules/thingsboard/src, **/*.spec.ts, src/test.ts, ../tsconfig.json, angularCompilerOptions, compilationMode, compilerOptions (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (4): RoomCardComponent, Component, Input, ViewChild

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (8): TEMPERATURE_VARIANTS, AirQualityResult, ChartPoint, DEFAULT_THERMOSTAT_STATS(), TelemetryPoint, TimeWindow, AirQualityProcessor, Injectable

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (4): AcousticsPanelComponent, noiseStatusLabel(), Component, Input

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (15): schematics, type, typeSeparator, typeSeparator, typeSeparator, typeSeparator, typeSeparator, type (+7 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (10): HotelStats, InlineRoom, OtherDevice, PRAGUE_DATETIME_FORMATTER, PRAGUE_TIME_FORMATTER, AirQualityResult, AQBreakpoints, RoomData (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (3): AirQualitySensorComponent, Component, Input

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (4): SmartSocketsPanelComponent, Component, Input, Output

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (14): node_modules/jquery/dist/jquery.min.js, node_modules/jquery.terminal/js/jquery.terminal.js, node_modules/thingsboard/src/app/core/*, node_modules/thingsboard/src/environments/*, node_modules/tooltipster/dist/js/tooltipster.bundle.min.js, paths, @core/*, @env/* (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.16
Nodes (4): DashboardViewModel, ReveltonUtilityDashboardComponent, Component, Input

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (13): @angular/animations, @angular-devkit/schematics, eslint-plugin-import, ngrx-store-freeze, devDependencies, @angular/animations, @angular/common, @angular-devkit/schematics (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.23
Nodes (9): ExamplesModule, NgModule, addCustomWidgetLocale(), addLibraryStyles(), addStyleFromComponent(), LibStylesEntryComponent, Component, ThingsboardExtensionWidgetsModule (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (3): OccupancySensorComponent, Component, Input

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (12): build, serve, builder, defaultConfiguration, options, port, project, staticServeConfig (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (11): type, type, properties, port, project, staticServeConfig, tsConfig, $schema (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.24
Nodes (5): EV_CHARGER_ALL_KEYS, EV_CHARGER_IDENTIFIER_KEYS, EV_CHARGER_SESSION_KEYS, EvChargerProcessor, Injectable

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (3): ChargerStatusCardComponent, Component, Input

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (8): classes, distDir, fs, path, postcss, selectorParser, tbClassesJson, tbStylesCss

### Community 55 - "Community 55"
Cohesion: 0.20
Nodes (9): analytics, packageManager, schematicCollections, cli, newProjectRoot, projects, $schema, version (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (4): AlertsPanelComponent, Component, Input, Output

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (9): widget-extension, style, type, @schematics/angular:component, prefix, projectType, root, schematics (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (8): compilerOptions, importHelpers, module, outDir, sourceMap, target, files, ./static-serve/index.ts

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (5): OCCUPANCY_KEYS, OccupancyResult, DEFAULT_OCCUPANCY_STATS(), OccupancyProcessor, Injectable

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (7): CONNECTOR_KEY_SUFFIXES, EV_CHARGER_CURRENT_KEYS, EV_CHARGER_ENERGY_KEYS, EV_CHARGER_LOG_KEYS, EV_CHARGER_POWER_KEYS, EV_CHARGER_STATION_KEYS, EV_CHARGER_VOLTAGE_KEYS

### Community 62 - "Community 62"
Cohesion: 0.39
Nodes (7): StaticServeConfig, StaticServeOptions, createServer(), execute(), executeCliCommand(), initialize(), watchStyles()

### Community 63 - "Community 63"
Cohesion: 0.25
Nodes (7): 1. Single-Limit Sensors (Only MAX limit), 2. Dual-Limit Sensors (Both MIN and MAX limits), [Control Panel Component], [MODIFY] `control-panel.component.ts`, Open Questions, Proposed Changes, Threshold Logic Plan

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (3): OtherDevicesPanelComponent, Component, Input

### Community 65 - "Community 65"
Cohesion: 0.21
Nodes (5): ActivityLogsComponent, Component, MetricCellComponent, Component, Input

### Community 66 - "Community 66"
Cohesion: 0.39
Nodes (4): WATER_LEAK_KEYS, WaterLeakResult, Injectable, WaterLeakProcessor

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (3): Component, Input, UtilityHeaderComponent

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (7): angularCompilerOptions, enableI18nLegacyMessageIdFormat, fullTemplateTypeCheck, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): Debugging a specific red room, Important gotcha with a single "23" temperature setting, Room Card Alert / Border Color Logic, Threshold bands (not single cutoffs), What does NOT affect the border color, Where the border color comes from

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (6): Notes / anything odd, QA Checklist — Round 2: refresh performance + loading UX, SECTION E — Topology cache / refresh speed (the main goal), SECTION F — Loading skeleton, SECTION G — Connection error banner, SECTION H — Regression (quick confirm, ~1 min)

### Community 71 - "Community 71"
Cohesion: 0.38
Nodes (5): fse, path, projectRoot(), sourcePackage(), targetPackage()

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (3): NoiseSensorComponent, Component, Input

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (3): SensorTileComponent, Component, Input

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (3): Component, Input, WaterLeakSensorComponent

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (3): Component, Input, WindowSensorComponent

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (4): OccupancyStats, OccupancyPanelComponent, Component, Input

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (4): WaterLeakStats, Component, Input, WaterLeakPanelComponent

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (3): Component, Input, WindowPanelComponent

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (6): lint, builder, options, lintFilePatterns, src/**/*.html, src/**/*.ts

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (6): Control Panel Audit Report V2, Mews Gateway Lookup Bug (CP3), Mews Online Status Mocked (CP5), Noise Threshold Disconnect Bug (CP2), Room Scope Inversion Bug (CP1), Telegram Config Unreachable (CP6)

### Community 83 - "Community 83"
Cohesion: 0.47
Nodes (4): isValidPreset(), isValidSystemMode(), VALID_PRESETS, VALID_SYSTEM_MODES

### Community 84 - "Community 84"
Cohesion: 0.40
Nodes (4): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution

### Community 85 - "Community 85"
Cohesion: 0.40
Nodes (5): configurations, development, production, tsConfig, tsConfig

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (4): dest, lib, entryFile, $schema

### Community 91 - "Community 91"
Cohesion: 0.50
Nodes (3): ThermostatDevice, TrvMode, TrvPreset

### Community 93 - "Community 93"
Cohesion: 0.50
Nodes (4): Compact Env Sensor Tile Template, Env Sensor Status Dot, Compact Thermostat Tile Template, Thermostat Card Template

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (3): dom, es2020, lib

### Community 97 - "Community 97"
Cohesion: 0.67
Nodes (3): Hotel Dashboard Header Section, Hotel Dashboard Component Template, Language Selector UI

### Community 98 - "Community 98"
Cohesion: 0.67
Nodes (3): EV Charger Panel (Utility Dashboard), Utility Dashboard Component Template, Utility Header Component

## Knowledge Gaps
- **402 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `root` (+397 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RoomDetailPanelComponent` connect `Room Detail Panel UI` to `Community 153`, `Community 35`, `Community 39`, `Community 73`, `Module Exports`, `Community 54`, `Community 23`, `Community 150`, `Community 89`, `Community 92`, `Community 24`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `ControlPanelComponent` connect `Control Panel Logic` to `Module Exports`, `Community 46`, `Community 20`, `Community 87`, `Community 56`, `Community 28`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `ReveltonDashboardComponent` connect `Hotel Dashboard Component` to `Community 35`, `Community 39`, `Community 72`, `Module Exports`, `Community 50`, `Community 86`, `Community 151`, `Community 88`, `Community 24`, `Community 28`, `Community 152`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _402 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EV Charger History Modal` be split into smaller, more focused modules?**
  _Cohesion score 0.059887005649717516 - nodes in this community are weakly interconnected._
- **Should `Hotel Control Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.07239819004524888 - nodes in this community are weakly interconnected._
- **Should `Room Data Service` be split into smaller, more focused modules?**
  _Cohesion score 0.05110336817653891 - nodes in this community are weakly interconnected._