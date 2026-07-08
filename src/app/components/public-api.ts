export * from "./examples.module";

// Hotel Dashboard
export * from "./revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component";

// Room View Components
export * from "./revelton-tb-extension-dashboard/features/room-view/room-card.component";
export * from "./revelton-tb-extension-dashboard/features/room-view/room-detail-panel.component";
export * from "./revelton-tb-extension-dashboard/features/room-view/room-historical-data.component";

// Other Devices Panel
export * from "./revelton-tb-extension-dashboard/features/other-devices-panel/other-devices-panel.component";

// Control Panel (required by NG3001)
export * from "./revelton-tb-extension-dashboard/features/control-panel/control-panel.component";

// Compact Thermostat (used in Other Devices Panel)
export * from "./revelton-tb-extension-dashboard/shared/components/compact-thermostat/compact-thermostat.component";
export * from "./revelton-tb-extension-dashboard/shared/components/compact-env-sensor/compact-env-sensor.component";

// Shared Room Components
export * from "./revelton-tb-extension-dashboard/shared/components/thermostat-card/thermostat-card.component";
export * from "./revelton-tb-extension-dashboard/shared/components/air-quality-sensor/air-quality-sensor.component";
export * from "./revelton-tb-extension-dashboard/shared/components/sensor-tile/sensor-tile.component";
export * from "./revelton-tb-extension-dashboard/shared/components/window-sensor/window-sensor.component";
export * from "./revelton-tb-extension-dashboard/shared/components/water-leak-sensor/water-leak-sensor.component";
export * from "./revelton-tb-extension-dashboard/shared/components/noise-sensor/noise-sensor.component";
export * from "./revelton-tb-extension-dashboard/shared/components/occupancy-sensor/occupancy-sensor.component";
export * from "./revelton-tb-extension-dashboard/shared/components/alerts-panel/alerts-panel.component";
export * from "./revelton-tb-extension-dashboard/shared/components/activity-logs/activity-logs.component";
export * from "./revelton-tb-extension-dashboard/shared/components/metric-cell/metric-cell.component";
export * from "./revelton-tb-extension-dashboard/shared/components/smart-sockets-panel/smart-sockets-panel.component";

// Historical Dashboard — Orchestrator + Shared
export * from "./revelton-tb-extension-historical-dashboard/revelton-tb-extension-historical-dashboard.component";
export * from "./revelton-tb-extension-historical-dashboard/shared/components/historical-chart/historical-chart.component";
export * from "./revelton-tb-extension-historical-dashboard/shared/components/historical-filter-bar/historical-filter-bar.component";
export * from "./revelton-tb-extension-historical-dashboard/shared/components/historical-summary-card/historical-summary-card.component";

// Historical Dashboard — Feature Panels (required by NG3001 — all module-visible classes must be re-exported)
export * from "./revelton-tb-extension-historical-dashboard/features/thermostat-panel/thermostat-panel.component";
export * from "./revelton-tb-extension-historical-dashboard/features/air-quality-panel/air-quality-panel.component";
export * from "./revelton-tb-extension-historical-dashboard/features/air-quality-panel/air-quality-metrics-panel.component";
export * from "./revelton-tb-extension-historical-dashboard/features/acoustics-panel/acoustics-panel.component";
export * from "./revelton-tb-extension-historical-dashboard/features/window-panel/window-panel.component";
export * from "./revelton-tb-extension-historical-dashboard/features/water-leak-panel/water-leak-panel.component";
export * from "./revelton-tb-extension-historical-dashboard/features/occupancy-panel/occupancy-panel.component";

// Utility Dashboard
export * from "./revelton-tb-extension-utility-dashboard/revelton-tb-extension-utility-dashboard.component";
export * from "./revelton-tb-extension-utility-dashboard/features/ev-charger-panel/ev-charger-panel.component";
export * from "./revelton-tb-extension-utility-dashboard/shared/components/charger-status-card/charger-status-card.component";
export * from "./revelton-tb-extension-utility-dashboard/shared/components/utility-header/utility-header.component";
export * from "./revelton-tb-extension-utility-dashboard/shared/components/ev-station-history-modal/ev-station-history-modal.component";
