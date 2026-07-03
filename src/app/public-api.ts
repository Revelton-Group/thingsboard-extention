///
/// Copyright © 2023 ThingsBoard, Inc.
///

export * from "./components/public-api";

// Explicitly export room classes to satisfy the library compiler
export { RoomCardComponent } from "./components/revelton-tb-extension-dashboard/features/room-view/room-card.component";
export { RoomDetailPanelComponent } from "./components/revelton-tb-extension-dashboard/features/room-view/room-detail-panel.component";
export { ReveltonDashboardComponent } from "./components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component";
export { CompactEnvSensorComponent } from "./components/revelton-tb-extension-dashboard/shared/components/compact-env-sensor/compact-env-sensor.component";
export { HistoricalSummaryCardComponent } from "./components/revelton-tb-extension-historical-dashboard/shared/components/historical-summary-card/historical-summary-card.component";
export { HistoricalFilterBarComponent } from "./components/revelton-tb-extension-historical-dashboard/shared/components/historical-filter-bar/historical-filter-bar.component";
export { HistoricalChartComponent } from "./components/revelton-tb-extension-historical-dashboard/shared/components/historical-chart/historical-chart.component";
export { AirQualityMetricsPanelComponent } from "./components/revelton-tb-extension-historical-dashboard/features/air-quality-panel/air-quality-metrics-panel.component";

export { SparklineComponent } from "./components/revelton-tb-extension-dashboard/shared/components/sparkline/sparkline.component";

// Utility Dashboard (required by NG3001)
export { ReveltonUtilityDashboardComponent } from "./components/revelton-tb-extension-utility-dashboard/revelton-tb-extension-utility-dashboard.component";
export { EvChargerPanelComponent } from "./components/revelton-tb-extension-utility-dashboard/features/ev-charger-panel/ev-charger-panel.component";
export { ChargerStatusCardComponent } from "./components/revelton-tb-extension-utility-dashboard/shared/components/charger-status-card/charger-status-card.component";
export { UtilityHeaderComponent } from "./components/revelton-tb-extension-utility-dashboard/shared/components/utility-header/utility-header.component";

export * from "./thingsboard-extension-widgets.module";
