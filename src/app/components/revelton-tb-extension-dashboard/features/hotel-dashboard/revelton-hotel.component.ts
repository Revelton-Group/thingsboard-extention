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
import { ThemeService, ThemeMode } from "../../core/services/theme.service";
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

  cleanDate(str: string): string {
    if (!str) return '';
    const parts = str.split(/[-\s/:]+/);
    if (parts.length >= 5) {
      let y = parseInt(parts[2], 10) || new Date().getFullYear();
      if (y < 100) y += 2000;
      let m = parseInt(parts[1], 10) || 1;
      if (m < 1) m = 1; else if (m > 12) m = 12;
      let d = parseInt(parts[0], 10) || 1;
      if (d < 1) d = 1; else if (d > 31) d = 31;
      let h = parseInt(parts[3], 10) || 0;
      if (h < 0) h = 0; else if (h > 23) h = 23;
      let min = parseInt(parts[4], 10) || 0;
      if (min < 0) min = 0; else if (min > 59) min = 59;
      return `${d.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${y} ${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }
    return str;
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
  showThemeDropdown = false;
  showControlDropdown = false;

  /* ──── Theme (bound from ThemeService) ──── */
  activeTheme = { name: "Midnight", color: "#818cf8", mode: "Dark" };
  activePalette: any = null;
  themes: { name: string; color: string }[] = [];

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

  formatRoomTitle(title: string | null): string {
    if (!title) return ""; // Empty header if no title

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
    this.showThemeDropdown = false;
    this.showControlDropdown = false;
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
        this.cd.detectChanges();
      })
    );

    // Subscribe to ThemeService
    this.themes = this.themeService.themes.map((t) => ({
      name: t.name,
      color: t.swatch,
    }));
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
        this.fetchWeather();
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

  updateTime(): void {
    const now = new Date();

    // Format options for timezone
    const lang =
      this.translationService.activeLangCode === "RU" ? "ru-RU" : "en-GB";
    const formatter = new Intl.DateTimeFormat(lang, {
      timeZone: HOTEL_TIMEZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });

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
          const { condition, icon } = this.mapWeatherCode(code, isDay);
          this.currentWeather = { temp, condition, icon };
          this.cd.detectChanges();
        }
      })
      .catch((err) => console.error("Failed to fetch weather", err));
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

  toggleThemeDropdown(event: Event): void {
    event.stopPropagation();
    const currentState = this.showThemeDropdown;
    this.closeAllDropdowns();
    this.showThemeDropdown = !currentState;
  }

  toggleControlDropdown(event: Event): void {
    event.stopPropagation();
    const currentState = this.showControlDropdown;
    this.closeAllDropdowns();
    this.showControlDropdown = !currentState;
  }

  saveControlConfig(event: Event): void {
    event.stopPropagation();
    // NOTE: Add logic here to save control settings
    this.closeAllDropdowns();
  }

  selectTheme(theme: any, event: Event): void {
    event.stopPropagation();
    this.themeService.setTheme(theme.name);
  }

  setThemeMode(mode: "Light" | "Dark", event: Event): void {
    event.stopPropagation();
    this.themeService.setMode(mode.toLowerCase() as ThemeMode);
  }

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

  getSelectedRoomData(): any {
    if (!this.selectedRoom) return null;
    const data = {
      ...this.selectedRoom.roomData,
      ctx: this.selectedRoom.mockCtx,
    };

    return data;
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

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      "Window Sensor": "sensor_window",
      Thermostat: "thermostat",
      "Leak Sensor": "water_damage",
      "Noise Sensor": "settings_voice",
      "Air Monitor": "air",
      Occupancy: "person_search",
      Light: "lightbulb",
      Plug: "power",
      Sensor: "sensors",
    };
    return icons[type] || "devices";
  }

  getPrimaryValue(dev: OtherDevice): string | null {
    if (!dev.data) return null;
    if (dev.data.temp !== undefined) return `${dev.data.temp}°`;
    if (dev.data.temperature !== undefined) return `${dev.data.temperature}°`;
    if (dev.data.humidity !== undefined) return `${dev.data.humidity}%`;
    if (dev.data.co2 !== undefined) return `${dev.data.co2}ppm`;
    if (dev.data.illuminance !== undefined) return `${dev.data.illuminance}lx`;
    return null;
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
