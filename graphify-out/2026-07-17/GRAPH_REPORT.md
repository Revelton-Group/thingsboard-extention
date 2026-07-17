# Graph Report - thingsboard-extention  (2026-07-16)

## Corpus Check
- 128 files · ~91,678 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1552 nodes · 2628 edges · 130 communities (72 shown, 58 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ad74cac6`
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
- Community 13
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
- Community 43
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
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
- Community 65
- Community 67
- Community 69
- Community 70
- Community 71
- Community 73
- Community 74
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 84
- Community 85
- Community 86
- Community 87
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
- Community 125
- Community 126
- Room Card Alert / Border Color Logic
- QA Checklist — Round 2: refresh performance + loading UX
- water-leak-panel.component.ts
- base_instructions.md
- graphify.md
- graphify.md
- @angular/build
- MetricCellComponent
- @angular/animations
- angular-eslint

## God Nodes (most connected - your core abstractions)
1. `RoomDetailPanelComponent` - 67 edges
2. `ReveltonDashboardComponent` - 65 edges
3. `ControlPanelComponent` - 64 edges
4. `TranslationService` - 49 edges
5. `HotelStateService` - 39 edges
6. `ThermostatCardComponent` - 30 edges
7. `TimeWindow` - 30 edges
8. `ControlPanelService` - 29 edges
9. `RoomDataService` - 28 edges
10. `ThingsBoardTelemetryService` - 28 edges

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

## Communities (130 total, 58 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (3): SensorPanelResult, HistoricalStateService, Injectable

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (4): HostListener, ReveltonDashboardComponent, Component, Input

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (11): ExpandedChartDialogComponent, formatDuration(), formatTimeRange(), getBlockColor(), getBlockLabel(), normalizeBinaryValue(), processBinaryBlocks(), RoomHistoricalDataComponent (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (41): @angular-devkit/architect, builders, dependencies, @angular-devkit/architect, rxjs, typescript, description, devDependencies (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (6): createEmptyRoomData(), error(), HotelStateService, log(), Injectable, warn()

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (8): TIME_RANGE_OPTIONS, TimeRangeOption, TimeRangeKey, TimeRangeService, Injectable, Component, Input, WindowPanelComponent

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (35): chart.js, echarts, flot, flot.curvedlines, moment, dependencies, chart.js, echarts (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (6): TranslationService, TranslationSet, Injectable, Component, Input, WaterLeakSensorComponent

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (5): clampTemperature(), RoomDetailPanelComponent, Component, Input, Output

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (7): ThermostatDevice, TrvMode, TrvPreset, ThermostatCardComponent, Component, Input, Output

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (4): RoomCardComponent, Component, Input, ViewChild

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (3): ReveltonTbExtensionHistoricalDashboardComponent, Component, Input

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (15): AirQualityChartData, ChartSeries, AirQualityMetricsPanelComponent, MetricTab, Component, Input, AirQualityPanelComponent, Component (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (3): CompactThermostatComponent, Component, Input

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (6): EV_CHARGER_ALL_KEYS, EV_CHARGER_CURRENT_KEYS, EV_CHARGER_ENERGY_KEYS, EV_CHARGER_POWER_KEYS, EV_CHARGER_SESSION_KEYS, EV_CHARGER_VOLTAGE_KEYS

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (21): @angular/cdk, @angular/common, @angular/core, @angular/forms, @angular/material, @angular/router, @ngrx/store, @ngx-translate/core (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (16): AirQualityThresholdConfig, CONTROL_PANEL_SECTIONS, MewsSyncConfig, NoisePeriod, NoisePeriodThresholds, NoiseThresholdConfig, RoomScope, TelegramAlertToggles (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (18): adopt(), architect_1, child_process_1, chokidar_1, express_1, fs_1, fulfilled(), createServer() (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (19): node_modules/@types, compilerOptions, baseUrl, declaration, downlevelIteration, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.31
Nodes (3): EV_CHARGER_IDENTIFIER_KEYS, EvChargerProcessor, Injectable

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
Cohesion: 0.28
Nodes (6): EvChargerResult, IUtilityProcessor, UtilityPanelResult, ChargingStatus, DEFAULT_VIEW_MODEL(), EvChargerStats

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
Cohesion: 0.06
Nodes (44): AIR_QUALITY_IDENTIFIER_KEYS, AIR_QUALITY_KEYS, NOISE_KEYS, OCCUPANCY_KEYS, TEMPERATURE_VARIANTS, THERMOSTAT_IDENTIFIER_KEYS, THERMOSTAT_KEYS, THERMOSTAT_TIMESERIES_KEYS (+36 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (3): AirQualitySensorComponent, Component, Input

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (34): 1. Logic errors, 2. Loading section, 3. Data-updating section, 4. Unused code & duplication, 5. Fixes applied alongside this report, 6. Production-readiness gaps (not addressed in this change set), Duplication catalogue (input to the refactor), Executive summary (+26 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (3): OccupancySensorComponent, Component, Input

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (4): SmartSocketsPanelComponent, Component, Input, Output

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (13): @angular-devkit/schematics, eslint-plugin-import, eslint-plugin-jsdoc, ngrx-store-freeze, devDependencies, @angular/common, @angular-devkit/schematics, @angular/router (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.23
Nodes (9): ExamplesModule, NgModule, addCustomWidgetLocale(), addLibraryStyles(), addStyleFromComponent(), LibStylesEntryComponent, Component, ThingsboardExtensionWidgetsModule (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (3): EvStationHistoryModalComponent, Component, Inject

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
Cohesion: 0.18
Nodes (4): AlertsPanelComponent, Component, Input, Output

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (8): TIME_RANGE_LIST, FloorGroup, Room, RoomDetails, HistoricalFilterBarComponent, Component, Input, Output

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): analytics, packageManager, schematicCollections, cli, newProjectRoot, projects, $schema, version (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (15): isValidPreset(), isValidSystemMode(), VALID_PRESETS, VALID_SYSTEM_MODES, getPragueParts(), HotelStats, InlineRoom, OtherDevice (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.06
Nodes (28): Architecture, Build Chain, Commands, Data Flow, File Registration Checklist, graphify, Key Patterns, Mews PMS Integration (+20 more)

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (3): Component, Input, WaterLeakPanelComponent

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (9): widget-extension, style, type, @schematics/angular:component, prefix, projectType, root, schematics (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (8): compilerOptions, importHelpers, module, outDir, sourceMap, target, files, ./static-serve/index.ts

### Community 51 - "Community 51"
Cohesion: 0.39
Nodes (7): StaticServeConfig, StaticServeOptions, createServer(), execute(), executeCliCommand(), initialize(), watchStyles()

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (4): DashboardViewModel, ReveltonUtilityDashboardComponent, Component, Input

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (3): OtherDevicesPanelComponent, Component, Input

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (3): SensorTileComponent, Component, Input

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (9): ChargerCardViewModel, ChargerStationViewModel, EvChargerPanelComponent, Component, Input, ChargerStatusCardComponent, Component, Input (+1 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (16): 1. Development Mode (Local Testing), 2. Production Mode (Deployment), 3. Widget Integration (HTML & JS), Gateway & Data Mapping, HTML Tab, JavaScript Tab, License, Prerequisites (+8 more)

### Community 58 - "Community 58"
Cohesion: 0.09
Nodes (10): ThemeDefinition, ThemePalette, THEMES, ThemeMode, ThemeService, Injectable, HistoricalChartComponent, Component (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): angularCompilerOptions, enableI18nLegacyMessageIdFormat, fullTemplateTypeCheck, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave

### Community 60 - "Community 60"
Cohesion: 0.38
Nodes (5): fse, path, projectRoot(), sourcePackage(), targetPackage()

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (7): ControlPanelConfig, ControlPanelSection, ControlPanelSectionId, DEFAULT_CONTROL_PANEL_CONFIG, ControlPanelService, debugWarn(), Injectable

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (6): lint, builder, options, lintFilePatterns, src/**/*.html, src/**/*.ts

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (5): configurations, development, production, tsConfig, tsConfig

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (7): 1. Single-Limit Sensors (Only MAX limit), 2. Dual-Limit Sensors (Both MIN and MAX limits), [Control Panel Component], [MODIFY] `control-panel.component.ts`, Open Questions, Proposed Changes, Threshold Logic Plan

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): dest, lib, entryFile, $schema

### Community 70 - "Community 70"
Cohesion: 0.25
Nodes (3): Component, Input, WindowSensorComponent

### Community 74 - "Community 74"
Cohesion: 0.67
Nodes (3): dom, es2020, lib

### Community 87 - "Community 87"
Cohesion: 0.21
Nodes (19): DEFAULT_ROOM_DETAILS(), EMPTY_AIR_QUALITY_CHART(), AirQualityStats, DEFAULT_AIR_QUALITY_STATS(), DEFAULT_NOISE_STATS(), DEFAULT_OCCUPANCY_STATS(), DEFAULT_THERMOSTAT_STATS(), DEFAULT_WATER_LEAK_STATS() (+11 more)

### Community 127 - "Room Card Alert / Border Color Logic"
Cohesion: 0.29
Nodes (6): Debugging a specific red room, Important gotcha with a single "23" temperature setting, Room Card Alert / Border Color Logic, Threshold bands (not single cutoffs), What does NOT affect the border color, Where the border color comes from

### Community 128 - "QA Checklist — Round 2: refresh performance + loading UX"
Cohesion: 0.29
Nodes (6): Notes / anything odd, QA Checklist — Round 2: refresh performance + loading UX, SECTION E — Topology cache / refresh speed (the main goal), SECTION F — Loading skeleton, SECTION G — Connection error banner, SECTION H — Regression (quick confirm, ~1 min)

### Community 130 - "water-leak-panel.component.ts"
Cohesion: 0.25
Nodes (3): NoiseSensorComponent, Component, Input

### Community 131 - "base_instructions.md"
Cohesion: 0.40
Nodes (4): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution

### Community 139 - "MetricCellComponent"
Cohesion: 0.09
Nodes (16): HISTORICAL_FEATURE_PANELS, UTILITY_FEATURES, ActivityLogsComponent, Component, MetricCellComponent, Component, Input, SparklineComponent (+8 more)

## Knowledge Gaps
- **376 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `root` (+371 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ControlPanelComponent` connect `Community 4` to `water-leak-panel.component.ts`, `MetricCellComponent`, `Community 44`, `Community 58`, `Community 62`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `ReveltonDashboardComponent` connect `Community 1` to `Community 5`, `MetricCellComponent`, `Community 13`, `Community 46`, `Community 58`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `RoomDetailPanelComponent` connect `Community 10` to `Community 5`, `MetricCellComponent`, `Community 13`, `Community 46`, `Community 57`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05200501253132832 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05110336817653891 - nodes in this community are weakly interconnected._