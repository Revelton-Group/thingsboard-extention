import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { WidgetContext } from "@home/models/widget-component.models";
import { MatDialog } from "@angular/material/dialog";
import { RoomDetailPanelComponent } from "./room-detail-panel.component";
import {
  RoomDataService,
  RoomData,
} from "../../core/services/room-data.service";
import { TranslationService } from "../../core/services/translation.service";
import { ThemeService } from "../../core/services/theme.service";
import { Subscription } from "rxjs";

@Component({
  selector: "tb-room-card",
  templateUrl: "./room-card.component.html",
  styleUrls: ["./room-card.component.scss"],
  standalone: false,
})
export class RoomCardComponent implements OnInit, OnDestroy {
  @Input() ctx: WidgetContext;
  @ViewChild("widgetContainer", { static: false }) widgetContainer: ElementRef;

  get t() {
    return this.translationService.t;
  }

  private refreshInterval: any;
  private themeSubs: Subscription[] = [];

  // Root data object - matches service structure
  public roomData: RoomData = {
    sensorData: {
      roomNumber: "---",
      temperature: null,
      humidity: null,
      airQuality: null,
      checkedIn: false,
      waterLeak: false,
      noise: null,
      booked: false,
      roomTitle: null,
    },
    hasData: {
      temperature: false,
      humidity: false,
      airQuality: false,
      checkedIn: false,
      waterLeak: false,
      noise: false,
      booked: false,
    },
    reservation: {
      checkIn: "",
      checkOut: "",
      guestName: "",
      reservationState: "",
      hasReservation: false,
      checkDisplay: "--",
      checkIconClass: "icon-gray",
      checkPillClass: "pill-inactive",
      bookDisplay: "--",
      bookIconClass: "icon-gray",
      bookPillClass: "pill-inactive",
      bookCellClass: "",
      checkoutRemaining: "",
      statusSummary: "",
    },
    winAgg: { total: 0, openCount: 0, anyOpen: false, display: "--" },
    trvAgg: { count: 0, avgSetPoint: 0, worstStatus: "idle", display: "--" },
    tempStatus: "normal",
    humStatus: "normal",
    airStatus: "normal",
    noiseStatus: "normal",
    roomStatus: "normal",
    alarmCount: 0,
    windowDevices: {},
    trvDevices: {},
    tempDevices: {},
    humDevices: {},
    batteryDevices: {},
    batteryLowDevices: {},
    linkQualityDevices: {},
    lastSeenDevices: {},
    offlineDevices: {},
    tamperDevices: {},
    airSensors: {},
    deviceMeta: {},
    leakDevices: {},
    noiseDevices: {},
    occupancyDevices: {},
    activeDevices: {},
    plugDevices: {},
    deviceEntityIdMap: {},
  };

  private activeDialogRef: any = null;

  constructor(
    private dialog: MatDialog,
    private roomDataService: RoomDataService,
    private translationService: TranslationService,
    private themeService: ThemeService,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    // Apply theme immediately to this widget's own element, then keep in sync.
    // This is required because room card is a standalone TB widget outside the
    // hotel dashboard's DOM tree, so the hotel dashboard's applyTheme(el) call
    // does not cascade here.
    this.themeService.applyTheme(this.el.nativeElement);
    this.themeSubs.push(
      this.themeService.theme$.subscribe(() => {
        this.themeService.applyTheme(this.el.nativeElement);
        if (this.ctx?.detectChanges) this.ctx.detectChanges();
      }),
      this.themeService.mode$.subscribe(() => {
        this.themeService.applyTheme(this.el.nativeElement);
        if (this.ctx?.detectChanges) this.ctx.detectChanges();
      })
    );

    if (this.ctx) {
      if (this.ctx.settings?.roomNumber) {
        this.roomData.sensorData.roomNumber = String(
          this.ctx.settings.roomNumber
        );
      }

      if (this.roomData.sensorData.roomNumber === "---") {
        if (this.ctx.datasources && this.ctx.datasources.length > 0) {
          const ds = this.ctx.datasources[0];
          const name = ds.entityName || ds.entityLabel || ds.name || "";
          this.roomData.sensorData.roomNumber = this.extractRoomNumber(name);
        }
      }

      this.ctx.$scope.roomCardComponent = this;

      if (this.ctx.defaultSubscription) {
        this.onDataUpdated();
      }

      this.refreshInterval = setInterval(() => {
        this.onPeriodicRefresh();
      }, 10000);
    }
  }

  private onPeriodicRefresh(): void {
    if (this.ctx.detectChanges) this.ctx.detectChanges();
    if (this.activeDialogRef?.componentInstance) {
      this.activeDialogRef.componentInstance.updateData();
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.themeSubs.forEach((s) => s.unsubscribe());
  }

  private extractRoomNumber(name: string): string {
    if (!name) return "---";
    const match2 = name.match(/_(\d+)_\d+$/);
    if (match2) return String(parseInt(match2[1], 10));
    const match1 = name.match(/_(\d+)$/);
    if (match1) return String(parseInt(match1[1], 10));
    return name;
  }

  public onWidgetClick($event: Event): void {
    if (!this.ctx) return;

    const descriptors =
      this.ctx.actionsApi?.getActionDescriptors?.("elementClick");
    if (descriptors && descriptors.length > 0) {
      const ds = this.ctx.datasources[0];
      this.ctx.actionsApi.handleWidgetAction(
        $event,
        descriptors[0],
        ds.entityId as any,
        ds.entityName || "",
        null,
        ds.entityLabel || ""
      );
      return;
    }

    this.activeDialogRef = this.dialog.open(RoomDetailPanelComponent, {
      width: "95vw",
      maxWidth: "1440px",
      height: "90vh",
      panelClass: "room-detail-dialog",
      data: {
        ...this.roomData,
        ctx: this.ctx,
      },
    });

    this.activeDialogRef.afterClosed().subscribe(() => {
      this.activeDialogRef = null;
    });
  }

  public onDataUpdated(): void {
    this.roomData = this.roomDataService.updateFromTelemetry(
      this.ctx,
      this.roomData
    );
    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }
    if (this.activeDialogRef && this.activeDialogRef.componentInstance) {
      Object.assign(this.activeDialogRef.componentInstance.data, this.roomData);
      this.activeDialogRef.componentInstance.updateData();
    }
  }

  public getAirQualityLabel(aqi: number): string {
    return this.roomDataService.getAirQualityLabel(aqi);
  }

  public static calculateAirQuality = RoomDataService.calculateAirQuality;
}
