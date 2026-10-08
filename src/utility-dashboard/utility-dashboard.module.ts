import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SharedModule } from "@shared/public-api";
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule,
} from "@home/components/public-api";

// Orchestrator
import { ReveltonUtilityDashboardComponent } from "./revelton-tb-extension-utility-dashboard.component";

// Shared Components
import { UtilityHeaderComponent } from "./shared/components/utility-header/utility-header.component";
import { ChargerStatusCardComponent } from "./shared/components/charger-status-card/charger-status-card.component";
import { EvStationHistoryModalComponent } from "./shared/components/ev-station-history-modal/ev-station-history-modal.component";

// Feature Panels
import { EvChargerPanelComponent } from "./features/ev-charger-panel/ev-charger-panel.component";

const UTILITY_COMPONENTS = [
  ReveltonUtilityDashboardComponent,
  EvChargerPanelComponent,
  ChargerStatusCardComponent,
  UtilityHeaderComponent,
  EvStationHistoryModalComponent,
];

@NgModule({
  declarations: [...UTILITY_COMPONENTS],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule,
  ],
  exports: [...UTILITY_COMPONENTS],
})
export class UtilityDashboardModule {}
