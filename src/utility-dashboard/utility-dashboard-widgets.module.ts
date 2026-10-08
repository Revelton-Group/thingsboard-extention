import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UtilityDashboardModule } from "./utility-dashboard.module";

@NgModule({
  declarations: [],
  imports: [CommonModule, UtilityDashboardModule],
  exports: [UtilityDashboardModule],
})
export class UtilityDashboardWidgetsModule {}
