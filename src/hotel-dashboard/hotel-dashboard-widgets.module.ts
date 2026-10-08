import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HotelDashboardModule } from "./hotel-dashboard.module";

@NgModule({
  declarations: [],
  imports: [CommonModule, HotelDashboardModule],
  exports: [HotelDashboardModule],
})
export class HotelDashboardWidgetsModule {}
