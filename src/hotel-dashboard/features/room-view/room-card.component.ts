import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewContainerRef,
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
import { HotelStateService } from "../../core/services/hotel-state.service";
import { ControlPanelService } from "../control-panel/services/control-panel.service";
import { Subscription } from "rxjs";

@Component({
  selector: "tb-room-card",
  templateUrl: "./room-card.component.html",
  styleUrls: ["./room-card.component.scss"],
  providers: [ControlPanelService, RoomDataService, HotelStateService],
  standalone: false,
})
export class RoomCardComponent implements OnInit, OnDestroy {
  @Input() ctx: WidgetContext;

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
    lastSeenRaw: {},
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
  private detachTheme: (() => void) | null = null;

  constructor(
    private dialog: MatDialog,
    private roomDataService: RoomDataService,
    private translationService: TranslationService,
    private themeService: ThemeService,
    private controlPanelService: ControlPanelService,
    private viewContainerRef: ViewContainerRef,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    // Apply theme immediately to this widget's own element, then keep in sync.
    // This is required because room card is a standalone TB widget outside the
    // hotel dashboard's DOM tree, so the hotel dashboard's applyTheme(el) call
    // does not cascade here.
    this.detachTheme = this.themeService.attach(this.el.nativeElement);
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

      this.controlPanelService.setCtx(this.ctx);
      this.controlPanelService.loadFromThingsBoard();

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
    this.detachTheme?.();
    this.activeDialogRef?.close();
  }

  private extractRoomNumber(name: string): string {
    if (!name) return "---";
    // Milesight naming: RST-KLV-<MODEL>-<inventory no>-<room no>, e.g. RST-KLV-WS301-026-3 → 3
    const matchMilesight = name.match(/^[A-Za-z]+-[A-Za-z]+-[A-Za-z]+\d+[A-Za-z]*-\d+-(\d+)$/);
    if (matchMilesight) return String(parseInt(matchMilesight[1], 10));
    const match2 = name.match(/_(\d+)_\d+$/);
    if (match2) return String(parseInt(match2[1], 10));
    const match1 = name.match(/_(\d+)$/);
    if (match1) return String(parseInt(match1[1], 10));
    const matchRoom = name.match(/Room\s*(\d+)/i);
    if (matchRoom) return String(parseInt(matchRoom[1], 10));
    const matchAnyNum = name.match(/(?:^|[\s\-_])(\d{1,4})(?:[\s\-_]|$)/);
    if (matchAnyNum) return String(parseInt(matchAnyNum[1], 10));
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
      viewContainerRef: this.viewContainerRef,
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
    const assetDs = (this.ctx.datasources || []).find(
      (ds: any) => ds && ds.entityType === "ASSET"
    );
    if (assetDs?.entityLabel && assetDs.entityLabel !== assetDs.entityName) {
      this.roomData.sensorData.roomTitle = assetDs.entityLabel;
    }
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
