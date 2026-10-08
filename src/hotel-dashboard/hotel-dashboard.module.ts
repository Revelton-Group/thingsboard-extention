import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SharedModule } from "@shared/public-api";
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule,
} from "@home/components/public-api";
import { HistoricalChartComponent } from "./shared/components/historical-chart/historical-chart.component";

import { RoomCardComponent } from "./features/room-view/room-card.component";
import { RoomDetailPanelComponent } from "./features/room-view/room-detail-panel.component";
import {
  RoomHistoricalDataComponent,
  ExpandedChartDialogComponent,
} from "./features/room-view/room-historical-data.component";
import { ThermostatCardComponent } from "./shared/components/thermostat-card/thermostat-card.component";
import { AlertsPanelComponent } from "./shared/components/alerts-panel/alerts-panel.component";
import { RoomCardViewComponent } from "./shared/components/room-card-view/room-card-view.component";
import { SmartSocketsPanelComponent } from "./shared/components/smart-sockets-panel/smart-sockets-panel.component";
import { ReveltonDashboardComponent } from "./features/hotel-dashboard/revelton-hotel.component";
import { OtherDevicesPanelComponent } from "./features/other-devices-panel/other-devices-panel.component";
import { CompactThermostatComponent } from "./shared/components/compact-thermostat/compact-thermostat.component";
import { CompactEnvSensorComponent } from "./shared/components/compact-env-sensor/compact-env-sensor.component";
import { ControlPanelComponent } from "./features/control-panel/control-panel.component";

const HOTEL_COMPONENTS = [
  RoomCardComponent,
  RoomDetailPanelComponent,
  RoomHistoricalDataComponent,
  ExpandedChartDialogComponent,
  ThermostatCardComponent,
  AlertsPanelComponent,
  RoomCardViewComponent,
  SmartSocketsPanelComponent,
  ReveltonDashboardComponent,
  OtherDevicesPanelComponent,
  CompactThermostatComponent,
  CompactEnvSensorComponent,
  ControlPanelComponent,
  HistoricalChartComponent,
];

@NgModule({
  declarations: [...HOTEL_COMPONENTS],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule,
  ],
  exports: [...HOTEL_COMPONENTS],
})
export class HotelDashboardModule {}
