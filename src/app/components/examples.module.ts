import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SharedModule } from "@shared/public-api";
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule,
} from "@home/components/public-api";
import { RoomCardComponent } from "./revelton-tb-extension-dashboard/features/room-view/room-card.component";
import { RoomDetailPanelComponent } from "./revelton-tb-extension-dashboard/features/room-view/room-detail-panel.component";
import { RoomHistoricalDataComponent } from "./revelton-tb-extension-dashboard/features/room-view/room-historical-data.component";
import { ThermostatCardComponent } from "./revelton-tb-extension-dashboard/shared/components/thermostat-card/thermostat-card.component";
import { AirQualitySensorComponent } from "./revelton-tb-extension-dashboard/shared/components/air-quality-sensor/air-quality-sensor.component";
import { SensorTileComponent } from "./revelton-tb-extension-dashboard/shared/components/sensor-tile/sensor-tile.component";
import { WindowSensorComponent } from "./revelton-tb-extension-dashboard/shared/components/window-sensor/window-sensor.component";
import { WaterLeakSensorComponent } from "./revelton-tb-extension-dashboard/shared/components/water-leak-sensor/water-leak-sensor.component";
import { NoiseSensorComponent } from "./revelton-tb-extension-dashboard/shared/components/noise-sensor/noise-sensor.component";
import { OccupancySensorComponent } from "./revelton-tb-extension-dashboard/shared/components/occupancy-sensor/occupancy-sensor.component";
import { AlertsPanelComponent } from "./revelton-tb-extension-dashboard/shared/components/alerts-panel/alerts-panel.component";
import { ActivityLogsComponent } from "./revelton-tb-extension-dashboard/shared/components/activity-logs/activity-logs.component";
import { MetricCellComponent } from "./revelton-tb-extension-dashboard/shared/components/metric-cell/metric-cell.component";
import { ReveltonDashboardComponent } from "./revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component";
import { OtherDevicesPanelComponent } from "./revelton-tb-extension-dashboard/features/other-devices-panel/other-devices-panel.component";
import { CompactThermostatComponent } from "./revelton-tb-extension-dashboard/shared/components/compact-thermostat/compact-thermostat.component";
import { CompactEnvSensorComponent } from "./revelton-tb-extension-dashboard/shared/components/compact-env-sensor/compact-env-sensor.component";
import { ControlPanelComponent } from "./revelton-tb-extension-dashboard/features/control-panel/control-panel.component";
import { SparklineComponent } from "./revelton-tb-extension-dashboard/shared/components/sparkline/sparkline.component";

// Historical Dashboard — Orchestrator
import { ReveltonTbExtensionHistoricalDashboardComponent } from "./revelton-tb-extension-historical-dashboard/revelton-tb-extension-historical-dashboard.component";

// Historical Dashboard — Shared UI Components
import { HistoricalSummaryCardComponent } from "./revelton-tb-extension-historical-dashboard/shared/components/historical-summary-card/historical-summary-card.component";
import { HistoricalFilterBarComponent } from "./revelton-tb-extension-historical-dashboard/shared/components/historical-filter-bar/historical-filter-bar.component";
import { HistoricalChartComponent } from "./revelton-tb-extension-historical-dashboard/shared/components/historical-chart/historical-chart.component";

// Historical Dashboard — Feature Panel Components (clean architecture)
import { ThermostatPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/thermostat-panel/thermostat-panel.component";
import { AirQualityPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/air-quality-panel/air-quality-panel.component";
import { AirQualityMetricsPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/air-quality-panel/air-quality-metrics-panel.component";
import { AcousticsPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/acoustics-panel/acoustics-panel.component";
import { WindowPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/window-panel/window-panel.component";
import { WaterLeakPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/water-leak-panel/water-leak-panel.component";
import { OccupancyPanelComponent } from "./revelton-tb-extension-historical-dashboard/features/occupancy-panel/occupancy-panel.component";

// Utility Dashboard — Orchestrator
import { ReveltonUtilityDashboardComponent } from "./revelton-tb-extension-utility-dashboard/revelton-tb-extension-utility-dashboard.component";

// Utility Dashboard — Shared Components
import { UtilityHeaderComponent } from "./revelton-tb-extension-utility-dashboard/shared/components/utility-header/utility-header.component";
import { ChargerStatusCardComponent } from "./revelton-tb-extension-utility-dashboard/shared/components/charger-status-card/charger-status-card.component";

// Utility Dashboard — Feature Panels
import { EvChargerPanelComponent } from "./revelton-tb-extension-utility-dashboard/features/ev-charger-panel/ev-charger-panel.component";
import { EvStationHistoryModalComponent } from "./revelton-tb-extension-utility-dashboard/shared/components/ev-station-history-modal/ev-station-history-modal.component";

const HISTORICAL_FEATURE_PANELS = [
  ThermostatPanelComponent,
  AirQualityPanelComponent,
  AirQualityMetricsPanelComponent,
  AcousticsPanelComponent,
  WindowPanelComponent,
  WaterLeakPanelComponent,
  OccupancyPanelComponent,
];

const UTILITY_FEATURES = [
  EvChargerPanelComponent,
  ChargerStatusCardComponent,
  UtilityHeaderComponent,
  EvStationHistoryModalComponent,
];

@NgModule({
  declarations: [
    RoomCardComponent,
    RoomDetailPanelComponent,
    RoomHistoricalDataComponent,
    ThermostatCardComponent,
    AirQualitySensorComponent,
    SensorTileComponent,
    WindowSensorComponent,
    WaterLeakSensorComponent,
    NoiseSensorComponent,
    OccupancySensorComponent,
    AlertsPanelComponent,
    ActivityLogsComponent,
    MetricCellComponent,
    ReveltonDashboardComponent,
    OtherDevicesPanelComponent,
    CompactThermostatComponent,
    CompactEnvSensorComponent,
    ControlPanelComponent,
    SparklineComponent,
    // Historical dashboard
    ReveltonTbExtensionHistoricalDashboardComponent,
    HistoricalSummaryCardComponent,
    HistoricalFilterBarComponent,
    HistoricalChartComponent,
    ...HISTORICAL_FEATURE_PANELS,
    // Utility dashboard
    ReveltonUtilityDashboardComponent,
    ...UTILITY_FEATURES,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule,
  ],
  exports: [
    RoomCardComponent,
    RoomDetailPanelComponent,
    RoomHistoricalDataComponent,
    ThermostatCardComponent,
    AirQualitySensorComponent,
    SensorTileComponent,
    WindowSensorComponent,
    WaterLeakSensorComponent,
    NoiseSensorComponent,
    OccupancySensorComponent,
    AlertsPanelComponent,
    ActivityLogsComponent,
    MetricCellComponent,
    ReveltonDashboardComponent,
    OtherDevicesPanelComponent,
    CompactThermostatComponent,
    CompactEnvSensorComponent,
    ControlPanelComponent,
    SparklineComponent,
    // Historical dashboard
    ReveltonTbExtensionHistoricalDashboardComponent,
    HistoricalSummaryCardComponent,
    HistoricalFilterBarComponent,
    HistoricalChartComponent,
    ...HISTORICAL_FEATURE_PANELS,
    // Utility dashboard
    ReveltonUtilityDashboardComponent,
    ...UTILITY_FEATURES,
  ],
})
export class ExamplesModule {}
