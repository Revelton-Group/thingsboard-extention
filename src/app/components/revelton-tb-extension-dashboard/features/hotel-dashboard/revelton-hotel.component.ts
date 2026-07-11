import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
} from "@angular/core";
import { WidgetContext } from "@home/models/widget-component.models";
import { MatDialog } from "@angular/material/dialog";
import { RoomDetailPanelComponent } from "../room-view/room-detail-panel.component";
import { RoomDataService } from "../../core/services/room-data.service";
import {
  HotelStateService,
  InlineRoom,
  HotelStats,
  OtherDevice,
} from "../../core/services/hotel-state.service";
import { ThemeService } from "../../core/services/theme.service";
import { Subscription } from "rxjs";
import { TranslationService } from "../../core/services/translation.service";
import { ControlPanelService } from "../control-panel/services/control-panel.service";
import { HOTEL_TIMEZONE, HOTEL_LATITUDE, HOTEL_LONGITUDE } from "../../core/models/dashboard.config";

@Component({
  selector: "tb-revelton-dashboard",
  templateUrl: "./revelton-hotel.component.html",
  styleUrls: ["./revelton-hotel.component.scss"],
  standalone: false,
})
export class ReveltonDashboardComponent implements OnInit, OnDestroy {
  @Input()
  ctx: WidgetContext;

  /* ──── Branding (from settings) ──── */
  hotelNameFirstPart: string = "Revelton";
  hotelNameLastPart: string = "Studios";
  hotelLocation: string = "Jaltská 9, 360 01 Karlovy Vary 1, Czechia";

  rooms: InlineRoom[] = [];
  timeRangeHours: number | 'custom' = 24;
  hotelStats: HotelStats = {
    totalRooms: 0,
    totalDevices: 0,
    batteryAlerts: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    roomsBooked: 0,
    roomsVacant: 0,
    mewsStatus: "UNKNOWN",
    mewsRoomsSynced: 0,
    mewsAlertActive: false,
    mewsErrorMessage: "",
    mewsLastActivity: "",
    batteryAlertDevices: [],
    occupancyPercent: 0,
    checkInsToday: 0,
    checkOutsToday: 0,
    inHouseGuests: 0,
    checkInsList: [],
    checkOutsList: [],
    otherDevicesCount: 0,
  };

  /* ──── UI toggle state (stays in the component — purely view-level) ──── */
  showBatteryAlertsList = false;
  showCheckInsList = false;
  showCheckOutsList = false;
  showMewsList = false;
  showCustomPicker = false;
  selectedRoom: InlineRoom | null = null;
  selectedHistoricalRoom: InlineRoom | null = null;
  customStart: string = '';
  customEnd: string = '';
  appliedCustomStart: string = '';
  appliedCustomEnd: string = '';

  get hasCustomRangeChanged(): boolean {
    const startTs = this.parseDateStr(this.customStart);
    const endTs = this.parseDateStr(this.customEnd);
    if (!startTs || !endTs || startTs >= endTs) return false;
    return this.customStart !== this.appliedCustomStart || this.customEnd !== this.appliedCustomEnd;
  }

  formatDateStr(d: Date): string {
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  parseDateStr(str: string): number {
    const parts = (str || '').split(/[-\s/:]+/);
    if (parts.length >= 5) {
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[0], 10);
      const h = parseInt(parts[3], 10);
      const min = parseInt(parts[4], 10);
      if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h) || isNaN(min)) return 0;
      return new Date(y, m, d, h, min).getTime();
    }
    return 0;
  }

  get customStartTs(): number | undefined {
    return this.timeRangeHours === 'custom' && this.appliedCustomStart ? this.parseDateStr(this.appliedCustomStart) : undefined;
  }

  get customEndTs(): number | undefined {
    return this.timeRangeHours === 'custom' && this.appliedCustomEnd ? this.parseDateStr(this.appliedCustomEnd) : undefined;
  }

  otherDevices: OtherDevice[] = [];
  groupedOtherDevices: { [type: string]: OtherDevice[] } = {};

  /* ──── Header UI state ──── */
  currentTimeStr: string = "";
  currentWeather = { temp: "--°C", condition: "Loading...", icon: "cloud" };

  /* ──── Theme (bound from ThemeService) ──── */
  activeTheme = { name: "Midnight", color: "#818cf8", mode: "Dark" };
  activePalette: any = null;

  /* ──── Intervals ──── */
  private refreshInterval: any;
  private timeInterval: any;
  private weatherInterval: any;
  private subs: Subscription[] = [];

  /* ──── Multi-language support ──── */
  get activeLang() {
    return this.translationService.languagesList.find(
      (l) => l.code === this.translationService.activeLangCode
    );
  }
  showLangDropdown = false;
  languages = this.translationService.languagesList;

  get t() {
    return this.translationService.t;
  }

  /** Cache: room titles are stable strings but formatRoomTitle is bound 3× per
   *  room in the template and re-ran on every change-detection cycle. */
  private _roomTitleCache = new Map<string, string>();

  formatRoomTitle(title: string | null): string {
    if (!title) return ""; // Empty header if no title
    const cached = this._roomTitleCache.get(title);
    if (cached !== undefined) return cached;
    const result = this.computeRoomTitle(title);
    this._roomTitleCache.set(title, result);
    return result;
  }

  private computeRoomTitle(title: string): string {
    const cleanTitle = title.trim();
    const lowerTitle = cleanTitle.toLowerCase();

    if (
      lowerTitle === "room" ||
      lowerTitle === "номер" ||
      lowerTitle === "комната"
    ) {
      return ""; // Empty header, rely on the corner pin
    }

    const words = cleanTitle.split(/\s+/);

    // Strip "Room" prefix if present
    if (
      words[0].toLowerCase() === "room" ||
      words[0].toLowerCase() === "номер" ||
      words[0].toLowerCase() === "комната"
    ) {
      words.shift();
    }

    if (words.length === 0) return "";
    if (words.length === 1) return words[0];

    let result = words.join(" ");

    // If the title is long, abbreviate only the last word to 2 letters
    if (result.length > 22) {
      const lastWord = words[words.length - 1];
      const chars = lastWord.substring(0, 2);
      const abbrLastWord =
        chars.charAt(0).toUpperCase() +
        (chars.length > 1 ? chars.charAt(1).toLowerCase() : "") +
        ".";
      words[words.length - 1] = abbrLastWord;
      result = words.join(" ");
    }

    return result;
  }

  constructor(
    private cd: ChangeDetectorRef,
    private dialog: MatDialog,
    private roomDataService: RoomDataService,
    private hotelState: HotelStateService,
    private themeService: ThemeService,
    private el: ElementRef,
    private translationService: TranslationService,
    private controlPanelService: ControlPanelService
  ) {}

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    // Close all dropdowns when clicking anywhere else
    this.closeAllDropdowns();
  }

  @HostListener("document:keydown.escape", ["$event"])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.selectedHistoricalRoom) {
      this.closeHistoricalData();
    }
  }

  private closeAllDropdowns(): void {
    this.showLangDropdown = false;
    this.showBatteryAlertsList = false;
    this.showCheckInsList = false;
    this.showCheckOutsList = false;
    this.showMewsList = false;
    this.cd.detectChanges();
  }

  openControlPanel(): void {
    this.controlPanelService.open();
  }

  ngOnInit(): void {
    this.updateSettings();

    // Subscribe to HotelStateService
    this.subs.push(
      this.hotelState.rooms$.subscribe((rooms) => {
        this.rooms = rooms;
        // Keep the historical overlay's device arrays in sync when telemetry
        // updates arrive while it is open.
        this.refreshHistoricalArrays();
        this.cd.detectChanges();
      }),
      this.hotelState.hotelStats$.subscribe((stats) => {
        this.hotelStats = stats;
        this.cd.detectChanges();
      }),
      this.hotelState.otherDevices$.subscribe((devices) => {
        this.otherDevices = devices;
        this.groupDevices();
        this.cd.detectChanges();
      }),
      this.hotelState.selectedHistoricalRoom$.subscribe((room) => {
        this.selectedHistoricalRoom = room;
        this.refreshHistoricalArrays();
        this.cd.detectChanges();
      })
    );

    // Subscribe to ThemeService
    this.subs.push(
      this.themeService.theme$.subscribe((theme) => {
        this.activeTheme = {
          ...this.activeTheme,
          name: theme.name,
          color: theme.swatch,
        };
        this.updateTheme();
      }),
      this.themeService.mode$.subscribe((mode) => {
        this.activeTheme = {
          ...this.activeTheme,
          mode: mode === "dark" ? "Dark" : "Light",
        };
        this.updateTheme();
      })
    );

    // Time & Weather
    this.updateTime();
    this.fetchWeather();
    this.timeInterval = setInterval(() => this.updateTime(), 60000);
    this.weatherInterval = setInterval(
      () => this.fetchWeather(),
      30 * 60 * 1000
    );

    if (this.ctx) {
      this.ctx.$scope.reveltonHotelComponent = this;

      // Provide widget context to ControlPanelService for ThingsBoard REST API access
      this.controlPanelService.setCtx(this.ctx);
      this.controlPanelService.loadFromThingsBoard();

      // Trigger backend device discovery (relation-based)
      this.hotelState.discoverDevices(this.ctx);

      if (this.ctx.defaultSubscription) {
        this.onDataUpdated();
      }

      this.refreshInterval = setInterval(() => {
        this.onPeriodicRefresh();
      }, 10000);
    }

    // React to language changes
    this.subs.push(
      this.translationService.activeLangCode$.subscribe(() => {
        this.updateTime();
        // Only the label needs re-mapping — no need to re-hit the weather API.
        this.remapWeatherLabel();
        // Force an immediate re-evaluation of all room strings with the new language
        if (this.ctx && this.ctx.data) {
          this.onDataUpdated();
        }
      })
    );
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.weatherInterval) clearInterval(this.weatherInterval);
    this.subs.forEach((s) => s.unsubscribe());
  }

  private onPeriodicRefresh(): void {
    // Skip forced change detection while the tab is backgrounded — nothing is
    // visible and the telemetry stream will refresh the view when it returns.
    if (typeof document !== "undefined" && document.hidden) return;
    if (this.ctx.detectChanges) this.ctx.detectChanges();
    for (const room of this.rooms) {
      if (room.activeDialogRef?.componentInstance) {
        room.activeDialogRef.componentInstance.updateData();
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────
     onDataUpdated() — Smart Container delegates to HotelStateService
     ────────────────────────────────────────────────────────────── */
  public updateSettings(): void {
    const settings = this.ctx?.settings;
    const fullName = settings?.hotelName || "Revelton Studios";

    // Split into balanced parts (half and half for longer names)
    const words = fullName.trim().split(/\s+/);
    const totalWords = words.length;

    if (totalWords > 1) {
      const splitIndex = Math.ceil(totalWords / 2);
      this.hotelNameFirstPart = words.slice(0, splitIndex).join(" ");
      this.hotelNameLastPart = words.slice(splitIndex).join(" ");
    } else {
      this.hotelNameFirstPart = fullName;
      this.hotelNameLastPart = "";
    }

    this.hotelLocation =
      settings?.hotelLocation ||
      settings?.hotellLocation ||
      "Jaltská 9, 360 01 Karlovy Vary 1, Czechia";

    this.cd.detectChanges();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.el.nativeElement.requestFullscreen().catch((err) => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  toggleLangDropdown(event: Event): void {
    event.stopPropagation();
    const currentState = this.showLangDropdown;
    this.closeAllDropdowns();
    this.showLangDropdown = !currentState;
  }

  selectLang(lang: any, event: Event): void {
    event.stopPropagation();
    this.translationService.setLanguage(lang.code);
    this.showLangDropdown = false;
    this.cd.detectChanges();
  }

  onDataUpdated(): void {
    if (this.ctx && this.ctx.data) {
      // Delegate all data parsing + stat calculation to the service
      const rooms = this.hotelState.processDataUpdate(this.ctx);

      // Sync dialog instances (view-level concern)
      setTimeout(() => {
        for (const room of rooms) {
          if (room.activeDialogRef && room.activeDialogRef.componentInstance) {
            Object.assign(
              room.activeDialogRef.componentInstance.data,
              room.roomData
            );
            room.activeDialogRef.componentInstance.updateData();
          }
        }
        this.cd.detectChanges();
      }, 0);

      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
    }
  }

  /* ──── UI Toggle Handlers (view-level) ──── */

  toggleBatteryAlerts(event: Event): void {
    event.stopPropagation();
    if (this.hotelStats.batteryAlerts > 0) {
      const currentState = this.showBatteryAlertsList;
      this.closeAllDropdowns();
      this.showBatteryAlertsList = !currentState;
    }
  }

  closeBatteryAlerts(event: Event): void {
    if (event) event.stopPropagation();
    this.showBatteryAlertsList = false;
    this.cd.detectChanges();
  }

  toggleCheckInsList(event: Event): void {
    event.stopPropagation();
    if (this.hotelStats.checkInsToday > 0) {
      const currentState = this.showCheckInsList;
      this.closeAllDropdowns();
      this.showCheckInsList = !currentState;
    }
  }

  closeCheckInsList(event: Event): void {
    if (event) event.stopPropagation();
    this.showCheckInsList = false;
    this.cd.detectChanges();
  }

  toggleCheckOutsList(event: Event): void {
    event.stopPropagation();
    if (this.hotelStats.checkOutsToday > 0) {
      const currentState = this.showCheckOutsList;
      this.closeAllDropdowns();
      this.showCheckOutsList = !currentState;
    }
  }

  closeCheckOutsList(event: Event): void {
    if (event) event.stopPropagation();
    this.showCheckOutsList = false;
    this.cd.detectChanges();
  }

  toggleMewsList(event: Event): void {
    event.stopPropagation();
    const currentState = this.showMewsList;
    this.closeAllDropdowns();
    this.showMewsList = !currentState;
  }

  closeMewsList(event: Event): void {
    if (event) event.stopPropagation();
    this.showMewsList = false;
    this.cd.detectChanges();
  }

  private updateTheme(): void {
    const theme = this.themeService.themes.find(
      (t) => t.name === this.activeTheme.name
    );
    if (theme) {
      this.activePalette =
        this.activeTheme.mode === "Dark" ? theme.dark : theme.light;
      this.themeService.applyTheme(this.el.nativeElement);
      this.cd.detectChanges();
    }
  }

  /* ──── Time & Weather (view-level) ──── */

  /** Cached DateTimeFormat per language — construction is expensive and
   *  updateTime runs every 60s (and on every language switch). */
  private _timeFormatters: { [lang: string]: Intl.DateTimeFormat } = {};

  private getTimeFormatter(lang: string): Intl.DateTimeFormat {
    if (!this._timeFormatters[lang]) {
      this._timeFormatters[lang] = new Intl.DateTimeFormat(lang, {
        timeZone: HOTEL_TIMEZONE,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      });
    }
    return this._timeFormatters[lang];
  }

  updateTime(): void {
    const now = new Date();

    const lang =
      this.translationService.activeLangCode === "RU" ? "ru-RU" : "en-GB";
    const formatter = this.getTimeFormatter(lang);

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";

    const weekday = getPart("weekday");
    const day = getPart("day");
    const month = getPart("month");
    const hour = getPart("hour");
    const minute = getPart("minute");
    const tzName = getPart("timeZoneName");

    // Format: "Tue 21 Apr • 15:48 CEST"
    this.currentTimeStr = `${weekday} ${day} ${month} • ${hour}:${minute} ${tzName}`;
    this.cd.detectChanges();
  }

  /** Last raw weather reading — kept so a language switch can re-map the
   *  condition label locally instead of re-hitting the network. */
  private _lastWeather: { temp: string; code: number; isDay: boolean } | null = null;

  fetchWeather(): void {
    // Open-Meteo API
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${HOTEL_LATITUDE}&longitude=${HOTEL_LONGITUDE}&current_weather=true`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature) + "°C";
          const code = data.current_weather.weathercode;
          const isDay = data.current_weather.is_day === 1;
          this._lastWeather = { temp, code, isDay };
          const { condition, icon } = this.mapWeatherCode(code, isDay);
          this.currentWeather = { temp, condition, icon };
          this.cd.detectChanges();
        }
      })
      .catch((err) => console.error("Failed to fetch weather", err));
  }

  /** Re-map the cached weather to the active language without a network call. */
  private remapWeatherLabel(): void {
    if (!this._lastWeather) return;
    const { temp, code, isDay } = this._lastWeather;
    const { condition, icon } = this.mapWeatherCode(code, isDay);
    this.currentWeather = { temp, condition, icon };
    this.cd.detectChanges();
  }

  mapWeatherCode(
    code: number,
    isDay: boolean
  ): { condition: string; icon: string } {
    if (code === 0)
      return {
        condition: this.t.clear,
        icon: isDay ? "wb_sunny" : "brightness_2",
      };
    if (code === 1 || code === 2)
      return {
        condition: this.t.partlyCloudy,
        icon: isDay ? "cloud_queue" : "cloud_queue",
      };
    if (code === 3) return { condition: this.t.overcast, icon: "cloud" };
    if (code === 45 || code === 48)
      return { condition: this.t.fog, icon: "blur_on" };
    if (code >= 51 && code <= 55)
      return { condition: this.t.drizzle, icon: "grain" };
    if (code >= 61 && code <= 65)
      return { condition: this.t.rain, icon: "opacity" };
    if (code >= 71 && code <= 75)
      return { condition: this.t.snow, icon: "ac_unit" };
    if (code >= 80 && code <= 82)
      return { condition: this.t.showers, icon: "opacity" };
    if (code >= 95) return { condition: this.t.thunderstorm, icon: "flash_on" };
    return { condition: this.t.unknown, icon: "cloud" };
  }

  /* ──── Theme Controls (wired to ThemeService) ──── */

  toggleThemeMode(event: Event): void {
    event.stopPropagation();
    this.themeService.toggleMode();
  }

  /* ──── Room Click ──── */

  onRoomClick($event: Event, room: InlineRoom): void {
    if (!this.ctx) return;

    const descriptors =
      this.ctx.actionsApi?.getActionDescriptors?.("elementClick");
    if (descriptors && descriptors.length > 0) {
      const ds = room.mockCtx.datasources[0];
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

    // Use inline display instead of dialog
    this.selectedRoom = room;
    this.cd.detectChanges();
  }

  closeRoomDetail(): void {
    this.selectedRoom = null;
    this.cd.detectChanges();
  }



  closeHistoricalData(): void {
    this.hotelState.closeHistoricalData();
  }

  /** Cache keyed on the roomData reference (RoomDataService returns a fresh
   *  object per update) so the [data] binding is stable within a CD cycle
   *  instead of churning the child dialog's ngOnChanges every cycle. */
  private _selectedRoomDataCache: any = null;
  private _selectedRoomDataKey: any = null;

  getSelectedRoomData(): any {
    if (!this.selectedRoom) return null;
    const rd = this.selectedRoom.roomData;
    if (this._selectedRoomDataKey === rd) return this._selectedRoomDataCache;
    this._selectedRoomDataKey = rd;
    this._selectedRoomDataCache = { ...rd, ctx: this.selectedRoom.mockCtx };
    return this._selectedRoomDataCache;
  }

  getAirQualityLabel(aqi: number): string {
    return this.roomDataService.getAirQualityLabel(aqi);
  }

  getBatteryDeviceIcon(type: string): string {
    const icons: Record<string, string> = {
      'Window Sensor': 'window',
      'Thermostat': 'local_fire_department',
      'Leak Sensor': 'water_drop',
      'Noise Sensor': 'graphic_eq',
      'Air Monitor': 'air',
    };
    return icons[type] || 'battery_alert';
  }

  private groupDevices(): void {
    this.groupedOtherDevices = {};
    for (const dev of this.otherDevices) {
      let subLocation = dev.data?.location;
      if (!subLocation) {
        subLocation = dev.name
          .replace(/^(trv|env|sensor|aq|wl)_/i, "")
          .replace(/_(env|sensor|aq|wl|trv)$/i, "");
      }
      const baseRoom = dev.room || "Unknown";
      const room =
        baseRoom.toLowerCase() === subLocation.toLowerCase()
          ? baseRoom
          : `${baseRoom} — ${subLocation.toUpperCase()}`;

      if (!this.groupedOtherDevices[room]) {
        this.groupedOtherDevices[room] = [];
      }
      this.groupedOtherDevices[room].push(dev);
    }
  }

  get groupedOtherDeviceTypes(): string[] {
    return Object.keys(this.groupedOtherDevices);
  }

  /* ──── Historical overlay device arrays (cached) ──── */
  histThermostats: any[] = [];
  histAqSensors: any[] = [];
  private _histRoomDataKey: any = null;

  /** Recompute the historical overlay's thermostat/AQ arrays only when the
   *  underlying roomData reference changes — getArray() previously ran on every
   *  CD cycle and returned fresh arrays, churning the child's ngOnChanges. */
  private refreshHistoricalArrays(): void {
    const rd = this.selectedHistoricalRoom?.roomData;
    if (rd === this._histRoomDataKey) return;
    this._histRoomDataKey = rd;
    this.histThermostats = rd ? this.getArray(rd.trvDevices) : [];
    this.histAqSensors = rd ? this.getArray(rd.airSensors) : [];
  }

  /** trackBy for the room grid. Was referenced in the template but never
   *  defined, so Angular fell back to identity tracking. */
  trackByRoomId(_index: number, room: InlineRoom): string {
    return room.id;
  }

  trackByKpiRoom(_index: number, item: { room: string; guest: string }): string {
    return `${item.room}|${item.guest}`;
  }

  trackByBatteryDevice(
    _index: number,
    item: { room: string; device: string }
  ): string {
    return `${item.room}|${item.device}`;
  }

  getArray(map: any): any[] {
    if (!map) return [];
    return Object.entries(map).map(([name, data]) => ({
      ...(data as any),
      entityName: name,
    }));
  }

  setHistoricalTimeRange(hours: number | 'custom'): void {
    if (hours === 'custom') {
      if (!this.customStart) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
        this.customEnd = this.formatDateStr(now);
        this.customStart = this.formatDateStr(yesterday);
      }
      this.showCustomPicker = !this.showCustomPicker;
    } else {
      this.showCustomPicker = false;
      this.timeRangeHours = hours;
    }
    this.cd.detectChanges();
  }

  applyCustomRange(): void {
    if (!this.customStart || !this.customEnd || !this.hasCustomRangeChanged) return;
    const startTs = this.parseDateStr(this.customStart);
    const endTs = this.parseDateStr(this.customEnd);
    if (!startTs || !endTs || startTs >= endTs) return;
    this.appliedCustomStart = this.customStart;
    this.appliedCustomEnd = this.customEnd;
    this.timeRangeHours = 'custom';
    this.showCustomPicker = false;
    this.cd.detectChanges();
  }
}
