import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, Input, Output, EventEmitter, Optional, OnChanges, SimpleChanges } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RoomDataService } from '../../core/services/room-data.service';
import { TranslationService } from '../../core/services/translation.service';
import { ThemeService } from '../../core/services/theme.service';
import { HotelStateService } from '../../core/services/hotel-state.service';
import { ControlPanelService } from '../control-panel/services/control-panel.service';
import { firstValueFrom, noop } from 'rxjs';
import { HOTEL_TIMEZONE } from '../../core/models/dashboard.config';
import {
  WtDeviceState, WtSync, WT_KEY_FIELD, WT_MODES, WT_SERVER_KEYS, WT_SHARED_KEYS,
  completeChange, deviceSync, fieldSync, unconfirmedFields,
} from '../../core/models/wt101-control';

type ReadingTone = 'plain' | 'ok' | 'warn' | 'alert' | 'off';

interface Reading {
  key: string;
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  unit: string;
  sub: string;
  tone: ReadingTone;
  text?: boolean;
}

const readingCell = (key: string, icon: string, text = false): Reading => ({
  key, icon, iconClass: 'icon-gray', label: '', value: '--', unit: '', sub: '', tone: 'off', text,
});

const statusTone = (status: string): ReadingTone =>
  status === 'danger' ? 'alert' : status === 'warning' ? 'warn' : 'plain';

@Component({
  selector: 'tb-room-card-dialog',
  templateUrl: './room-detail-panel.component.html',
  styleUrls: ['./room-detail-panel.component.scss'],
  standalone: false
})
export class RoomDetailPanelComponent implements OnInit, OnChanges, OnDestroy {
  Math = Math;

  get t() {
    return this.translationService.t;
  }

  @Input() data: any;
  @Output() closed = new EventEmitter<void>();

  // Computed status/color for vitals
  tempStatus = 'normal';
  humStatus = 'normal';
  airStatus = 'normal';
  co2Status = 'normal';
  co2Value: number | null = null;
  aqiScore: number | null = null;

  private fmt(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ''));
  }

  // Header
  roomNumber = '--';
  floorLabel = '';
  avgTemp: number | null = null;
  avgHum: number | null = null;
  aqOverall = '--';
  occupancyDisplay = '--';
  bookingDisplay = '--';
  roomTitleLabel = 'Room';

  // Reservation details
  guestName = '';
  checkInDisplay = '';
  checkOutDisplay = '';
  reservationState = '';
  statusSummary = '';
  checkoutRemaining = '';
  /** Share of the stay that has passed (0-100), null without a full check-in/out pair */
  stayPct: number | null = null;

  // Readings strip and alert focus
  readonly readings: Reading[] = [
    readingCell('temp', 'thermostat'),
    readingCell('humid', 'water_drop'),
    readingCell('air', 'air', true),
    readingCell('noise', 'volume_up'),
    readingCell('presence', 'person', true),
  ];
  focusAlertId: string | null = null;
  /** Tracks (of 3) the window sensors card fills so the last grid row stays complete */
  windowSpan = 1;
  focusEntity: string | null = null;

  // Dynamic data
  thermostats: any[] = [];
  aqSensors: any[] = [];
  allSensors: any[] = [];
  leftSensors: any[] = [];
  rightSensors: any[] = [];
  smartSockets: any[] = [];

  // Partitioned sensor arrays for new card-based layout
  occupancySensors: any[] = [];
  windowSensors: any[] = [];
  waterLeakSensors: any[] = [];
  noiseSensors: any[] = [];
  allRawSensors: any[] = [];

  alerts: any[] = [];
  alertTimestamps = new Map<string, number>();
  archivedAlerts: any[] = [];
  acknowledgedAlertIds = new Set<string>();
  logs: any[] = [];
  private archiveLoaded = false;

  // RPC: entityName → entityId (UUID) lookup map
  deviceEntityIdMap: { [entityName: string]: string } = {};

  private wtPoll: any;
  private wtRefetch: any;
  private destroyed = false;
  private wtStarted = false;
  private wtState: Record<string, WtDeviceState> = {};
  private wtWriteAt: Record<string, number> = {};
  /** Fields whose last write was rejected (HTTP error), per thermostat */
  private wtWriteError: Record<string, string> = {};
  private roomAssetId: string | null = null;
  private wtLinked = true;
  private configSub: any;

  // ── Inline Historical Telemetry State ──────────────────────────────
  /** Time range for inline historical section: 24 | 168 | 720 hours or 'custom' */
  histTimeRange: number | 'custom' = 24;
  histCustomStartDate = '';
  histCustomStartHour = '00';
  histCustomStartMin = '00';
  histCustomEndDate = '';
  histCustomEndHour = '00';
  histCustomEndMin = '00';

  hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  get histCustomStart(): string {
    return this.histCustomStartDate ? `${this.histCustomStartDate}T${this.histCustomStartHour}:${this.histCustomStartMin}` : '';
  }
  set histCustomStart(val: string) {
    if (!val) return;
    const [date, time] = val.split('T');
    this.histCustomStartDate = date;
    if (time) {
      const parts = time.split(':');
      this.histCustomStartHour = parts[0] || '00';
      this.histCustomStartMin = parts[1] || '00';
    }
  }

  get histCustomEnd(): string {
    return this.histCustomEndDate ? `${this.histCustomEndDate}T${this.histCustomEndHour}:${this.histCustomEndMin}` : '';
  }
  set histCustomEnd(val: string) {
    if (!val) return;
    const [date, time] = val.split('T');
    this.histCustomEndDate = date;
    if (time) {
      const parts = time.split(':');
      this.histCustomEndHour = parts[0] || '00';
      this.histCustomEndMin = parts[1] || '00';
    }
  }

  histAppliedCustomStart = '';
  histAppliedCustomEnd = '';
  showHistCustomPicker = false;
  /** Legacy flag kept for backward compat */
  showHistoricalData = true;

  get hasHistCustomRangeChanged(): boolean {
    const startTs = this.parseDatetimeLocal(this.histCustomStart);
    const endTs = this.parseDatetimeLocal(this.histCustomEnd);
    if (!startTs || !endTs || startTs >= endTs) return false;
    return this.histCustomStart !== this.histAppliedCustomStart || this.histCustomEnd !== this.histAppliedCustomEnd;
  }

  formatDatetimeLocal(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  formatNum(val: any, max: number): string {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    return num.toString().padStart(2, '0');
  }

  parseDatetimeLocal(str: string): number {
    if (!str) return 0;
    const d = new Date(str);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  setHistTimeRange(hours: number | 'custom'): void {
    if (hours === 'custom') {
      if (!this.histCustomStart) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
        this.histCustomEnd = this.formatDatetimeLocal(now);
        this.histCustomStart = this.formatDatetimeLocal(yesterday);
      }
      this.showHistCustomPicker = !this.showHistCustomPicker;
    } else {
      this.showHistCustomPicker = false;
      this.histTimeRange = hours;
    }
    this.cdr.detectChanges();
  }

  applyHistCustomRange(): void {
    if (!this.histCustomStart || !this.histCustomEnd || !this.hasHistCustomRangeChanged) return;
    const startTs = this.parseDatetimeLocal(this.histCustomStart);
    const endTs = this.parseDatetimeLocal(this.histCustomEnd);
    if (!startTs || !endTs || startTs >= endTs) return;
    this.histAppliedCustomStart = this.histCustomStart;
    this.histAppliedCustomEnd = this.histCustomEnd;
    this.histTimeRange = 'custom';
    this.showHistCustomPicker = false;
    this.cdr.detectChanges();
  }

  get histCustomStartTs(): number | undefined {
    return this.histTimeRange === 'custom' && this.histAppliedCustomStart ? this.parseDatetimeLocal(this.histAppliedCustomStart) : undefined;
  }

  get histCustomEndTs(): number | undefined {
    return this.histTimeRange === 'custom' && this.histAppliedCustomEnd ? this.parseDatetimeLocal(this.histAppliedCustomEnd) : undefined;
  }

  openHistoricalData(): void {
    if (this.data) {
      this.hotelStateService.openHistoricalData({
        id: this.roomNumber,
        name: this.roomTitleLabel,
        roomData: this.data,
        mockCtx: this.data.ctx,
        activeDialogRef: null
      });
    }
  }

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any,
    @Optional() private dialogRef: MatDialogRef<RoomDetailPanelComponent>,
    private cdr: ChangeDetectorRef,
    private roomDataService: RoomDataService,
    private translationService: TranslationService,
    private hotelStateService: HotelStateService,
    private controlPanelService: ControlPanelService,
    private themeService: ThemeService,
    private el: ElementRef<HTMLElement>
  ) {}

  private detachTheme: (() => void) | null = null;

  ngOnInit(): void {
    // Opened as a dialog this lives in the overlay, outside the dashboard host — paint the pane it sits in.
    this.detachTheme = this.themeService.attach(
      (this.el.nativeElement.closest('.cdk-overlay-pane') as HTMLElement | null) ?? this.el.nativeElement
    );

    if (this.dialogData) {
      this.data = this.dialogData;
    }
    // No own refresh timer: the opener (hotel grid or tb-room-card) calls updateData()
    // on every telemetry update and on its 10 s refresh tick.
    this.initializeData();

    this.configSub = this.controlPanelService.config$.subscribe(() => {
      this.updateData();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.initializeData();
    }
  }

  private initializeData(): void {
    if (!this.data) return;
    this.deviceEntityIdMap = { ...this.data.deviceEntityIdMap };
    this.buildFromPassedData();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachTheme?.();
    if (this.wtPoll) clearInterval(this.wtPoll);
    if (this.wtRefetch) clearTimeout(this.wtRefetch);
    if (this.configSub) this.configSub.unsubscribe();
  }

  public updateData(): void {
    if (this.data?.deviceEntityIdMap) {
      Object.assign(this.deviceEntityIdMap, this.data.deviceEntityIdMap);
    }
    this.buildFromPassedData();
    if (!this.wtStarted && this.thermostats.length > 0) {
      this.wtStarted = true;
      this.startWt();
    }
    this.cdr.detectChanges();
  }

  /** WT101 control state lives in the devices' SHARED / SERVER attributes; polled while the panel is open */
  private async startWt(): Promise<void> {
    await this.resolveRoomAsset();
    await this.fetchWtStates();
    // The dialog may have closed while the requests above were in flight
    if (this.destroyed) return;
    this.wtPoll = setInterval(() => {
      if (!document.hidden) this.fetchWtStates();
    }, 10000);
  }

  /** wt_linked is kept on the room asset — the asset that Contains the room's WT101s */
  private async resolveRoomAsset(): Promise<void> {
    const http = this.data?.ctx?.http;
    const deviceId = this.deviceEntityIdMap[this.thermostats[0]?.entityName];
    if (!http || !deviceId) return;
    const opts = { ignoreErrors: true, ignoreLoading: true };
    try {
      const rels: any[] = await firstValueFrom(http.get(`/api/relations/info?toId=${deviceId}&toType=DEVICE`, opts));
      const rel = (rels || []).find(r => r.type === 'Contains' && r.from?.entityType === 'ASSET');
      this.roomAssetId = rel?.from?.id ?? null;
      if (!this.roomAssetId) return;
      const attrs: any[] = await firstValueFrom(http.get(`/api/plugins/telemetry/ASSET/${this.roomAssetId}/values/attributes/SERVER_SCOPE?keys=wt_linked`, opts));
      const linked = (attrs || []).find(a => a.key === 'wt_linked')?.value;
      this.wtLinked = linked == null || String(linked) !== 'false';
    } catch (err) {
      console.error('[RoomDetail] Failed to resolve the room asset', err);
    }
  }

  private async fetchWtStates(): Promise<void> {
    const http = this.data?.ctx?.http;
    if (!http) return;
    const opts = { ignoreErrors: true, ignoreLoading: true };
    const toMap = (rows: any[]) => Object.fromEntries((rows || []).map(r => [r.key, r.value]));
    await Promise.all(this.thermostats.map(async trv => {
      const name = trv.entityName;
      const id = this.deviceEntityIdMap[name];
      if (!id) return;
      try {
        const [shared, server, telemetry]: any[] = await Promise.all([
          firstValueFrom(http.get(`/api/plugins/telemetry/DEVICE/${id}/values/attributes/SHARED_SCOPE?keys=${WT_SHARED_KEYS.join(',')}`, opts)),
          firstValueFrom(http.get(`/api/plugins/telemetry/DEVICE/${id}/values/attributes/SERVER_SCOPE?keys=${WT_SERVER_KEYS.join(',')}`, opts)),
          firstValueFrom(http.get(`/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=wt_downlink_error`, opts)),
        ]);
        const prev = this.wtState[name];
        // A value written a moment ago may not read back yet — keep the local copy briefly
        const recentWrite = Date.now() - (this.wtWriteAt[name] || 0) < 5000;
        const sharedTs = Object.fromEntries((shared || []).map((r: any) => [r.key, r.lastUpdateTs ?? 0]));
        this.wtState[name] = {
          shared: recentWrite && prev ? prev.shared : toMap(shared),
          sharedTs: recentWrite && prev?.sharedTs ? prev.sharedTs : sharedTs,
          server: toMap(server),
          error: (telemetry as any)?.wt_downlink_error?.[0]?.value ?? '',
        };
      } catch (err) {
        console.error('[RoomDetail] Failed to fetch WT101 state for', name, err);
      }
    }));
    if (this.destroyed) return;
    this.buildFromPassedData();
    this.cdr.detectChanges();
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    this.closed.emit();
  }

  private isTampered(name: string): boolean {
    return !!this.data.tamperDevices?.[name];
  }

  private isDeviceOffline(name: string): boolean {
    const active = this.data?.activeDevices?.[name];
    if (active === false || active === 'false' || active === 0 || active === '0') {
      return true;
    }
    return this.data?.offlineDevices?.[name] ?? false;
  }

  public buildFromPassedData(): void {
    if (!this.data) return;

    // Sensor arrays are read-only (no interactive UI state) — safe to rebuild
    this.aqSensors = [];
    this.allSensors = [];
    this.leftSensors = [];
    this.rightSensors = [];
    this.occupancySensors = [];
    this.windowSensors = [];
    this.waterLeakSensors = [];
    this.noiseSensors = [];
    this.allRawSensors = [];
    this.logs = [];
    // NOTE: thermostats & smartSockets are mutated in-place below (not cleared)

    const sd = this.data.sensorData || {};
    const hd = this.data.hasData || {};

    this.roomNumber = sd.roomNumber || '--';
    if (!this.archiveLoaded && this.roomNumber !== '--') {
      this.loadArchive();
      this.archiveLoaded = true;
    }
    this.cleanExpiredArchivedAlerts();
    this.roomTitleLabel = sd.roomTitle || this.t.room;
    this.avgTemp = hd.temperature ? sd.temperature : null;
    this.avgHum = hd.humidity ? sd.humidity : null;

    if (hd.airQuality) {
      this.aqOverall = this.roomDataService.getAirQualityLabel(sd.airQuality);
    }

    this.occupancyDisplay = hd.checkedIn ? (sd.checkedIn ? this.t.occupied : this.t.vacant) : '--';
    this.bookingDisplay = hd.booked ? (sd.booked ? this.t.booked : this.t.vacant) : '--';

    // Reservation details from Mews (pre-computed by RoomDataService)
    const res = this.data.reservation;
    if (res && res.hasReservation) {
      this.guestName = res.guestName || '';
      this.reservationState = res.reservationState || '';
      this.checkInDisplay = res.checkIn ? this.formatDateTime(res.checkIn) : '';
      this.checkOutDisplay = res.checkOut ? this.formatDateTime(res.checkOut) : '';
      const stayStart = res.checkIn ? Date.parse(res.checkIn) : NaN;
      const stayEnd = res.checkOut ? Date.parse(res.checkOut) : NaN;
      this.stayPct = isFinite(stayStart) && isFinite(stayEnd) && stayEnd > stayStart
        ? Math.min(100, Math.max(0, ((Date.now() - stayStart) / (stayEnd - stayStart)) * 100))
        : null;
      this.bookingDisplay = res.bookDisplay || this.bookingDisplay;
      this.occupancyDisplay = res.checkDisplay === 'In' ? this.t.occupied : (res.checkDisplay === 'Wait' ? this.t.loading : (res.checkDisplay === 'Out' ? this.t.vacant : this.occupancyDisplay));
      this.statusSummary = res.statusSummary || '';
      this.checkoutRemaining = res.checkoutRemaining || '';
    } else {
      // No active reservation for this room — clear any reservation fields left
      // over from a previously selected room (this panel instance is reused
      // across room switches, not recreated).
      this.guestName = '';
      this.reservationState = '';
      this.checkInDisplay = '';
      this.checkOutDisplay = '';
      this.statusSummary = '';
      this.checkoutRemaining = '';
      this.stayPct = null;
    }

    // Thermostats — in-place mutation keeps each card's object identity
    const trvData = this.data.trvDevices || {};
    const seenTrvNames = new Set<string>();
    for (const [name, data] of Object.entries(trvData) as any) {
      seenTrvNames.add(name);
      const trv = this.thermostats.find(t => t.entityName === name);
      const st = this.wtState[name] || { shared: {}, server: {}, error: '' };
      const s = st.shared;
      const mode = WT_MODES.includes(s.wt_mode) ? s.wt_mode : 'auto';
      const writeError = this.wtWriteError[name];
      const sync = writeError ? 'failed' : deviceSync(st);

      const freshData = {
        entityName: name,
        displayName: name,
        currentTemp: this.data.tempDevices?.[name] ?? null,
        targetTemp: s.wt_target_temperature != null ? Math.round(+s.wt_target_temperature) : (data.setPoint ?? null),
        clientTargetTemp: data.setPoint ?? null,
        systemMode: mode,
        settings: this.buildTrvSettings(st),
        sync,
        syncError: writeError ? this.t.wtWriteFailed : (sync === 'failed' ? (st.error || this.t.wtNotConfirmed) : ''),
        syncFields: writeError || unconfirmedFields(st).join(', '),
        alert: this.getTrvAlert(name, data),
        runningState: mode === 'off' ? 'off' : (data.status || (data.calibrationFailed ? 'idle' : this.deriveTrvState(mode, this.data.tempDevices?.[name], data.setPoint))),
        valveOpening: data.valveOpening ?? null,
        battery: this.data.batteryDevices?.[name] ?? null,
        batteryLow: this.data.batteryLowDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model || 'WT101',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name)
      };

      if (trv) {
        Object.assign(trv, freshData);
      } else {
        this.thermostats.push(freshData);
      }
    }
    // Remove stale thermostats (devices that disappeared)
    for (let i = this.thermostats.length - 1; i >= 0; i--) {
      if (!seenTrvNames.has(this.thermostats[i].entityName)) {
        this.thermostats.splice(i, 1);
      }
    }

    // Window Sensors
    const winDevices = this.data.windowDevices || {};
    for (const [name, data] of Object.entries(winDevices) as any) {
      const isWindowOpen = data.contact === 'open';
      // No location yet → named W1, W2, … after partitioning below
      let displayName = this.data.deviceMeta?.[name]?.location || '';
      if (displayName) {
        displayName = displayName.replace(/(window|окно)\s+(\d+)/i, '$1-$2');
      }
      this.allSensors.push({
        type: 'window',
        entityName: name,
        displayName: displayName,
        isOpen: isWindowOpen,
        statusLabel: isWindowOpen ? this.t.open : this.t.closed,
        statusColor: isWindowOpen ? '#FF9500' : '#34C759',
        icon: 'window',
        iconColor: isWindowOpen ? '#FF9500' : '#34C759',
        iconBg: isWindowOpen ? 'rgba(255,149,0,0.08)' : 'rgba(52,199,89,0.08)',
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model || 'WS301',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name),
        tamper: this.isTampered(name)
      });
    }

    // Water Leak Sensors
    const leakDevices = this.data.leakDevices || {};
    for (const [name, data] of Object.entries(leakDevices) as any) {
      const isWS303 = name.toUpperCase().includes('WS303') || name.toUpperCase().startsWith('RST-KLV-WS303') || name.toUpperCase().includes('WL') || name.toUpperCase().includes('LEAK') || name.toLowerCase() === 'bathroom';
      if (!isWS303) continue;

      // Filter by room number
      const cleanRoom = this.roomNumber ? this.roomNumber.trim() : '';
      if (cleanRoom && cleanRoom !== '--' && cleanRoom !== '---') {
        const belongsToRoom = 
          new RegExp(`_room_${cleanRoom}(_|$)`, 'i').test(name) ||
          new RegExp(`_${cleanRoom}(_|$)`, 'i').test(name) ||
          new RegExp(`-${cleanRoom}(-|$)`, 'i').test(name) ||
          name.includes(cleanRoom);
        if (!belongsToRoom) continue;
      }

      const isLeak = !!data.leak;
      let displayName = this.data.deviceMeta?.[name]?.location || this.t.histWaterLeak;
      if (displayName) {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }
      this.allSensors.push({
        type: 'water',
        entityName: name,
        displayName: displayName,
        isLeak: isLeak,
        statusLabel: isLeak ? this.t.leakDetected : this.t.noLeak,
        statusColor: isLeak ? '#FF3B30' : '#34C759',
        icon: 'water_drop',
        iconColor: isLeak ? '#FF3B30' : '#34C759',
        iconBg: isLeak ? 'rgba(255,59,48,0.08)' : 'rgba(52,199,89,0.08)',
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model || 'WS303',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name),
        tamper: this.isTampered(name),
        snr: data.snr ?? null,
        rssi: data.rssi ?? null,
        fCnt: data.fCnt ?? null,
        fPort: data.fPort ?? null,
        dr: data.dr ?? null,
        deviceStatus: data.deviceStatus ?? null,
        lorawanClass: data.lorawanClass ?? null,
        sn: data.sn ?? null,
        firmwareVersion: data.firmwareVersion ?? null,
        hardwareVersion: data.hardwareVersion ?? null,
        ipsoVersion: data.ipsoVersion ?? null
      });
    }

    // Noise Sensors
    const noiseDevices = this.data.noiseDevices || {};
    for (const [name, data] of Object.entries(noiseDevices) as any) {
      const isWS302 = name.toUpperCase().includes('WS302') || name.toUpperCase().startsWith('RST-KLV-WS');
      if (!isWS302) continue;

      // Filter by room number
      const cleanRoom = this.roomNumber ? this.roomNumber.trim() : '';
      if (cleanRoom && cleanRoom !== '--' && cleanRoom !== '---') {
        const belongsToRoom = 
          new RegExp(`_room_${cleanRoom}(_|$)`, 'i').test(name) ||
          new RegExp(`_${cleanRoom}(_|$)`, 'i').test(name) ||
          new RegExp(`-${cleanRoom}(-|$)`, 'i').test(name) ||
          name.includes(cleanRoom);
        if (!belongsToRoom) continue;
      }

      const currentLevel = data.level ?? data.laeq ?? data.lai ?? 0;
      const config = this.controlPanelService?.config;
      let isLoud = false;
      if (config && config.noise && config.noise.enabled) {
        const laeq = data.laeq ?? 0;
        const lai = data.lai ?? 0;
        const laimax = data.laimax ?? 0;
        isLoud = (data.laeq != null && laeq >= config.noise.laeqMax) ||
                 (data.lai != null && lai >= config.noise.laiMax) ||
                 (data.laimax != null && laimax >= config.noise.laimaxMax);
      } else {
        isLoud = currentLevel > 55;
      }
      const quiet = !isLoud;
      let displayName = this.data.deviceMeta?.[name]?.location || 'Noise Sensor';
      if (displayName) {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }
      this.allSensors.push({
        type: 'noise',
        entityName: name,
        displayName: displayName,
        statusLabel: Math.round(currentLevel) + ' dB – ' + (quiet ? this.t.normal : this.t.loud),
        levelVal: Math.round(currentLevel) + ' dB',
        levelText: quiet ? this.t.normal : this.t.loud,
        statusColor: quiet ? '#34C759' : '#FF9500',
        icon: quiet ? 'volume_down' : 'volume_up',
        iconColor: quiet ? '#34C759' : '#FF9500',
        iconBg: quiet ? 'rgba(52,199,89,0.08)' : 'rgba(255,149,0,0.08)',
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model || 'WS302',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name),
        laeq: data.laeq ?? null,
        lai: data.lai ?? null,
        laimax: data.laimax ?? null,
        weighting: data.weighting ?? 'I',
        isLoud: !quiet
      });
    }

    // Occupancy Sensors
    const occupancyDevices = this.data.occupancyDevices || {};
    for (const [name, data] of Object.entries(occupancyDevices) as any) {
      const isWS301 = name.toUpperCase().includes('VS370') || name.toUpperCase().includes('VS3') || name.toUpperCase().includes('OCC') || name.toUpperCase().includes('PRESENCE') || name.toUpperCase().includes('RADAR') || name.toUpperCase().includes('MOTION');
      if (!isWS301) continue;

      // Filter by room number
      const cleanRoom = this.roomNumber ? this.roomNumber.trim() : '';
      if (cleanRoom && cleanRoom !== '--' && cleanRoom !== '---') {
        const belongsToRoom = 
          new RegExp(`_room_${cleanRoom}(_|$)`, 'i').test(name) ||
          new RegExp(`_${cleanRoom}(_|$)`, 'i').test(name) ||
          new RegExp(`-${cleanRoom}(-|$)`, 'i').test(name) ||
          name.includes(cleanRoom);
        if (!belongsToRoom) continue;
      }

      let displayName = this.data.deviceMeta?.[name]?.location || 'Presence Sensor';
      if (displayName) {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }

      const rawOccupancy = data.occupancy || 'vacant';
      const isOccupied = rawOccupancy.toLowerCase() === 'occupied' || rawOccupancy.toLowerCase() === 'true' || rawOccupancy === '1';

      this.allSensors.push({
        type: 'occupancy',
        entityName: name,
        displayName: displayName,
        occupancy: rawOccupancy,
        isOccupied: isOccupied,
        illuminance: data.illuminance ? String(data.illuminance).toLowerCase() : null,
        statusLabel: isOccupied ? this.t.occupied : this.t.vacant,
        statusColor: isOccupied ? '#3B82F6' : '#34C759',
        icon: 'radar',
        iconColor: isOccupied ? '#3B82F6' : '#34C759',
        iconBg: isOccupied ? 'rgba(59,130,246,0.08)' : 'rgba(52,199,89,0.08)',
        battery: this.data.batteryDevices?.[name] ?? null,
        batteryLow: this.data.batteryLowDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model || 'VS370',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name),
        snr: data.snr ?? null,
        rssi: data.rssi ?? null,
        fCnt: data.fCnt ?? null,
        fPort: data.fPort ?? null,
        dr: data.dr ?? null,
        deviceStatus: data.deviceStatus ?? null,
        lorawanClass: data.lorawanClass ?? null,
        sn: data.sn ?? null,
        firmwareVersion: data.firmwareVersion ?? null,
        hardwareVersion: data.hardwareVersion ?? null,
        ipsoVersion: data.ipsoVersion ?? null,
        tslVersion: data.tslVersion ?? null
      });
    }

    // Air Quality Sensors
    const airDevices = this.data.airSensors || {};
    for (const [name, aqData] of Object.entries(airDevices) as any) {
      const aqResult = RoomDataService.calculateAirQuality(
        aqData.co2 ?? null, aqData.tvoc ?? aqData.iaq ?? null, aqData.pm25 ?? null, aqData.pm10 ?? null,
        aqData.hum ?? null, aqData.temp ?? null, aqData.light ?? null, aqData.pressure ?? null
      );
      let aqDisplayName = this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Air Monitor');
      if (aqDisplayName) {
        aqDisplayName = aqDisplayName.charAt(0).toUpperCase() + aqDisplayName.slice(1);
      }
      this.aqSensors.push({
        entityName: name,
        displayName: aqDisplayName,
        overall: aqResult.label,
        overallColor: aqResult.color,
        aqiScore: aqResult.aqi,
        aqiDominant: aqResult.dominant,
        temperature: aqData.temp ?? null,
        humidity: aqData.hum ?? null,
        co2: aqData.co2 ?? null,
        tvoc: aqData.tvoc ?? aqData.iaq ?? null,
        pm25: aqData.pm25 ?? null,
        pm10: aqData.pm10 ?? null,
        light: aqData.light ?? null,
        pressure: aqData.pressure ?? null,
        pir: aqData.pir ?? null,
        model: this.data.deviceMeta?.[name]?.model ?? 'AM308',
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name),
      });
    }

    // Smart Sockets — in-place mutation to preserve UI state (stateLockUntil, etc.)
    const plugData = this.data.plugDevices || {};
    const seenSocketNames = new Set<string>();
    for (const [name, data] of Object.entries(plugData) as any) {
      seenSocketNames.add(name);
      const socket = this.smartSockets.find(s => s.entityName === name);
      const now = Date.now();
      const serverState = data.state ?? 'OFF';
      const finalState = socket && now < (socket.stateLockUntil || 0) ? socket.state : serverState;

      const freshSocketData = {
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || name,
        state: finalState,
        telemetryState: serverState,
        power: data.power ?? null,
        voltage: data.voltage ?? null,
        current: data.current ?? null,
        energyToday: data.energyToday ?? null,
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model ?? 'Smart Plug',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.isDeviceOffline(name),
        controlKey: data.controlKey || 'state',
      };

      if (socket) {
        Object.assign(socket, freshSocketData);
      } else {
        this.smartSockets.push({ ...freshSocketData, stateLockUntil: 0 });
      }
    }
    // Remove stale sockets (devices that disappeared)
    for (let i = this.smartSockets.length - 1; i >= 0; i--) {
      if (!seenSocketNames.has(this.smartSockets[i].entityName)) {
        this.smartSockets.splice(i, 1);
      }
    }

    // Sorting
    // Order by entity name (RST-KLV-WT101-<inventory>-<room>), then number sequentially: Thermostat 1, 2, …
    this.thermostats.sort((a, b) => a.entityName.localeCompare(b.entityName));
    this.thermostats.forEach((trv, i) => trv.displayName = `${this.t.thermostat} ${i + 1}`);
    this.markWtLinked();
    this.aqSensors.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    this.smartSockets.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));

    // Partition allSensors into typed categories for new card layout
    this.allRawSensors = [...this.allSensors];
    this.occupancySensors = this.allSensors.filter(s => s.type === 'occupancy');
    this.windowSensors = this.allSensors.filter(s => s.type === 'window');
    this.waterLeakSensors = this.allSensors.filter(s => s.type === 'water');
    this.noiseSensors = this.allSensors.filter(s => s.type === 'noise');

    this.windowSensors.sort((a, b) => a.entityName.localeCompare(b.entityName));
    // Title: location, numbered when shared ("Kitchen 1", "Kitchen 2"), or Window 1, Window 2… without one
    const locationCount = new Map<string, number>();
    this.windowSensors.forEach(s => {
      const key = s.displayName.toLowerCase();
      locationCount.set(key, (locationCount.get(key) || 0) + 1);
    });
    const locationIndex = new Map<string, number>();
    this.windowSensors.forEach(s => {
      const key = s.displayName.toLowerCase();
      const n = (locationIndex.get(key) || 0) + 1;
      locationIndex.set(key, n);
      if (!key) s.displayName = `${this.t.window} ${n}`;
      else if (locationCount.get(key)! > 1) s.displayName = `${s.displayName} ${n}`;
      s.subLabel = s.model || s.entityName;
    });

    // Sort each category by device number
    for (const arr of [this.occupancySensors, this.windowSensors, this.waterLeakSensors, this.noiseSensors]) {
      arr.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    }

    // Compute status fields for vitals
    this.tempStatus = this.data.tempStatus || 'normal';
    this.humStatus = this.data.humStatus || 'normal';
    this.airStatus = this.data.airStatus || 'normal';
    this.co2Value = this.aqSensors.length > 0 ? this.aqSensors[0].co2 : null;
    if (this.co2Value !== null) {
      if (this.co2Value > 1500) this.co2Status = 'danger';
      else if (this.co2Value > 1000) this.co2Status = 'warning';
      else this.co2Status = 'normal';
    }
    this.aqiScore = this.aqSensors.length > 0 ? (this.aqSensors[0].aqiScore ?? null) : null;

    // Populate alerts dynamically based on custom thresholds from Control Config
    const previousAlerts = [...this.alerts];
    const triggeredAlerts: any[] = [];
    const config = this.controlPanelService.config;

    const hasAQ = config.airQuality && config.airQuality.enabled && this.aqSensors.length > 0;

    if (this.avgTemp !== null && !hasAQ) {
      const tempStatus = this.data.tempStatus;
      if (tempStatus === 'danger' || tempStatus === 'warning') {
        triggeredAlerts.push({
          id: 'temp-alert',
          title: this.t.temperature,
          message: this.fmt(this.t.alertValueIsT, { name: this.t.temperature, value: `${this.avgTemp}°C`, level: tempStatus === 'danger' ? this.t.cpCritAlert : this.t.warningC }),
          time: this.t.justNow || 'Just now',
          severity: 'warning'
        });
      }
    }

    if (this.avgHum !== null && !hasAQ) {
      const humStatus = this.data.humStatus;
      if (humStatus === 'danger' || humStatus === 'warning') {
        triggeredAlerts.push({
          id: 'hum-alert',
          title: this.t.humidity,
          message: this.fmt(this.t.alertValueIsT, { name: this.t.humidity, value: `${this.avgHum}%`, level: humStatus === 'danger' ? this.t.cpCritAlert : this.t.warningC }),
          time: this.t.justNow || 'Just now',
          severity: 'warning'
        });
      }
    }

    if (config.airQuality && config.airQuality.enabled) {
      for (const aq of this.aqSensors) {
        if (aq.co2 !== null && aq.co2 >= config.airQuality.co2Max) {
          triggeredAlerts.push({
            id: `co2-${aq.entityName}`,
            title: `CO₂`,
            message: this.fmt(this.t.alertLevelHighT, { name: 'CO₂', value: `${aq.co2} ppm`, limit: `${config.airQuality.co2Max} ppm` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.pm25 !== null && aq.pm25 >= config.airQuality.pm25Max) {
          triggeredAlerts.push({
            id: `pm25-${aq.entityName}`,
            title: `PM2.5`,
            message: this.fmt(this.t.alertLevelHighT, { name: 'PM2.5', value: `${aq.pm25} µg/m³`, limit: `${config.airQuality.pm25Max} µg/m³` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.pm10 !== null && aq.pm10 >= config.airQuality.pm10Max) {
          triggeredAlerts.push({
            id: `pm10-${aq.entityName}`,
            title: `PM10`,
            message: this.fmt(this.t.alertLevelHighT, { name: 'PM10', value: `${aq.pm10} µg/m³`, limit: `${config.airQuality.pm10Max} µg/m³` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.tvoc !== null && aq.tvoc >= config.airQuality.tvocMax) {
          triggeredAlerts.push({
            id: `tvoc-${aq.entityName}`,
            title: `TVOC`,
            message: this.fmt(this.t.alertLevelHighT, { name: 'TVOC', value: `${aq.tvoc} ppb`, limit: `${config.airQuality.tvocMax} ppb` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.temperature !== null && aq.temperature >= config.airQuality.tempMax) {
          triggeredAlerts.push({
            id: `temp-aq-${aq.entityName}`,
            title: `${this.t.temperature}`,
            message: this.fmt(this.t.alertIsHighT, { name: this.t.temperature, value: `${aq.temperature}°C`, limit: `${config.airQuality.tempMax}°C` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.humidity !== null && aq.humidity >= config.airQuality.humMax) {
          triggeredAlerts.push({
            id: `hum-aq-${aq.entityName}`,
            title: `${this.t.humidity}`,
            message: this.fmt(this.t.alertIsHighT, { name: this.t.humidity, value: `${aq.humidity}%`, limit: `${config.airQuality.humMax}%` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.pressure !== null && aq.pressure >= config.airQuality.pressMax) {
          triggeredAlerts.push({
            id: `press-aq-${aq.entityName}`,
            title: this.t.lblPressure,
            message: this.fmt(this.t.alertIsHighT, { name: this.t.lblPressure, value: `${aq.pressure} hPa`, limit: `${config.airQuality.pressMax} hPa` }),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
      }
    }

    if (config.noise && config.noise.enabled) {
      for (const s of this.allSensors) {
        if (s.type === 'noise') {
          const laeq = s.laeq ?? 0;
          const lai = s.lai ?? 0;
          const laimax = s.laimax ?? 0;
          
          if (laeq >= config.noise.laeqMax) {
            triggeredAlerts.push({
              id: `noise-laeq-${s.entityName}`,
              title: `${this.t.lblNoise} LAeq`,
              message: this.fmt(this.t.alertNoiseT, { name: 'LAeq', value: `${Math.round(laeq)} dBA`, limit: `${config.noise.laeqMax} dBA` }),
              time: this.t.justNow || 'Just now',
              severity: 'warning'
            });
          }
          if (lai >= config.noise.laiMax) {
            triggeredAlerts.push({
              id: `noise-lai-${s.entityName}`,
              title: `${this.t.lblNoise} LA${s.weighting || 'I'}`,
              message: this.fmt(this.t.alertNoiseT, { name: `LA${s.weighting || 'I'}`, value: `${Math.round(lai)} dBA`, limit: `${config.noise.laiMax} dBA` }),
              time: this.t.justNow || 'Just now',
              severity: 'warning'
            });
          }
          if (laimax >= config.noise.laimaxMax) {
            triggeredAlerts.push({
              id: `noise-laimax-${s.entityName}`,
              title: `${this.t.lblNoise} LA${s.weighting || 'I'}max`,
              message: this.fmt(this.t.alertNoiseT, { name: `LA${s.weighting || 'I'}max`, value: `${Math.round(laimax)} dBA`, limit: `${config.noise.laimaxMax} dBA` }),
              time: this.t.justNow || 'Just now',
              severity: 'warning'
            });
          }
        }
      }
    }

    for (const s of this.allSensors) {
      if (s.type === 'water' && s.isLeak) {
        triggeredAlerts.push({
          id: `leak-${s.entityName}`,
          title: `${this.t.waterLeak}`,
          message: `${this.t.leakDetected}!`,
          time: this.t.justNow || 'Just now',
          severity: 'critical'
        });
      }
    }

    for (const s of this.allSensors) {
      if ((s.type === 'window' || s.type === 'water') && s.tamper) {
        triggeredAlerts.push({
          id: `tamper-${s.entityName}`,
          title: `${s.displayName} · ${this.t.tampered}`,
          message: this.t.tamperedAlert,
          time: this.t.justNow || 'Just now',
          severity: 'critical'
        });
      }
    }

    if (config.window && config.window.enabled) {
      for (const s of this.allSensors) {
        if (s.type === 'window' && s.isOpen) {
          triggeredAlerts.push({
            id: `window-${s.entityName}`,
            title: s.displayName,
            message: this.t.open.toLowerCase(),
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
      }
    }

    // Smart socket over-power / overload — WS523 has no built-in alarm telemetry,
    // so we compare its live power draw against the configured maximum.
    if (config.socket && config.socket.enabled) {
      for (const socket of this.smartSockets) {
        if (socket.power !== null && socket.power !== undefined && socket.power >= config.socket.powerMax) {
          triggeredAlerts.push({
            id: `socket-power-${socket.entityName}`,
            title: socket.displayName || this.t.smartSocket || 'Smart Socket',
            message: `${this.t.socketPowerHigh || 'Power draw high'}: ${Math.round(socket.power)} W (${this.t.alertMaxWord}: ${config.socket.powerMax} W)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
      }
    }

    // Sync acknowledgedAlertIds: remove those that are no longer triggered (returned to normal)
    const triggeredIds = new Set(triggeredAlerts.map(a => a.id));
    let ackChanged = false;
    for (const ackId of Array.from(this.acknowledgedAlertIds)) {
      if (!triggeredIds.has(ackId)) {
        this.acknowledgedAlertIds.delete(ackId);
        ackChanged = true;
      }
    }
    if (ackChanged) {
      this.saveArchive();
    }

    // Populate active alerts (skip those that are acknowledged)
    this.alerts = [];
    for (const alert of triggeredAlerts) {
      if (!this.acknowledgedAlertIds.has(alert.id)) {
        this.alerts.push(alert);
      }
    }

    // Assign timestamps to active alerts and track when they first occurred
    const now = Date.now();
    let tsChanged = false;
    for (const alert of this.alerts) {
      if (!this.alertTimestamps.has(alert.id)) {
        this.alertTimestamps.set(alert.id, now);
        tsChanged = true;
      }
      alert.timestamp = this.alertTimestamps.get(alert.id);
      alert.time = this.timeAgo(alert.timestamp);
    }

    // Clean up stale alerts from the tracking map
    const activeIds = new Set(this.alerts.map(a => a.id));
    for (const key of Array.from(this.alertTimestamps.keys())) {
      if (!activeIds.has(key)) {
        this.alertTimestamps.delete(key);
        tsChanged = true;
      }
    }

    if (tsChanged) {
      this.saveArchive();
    }

    // Sort by timestamp DESC (most recent alerts at the top)
    this.alerts.sort((a, b) => b.timestamp - a.timestamp);

    // Check if any previous alert is no longer active (returned to normal)
    for (const prev of previousAlerts) {
      if (!activeIds.has(prev.id)) {
        if (!this.archivedAlerts.some(x => x.id === prev.id)) {
          this.archivedAlerts.unshift({
            ...prev,
            resolvedAt: Date.now(),
            time: this.t.justNow || 'Just now',
            resolved: true
          });
        }
      }
    }

    // Keep only last 50 archived alerts
    if (this.archivedAlerts.length > 50) {
      this.archivedAlerts = this.archivedAlerts.slice(0, 50);
    }

    this.buildViewExtras();
  }

  /** Readings strip + alert focus; rebuilt on every data pass, objects reused */
  private buildViewExtras(): void {
    const t = this.t;
    const d = this.data || {};
    const hd = d.hasData || {};
    const [temp, humid, air, noise, presence] = this.readings;

    const trvTarget = this.thermostats.find(x => x.targetTemp != null)?.targetTemp;
    temp.label = t.tileTemp;
    temp.value = this.avgTemp != null ? Number(this.avgTemp).toFixed(1) : '--';
    temp.unit = this.avgTemp != null ? '°C' : '';
    temp.sub = trvTarget != null ? `${t.targetL} ${Math.round(trvTarget)}°` : '';
    temp.tone = hd.temperature ? statusTone(d.tempStatus) : 'off';
    temp.iconClass = hd.temperature ? 'icon-orange' : 'icon-gray';

    humid.label = t.tileHumid;
    humid.value = hd.humidity && d.sensorData?.humidity != null ? String(Math.round(d.sensorData.humidity)) : '--';
    humid.unit = humid.value === '--' ? '' : '%';
    humid.sub = hd.humidity ? (d.humStatus === 'normal' ? t.normal : d.humStatus === 'danger' ? t.cpCritAlert : t.warningC) : '';
    humid.tone = hd.humidity ? statusTone(d.humStatus) : 'off';
    humid.iconClass = hd.humidity ? 'icon-blue' : 'icon-gray';

    const co2 = this.aqSensors.find(x => x.co2 != null)?.co2;
    air.label = t.tileAir;
    air.value = hd.airQuality ? this.aqOverall : '--';
    air.sub = co2 != null ? `CO₂ ${Math.round(co2)} ppm` : '';
    air.tone = hd.airQuality ? (d.airStatus === 'danger' ? 'alert' : d.airStatus === 'warning' ? 'warn' : 'ok') : 'off';
    air.iconClass = hd.airQuality ? 'icon-green' : 'icon-gray';

    const noiseDev = this.noiseSensors[0];
    noise.label = t.tileNoise;
    noise.value = noiseDev && noiseDev.laeq != null ? String(Math.round(noiseDev.laeq)) : '--';
    noise.unit = noise.value === '--' ? '' : 'dB';
    noise.sub = noiseDev ? (noiseDev.levelText || '') : '';
    noise.tone = noiseDev ? (noiseDev.isLoud ? 'warn' : 'plain') : 'off';
    noise.iconClass = noiseDev ? (noiseDev.isLoud ? 'icon-orange' : 'icon-purple') : 'icon-gray';

    const occ = this.occupancySensors[0];
    presence.label = t.presence;
    const presenceWord = occ ? String(occ.isOccupied ? t.occupied : t.vacant) : '';
    presence.value = occ ? presenceWord.charAt(0).toUpperCase() + presenceWord.slice(1).toLowerCase() : '--';
    presence.sub = '';
    presence.tone = occ ? (occ.isOccupied ? 'plain' : 'off') : 'off';
    presence.iconClass = occ && occ.isOccupied ? 'icon-blue' : 'icon-gray';

    this.windowSpan = this.computeWindowSpan();

    // Drop the alert focus when its alert is gone
    if (this.focusAlertId && !this.alerts.some(a => a.id === this.focusAlertId)) {
      this.onAlertFocus(null);
    }
  }

  /** Place the device cards on a 3-track grid in DOM order (thermostats, air x2, noise+presence, leak) and report the free run left for the windows card */
  private computeWindowSpan(): number {
    const items = [
      ...this.thermostats.map(() => 1),
      ...(this.aqSensors.length > 0 ? [2] : []),
      ...(this.noiseSensors.length > 0 || this.occupancySensors.length > 0 ? [1] : []),
      ...(this.waterLeakSensors.length > 0 ? [1] : []),
    ];
    const rows: boolean[][] = [];
    const place = (span: number): { row: number; col: number } => {
      for (let r = 0; ; r++) {
        rows[r] = rows[r] || [false, false, false];
        for (let c = 0; c + span <= 3; c++) {
          if (rows[r].slice(c, c + span).every(x => !x)) {
            for (let k = c; k < c + span; k++) rows[r][k] = true;
            return { row: r, col: c };
          }
        }
      }
    };
    items.forEach(place);
    const lastRow = rows.length ? rows[rows.length - 1] : [false, false, false];
    const free = lastRow.filter(x => !x).length;
    return free === 0 ? 1 : Math.min(2, free);
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  onAlertFocus(alert: any | null): void {
    this.focusAlertId = alert ? alert.id : null;
    this.focusEntity = alert ? this.alertEntity(alert) : null;
  }

  /** The device an alert belongs to — alert ids end with the device's entity name */
  private alertEntity(alert: any): string | null {
    const names = [
      ...this.aqSensors, ...this.allSensors, ...this.smartSockets,
    ].map(x => x.entityName as string).filter(Boolean);
    return names.find(n => String(alert.id).endsWith('-' + n)) ?? null;
  }

  /** No valve telemetry (WT101 doesn't always report valve_opening) → infer from room vs. target temperature. */
  private deriveTrvState(mode: string, current: number | null | undefined, target: number | null | undefined): string {
    if (mode === 'off') return 'off';
    if (current == null || target == null) return 'unknown';
    return current < target - 0.3 ? 'heating' : 'idle';
  }

  private extractDeviceNumber(displayName: string): number {
    const match = displayName.match(/(\d+)\s*$/);
    if (match) return parseInt(match[1], 10);
    const leadMatch = displayName.match(/^(\d+)/);
    return leadMatch ? parseInt(leadMatch[1], 10) : 999;
  }

  private formatDeviceName(name: string, defaultType: string): string {
    if (/win/i.test(name)) {
      const match = name.match(/(\d+)$/);
      if (match) {
        const winLabel = this.translationService.activeLangCode === 'RU' ? 'Окно' : 'Window';
        return `${winLabel}-${match[1]}`;
      }
    }

    // Pattern: type_room_X_Y  (e.g., window_room_6_2, trv_room_6_1, wl_room_5_1)
    const fullMatch = name.match(/^([a-zA-Z]+)_room_(\d+)_(\d+)$/i);
    if (fullMatch) {
      const prefix = fullMatch[1].toUpperCase();
      const deviceNum = fullMatch[3];
      const types: Record<string, string> = {
        WINDOW: this.t.windows, WIN: this.t.windows,
        TRV: 'TRV',
        AQ: this.t.airQuality, AM: this.t.airQuality,
        WL: this.t.waterLeak,
        NS: this.t.noiseLevel, NOISE: this.t.noiseLevel,
        OCC: this.t.occupancy
      };
      return `${types[prefix] || defaultType} ${deviceNum}`;
    }

    // Pattern: type_X_Y (e.g., TRV_6_1)
    const shortMatch = name.match(/^([a-zA-Z]+)_(\d+)_(\d+)$/i);
    if (shortMatch) {
      const prefix = shortMatch[1].toUpperCase();
      const deviceNum = shortMatch[3];
      const types: Record<string, string> = {
        WINDOW: this.t.windows, WIN: this.t.windows,
        TRV: 'TRV',
        AQ: this.t.airQuality, AM: this.t.airQuality,
        WL: this.t.waterLeak,
        NS: this.t.noiseLevel, NOISE: this.t.noiseLevel,
        OCC: this.t.occupancy
      };
      return `${types[prefix] || defaultType} ${deviceNum}`;
    }

    // Pattern: type_X (single device per room)
    const singleMatch = name.match(/^([a-zA-Z]+)_(\d+)$/i);
    if (singleMatch) {
      const prefix = singleMatch[1].toUpperCase();
      const types: Record<string, string> = {
        WINDOW: this.t.windows, WIN: this.t.windows,
        TRV: 'TRV',
        AQ: this.t.airQuality, AM: this.t.airQuality,
        WL: this.t.waterLeak,
        NS: this.t.noiseLevel, NOISE: this.t.noiseLevel,
        OCC: this.t.occupancy
      };
      return types[prefix] || defaultType;
    }

    return name;
  }

  private formatDateTime(isoString: string): string {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: HOTEL_TIMEZONE,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const parts = formatter.formatToParts(d);
      const get = (type: string) => parts.find(p => p.type === type)?.value || '';
      
      return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
    } catch {
      return isoString;
    }
  }

  /** Each WT101 keeps its own card; while linked (the default, 2+ WT101s) a change on one is written to all */
  private markWtLinked(): void {
    const linked = this.wtLinked && this.thermostats.length >= 2;
    for (const trv of this.thermostats) {
      trv.linkedCount = this.roomAssetId ? this.thermostats.length : 1;
      trv.linked = linked;
    }
  }

  private buildTrvSettings(st: WtDeviceState): Record<string, { value: any; sync: WtSync | null }> {
    const s = st.shared;
    const bool = (v: any) => v == null ? null : (v === true || String(v) === 'true');
    const int = (v: any) => v == null ? null : Math.round(+v);
    const range = fieldSync('range', st);
    return {
      wt_child_lock: { value: bool(s.wt_child_lock), sync: fieldSync('lock', st) },
      wt_open_window_detection: { value: bool(s.wt_open_window_detection), sync: fieldSync('window', st) },
      wt_freeze_protection: { value: bool(s.wt_freeze_protection), sync: fieldSync('freeze', st) },
      wt_temp_range_min: { value: int(s.wt_temp_range_min), sync: range },
      wt_temp_range_max: { value: int(s.wt_temp_range_max), sync: range },
    };
  }

  private wtTargets(card: any): string[] {
    return card.linked ? this.thermostats.map(t => t.entityName) : [card.entityName];
  }

  selectMode(card: any, mode: string): void {
    this.writeWt(this.wtTargets(card), { wt_mode: mode });
  }

  /** A manual target change takes the thermostat out of Auto, so hotel automation won't overwrite it */
  onTempChange(card: any, temp: number): void {
    const change: Record<string, any> = { wt_target_temperature: temp };
    if (card.systemMode === 'auto') change.wt_mode = 'manual';
    this.writeWt(this.wtTargets(card), change);
  }

  onSettingChange(card: any, change: { key: string; value: boolean | number }): void {
    if (!(change.key in WT_KEY_FIELD)) return;
    this.writeWt(this.wtTargets(card), { [change.key]: change.value });
  }

  /** Linked ↔ separate; when re-linking from one thermostat, optionally copy its settings to the others */
  onLinkedChange(card: any, e: { linked: boolean; copy: boolean }): void {
    const http = this.data?.ctx?.http;
    if (!http || !this.roomAssetId) return;
    this.wtLinked = e.linked;
    http.post(`/api/plugins/telemetry/ASSET/${this.roomAssetId}/SERVER_SCOPE`, { wt_linked: e.linked }, { ignoreErrors: true, ignoreLoading: true }).subscribe({
      error: (err: any) => console.error('[RoomDetail] Failed to save wt_linked', err)
    });
    if (e.linked && e.copy) {
      const source = this.wtState[card.entityName]?.shared || {};
      const values = Object.fromEntries(WT_SHARED_KEYS.filter(k => source[k] != null).map(k => [k, source[k]]));
      const others = this.thermostats.map(t => t.entityName).filter(n => n !== card.entityName);
      if (Object.keys(values).length) this.writeWt(others, values);
    }
    this.markWtLinked();
    this.cdr.detectChanges();
  }

  /** Validates per device, writes the SHARED wt_* change and shows it locally until the next poll reads it back */
  private writeWt(names: string[], change: Record<string, any>): void {
    const http = this.data?.ctx?.http;
    if (!http) return;
    for (const name of names) {
      const id = this.deviceEntityIdMap[name];
      if (!id) {
        console.warn(`[RoomDetail] writeWt: No deviceId for "${name}"`);
        continue;
      }
      const st = this.wtState[name] ??= { shared: {}, server: {}, error: '' };
      const body = completeChange(change, st.shared, this.data.trvDevices?.[name]?.setPoint ?? null);
      if (!body) continue;
      const before = st.shared;
      st.shared = { ...st.shared, ...body };
      st.sharedTs = { ...st.sharedTs, ...Object.fromEntries(Object.keys(body).map(k => [k, Date.now()])) };
      this.wtWriteAt[name] = Date.now();
      delete this.wtWriteError[name];
      http.post(`/api/plugins/telemetry/DEVICE/${id}/SHARED_SCOPE`, body, { ignoreErrors: true, ignoreLoading: true }).subscribe({
        error: (err: any) => {
          console.error(`[RoomDetail] Failed to write ${Object.keys(body).join(',')} to "${name}"`, err);
          // Undo the optimistic value and say so on the card instead of reverting silently later
          st.shared = before;
          this.wtWriteAt[name] = 0;
          this.wtWriteError[name] = Object.keys(body).join(', ');
          if (this.destroyed) return;
          this.buildFromPassedData();
          this.cdr.detectChanges();
        }
      });
    }
    if (this.destroyed) return;
    this.buildFromPassedData();
    this.cdr.detectChanges();
    if (this.wtRefetch) clearTimeout(this.wtRefetch);
    this.wtRefetch = setTimeout(() => this.fetchWtStates(), 6000);
  }

  private getTrvAlert(name: string, data: any): { icon: string; label: string } | null {
    if (this.data.tamperDevices?.[name]) return { icon: 'build', label: this.t.trvRemoved };
    if (data.calibrationFailed) return { icon: 'error_outline', label: this.t.trvCalibration };
    if (data.windowOpen) return { icon: 'window', label: this.t.trvWindowOpen };
    if (data.freezeTriggered) return { icon: 'ac_unit', label: this.t.freezeProtection };
    return null;
  }

  isSocketOn(socket: any): boolean {
    if (!socket?.state) return false;
    const state = String(socket.state).toLowerCase();
    return state === 'on' || state === 'true' || state === '1';
  }

  toggleSocket(socket: any): void {
    const ctx = this.data?.ctx;
    if (!ctx?.http) return;

    const deviceId = this.deviceEntityIdMap[socket.entityName];
    if (!deviceId) return;

    const isCurrentlyOn = this.isSocketOn(socket);
    const nextState = isCurrentlyOn ? 'OFF' : 'ON';

    // Lock local UI state for 10 seconds to prevent flickering
    socket.state = nextState;
    socket.stateLockUntil = Date.now() + 10000;
    this.cdr.detectChanges();

    const controlKey = socket.controlKey || 'state';
    
    // Determine type
    const isBool = typeof socket.state === 'boolean' || socket.state === 'true' || socket.state === 'false';
    const valueToSend = isBool ? (nextState === 'ON') : nextState;

    ctx.http.post(`/api/plugins/telemetry/DEVICE/${deviceId}/SHARED_SCOPE`, { 
      [controlKey]: valueToSend,
      relayState: nextState === 'ON'
    }, { ignoreErrors: true, ignoreLoading: true }).subscribe(
      () => { this.cdr.detectChanges(); },
      (err) => {
        socket.state = isCurrentlyOn ? 'ON' : 'OFF';
        socket.stateLockUntil = 0;
        this.cdr.detectChanges();
        console.error('Failed to toggle socket state', err);
      }
    );

    ctx.http.post(`/api/rpc/oneway/${deviceId}`, { method: 'set_state', params: valueToSend }, { ignoreErrors: true, ignoreLoading: true }).subscribe({ error: noop });
  }

  timeAgo(ts: any): string {
    if (typeof ts === 'string') return ts;
    return this.roomDataService.timeAgo(ts);
  }

  getLinkQualityText(lqi: number | null): string {
    if (lqi == null) return '--';
    if (lqi >= 150) return this.t.excellent;
    if (lqi >= 100) return this.t.good;
    if (lqi >= 50) return this.t.fair;
    return this.t.poor;
  }

  // ── Battery helpers ──────────────────────────────────────────────

  getBatteryBg(battery: number | null): string {
    if (battery == null) return 'var(--panel2, #1a2230)';
    if (battery <= 20) return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (battery <= 50) return 'var(--warn-soft, rgba(245,181,74,.13))';
    return 'var(--ok-soft, rgba(52,211,153,.13))';
  }

  getBatteryColor(battery: number | null): string {
    if (battery == null) return 'var(--t3, #5c6675)';
    if (battery <= 20) return 'var(--alert, #f87171)';
    if (battery <= 50) return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  getBatteryIcon(battery: number | null): string {
    if (battery == null) return 'battery_unknown';
    if (battery <= 10) return 'battery_alert';
    if (battery <= 25) return 'battery_2_bar';
    if (battery <= 50) return 'battery_4_bar';
    if (battery <= 75) return 'battery_5_bar';
    return 'battery_full';
  }

  // ── Signal helpers ───────────────────────────────────────────────

  getSignalBg(lqi: number | null): string {
    if (lqi == null) return 'var(--panel2, #1a2230)';
    if (lqi < 50) return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (lqi < 100) return 'var(--warn-soft, rgba(245,181,74,.13))';
    return 'var(--ok-soft, rgba(52,211,153,.13))';
  }

  getSignalColor(lqi: number | null): string {
    if (lqi == null) return 'var(--t3, #5c6675)';
    if (lqi < 50) return 'var(--alert, #f87171)';
    if (lqi < 100) return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  // ── Sensor value color helpers ───────────────────────────────────

  getTempColor(temp: number | null): string {
    if (temp == null) return 'var(--t3, #5c6675)';
    if (temp > 28) return 'var(--alert, #f87171)';
    if (temp > 25) return 'var(--warn, #f5b54a)';
    return 'var(--accent, #5c7cfa)';
  }

  getCo2Color(co2: number | null): string {
    if (co2 == null) return 'var(--t3, #5c6675)';
    if (co2 > 1500) return 'var(--alert, #f87171)';
    if (co2 > 1000) return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  loadArchive(): void {
    const scope = `${this.hotelStateService.scopeKey}_${this.roomNumber}`;
    const key = `revelton_hotel_alerts_archive_${scope}`;
    const ackKey = `revelton_hotel_alerts_ack_${scope}`;
    const tsKey = `revelton_hotel_alerts_ts_${scope}`;
    try {
      const dataStr = localStorage.getItem(key);
      if (dataStr) {
        const parsed = JSON.parse(dataStr) as any[];
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.archivedAlerts = parsed.filter(a => {
          const timestamp = a.resolvedAt || a.timestamp || Date.now();
          return timestamp > oneDayAgo;
        });
      } else {
        this.archivedAlerts = [];
      }

      const ackStr = localStorage.getItem(ackKey);
      if (ackStr) {
        this.acknowledgedAlertIds = new Set(JSON.parse(ackStr));
      } else {
        this.acknowledgedAlertIds = new Set();
      }

      const tsStr = localStorage.getItem(tsKey);
      if (tsStr) {
        const parsed = JSON.parse(tsStr);
        this.alertTimestamps = new Map(Object.entries(parsed) as any);
      } else {
        this.alertTimestamps = new Map();
      }
    } catch (e) {
      console.error('Failed to load archived/acknowledged alerts', e);
      this.archivedAlerts = [];
      this.acknowledgedAlertIds = new Set();
      this.alertTimestamps = new Map();
    }
  }

  saveArchive(): void {
    const scope = `${this.hotelStateService.scopeKey}_${this.roomNumber}`;
    const key = `revelton_hotel_alerts_archive_${scope}`;
    const ackKey = `revelton_hotel_alerts_ack_${scope}`;
    const tsKey = `revelton_hotel_alerts_ts_${scope}`;
    try {
      localStorage.setItem(key, JSON.stringify(this.archivedAlerts));
      localStorage.setItem(ackKey, JSON.stringify(Array.from(this.acknowledgedAlertIds)));
      const tsObj = Object.fromEntries(this.alertTimestamps.entries());
      localStorage.setItem(tsKey, JSON.stringify(tsObj));
    } catch (e) {
      console.error('Failed to save archived/acknowledged alerts', e);
    }
  }

  cleanExpiredArchivedAlerts(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const initialLength = this.archivedAlerts.length;
    this.archivedAlerts = this.archivedAlerts.filter(a => {
      const timestamp = a.resolvedAt || a.timestamp || Date.now();
      return timestamp > oneDayAgo;
    });
    if (this.archivedAlerts.length !== initialLength) {
      this.saveArchive();
    }
  }

  acknowledgeAllAlerts(): void {
    [...this.alerts].forEach(a => this.acknowledgeAlert(a));
  }

  acknowledgeAlert(alert: any): void {
    if (alert.id === this.focusAlertId) this.onAlertFocus(null);
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
    this.alertTimestamps.delete(alert.id);
    this.acknowledgedAlertIds.add(alert.id);
    if (!this.archivedAlerts.some(x => x.id === alert.id)) {
      this.archivedAlerts.unshift({
        ...alert,
        resolvedAt: Date.now(),
        time: this.t.justNow || 'Just now',
        resolved: true
      });
    }
    if (this.archivedAlerts.length > 50) {
      this.archivedAlerts = this.archivedAlerts.slice(0, 50);
    }
    this.saveArchive();
  }

  trackByEntityName(index: number, item: any): string {
    return item.entityName;
  }

  isMotionActive(val: any): boolean {
    if (val === null || val === undefined) return false;
    const s = String(val).toLowerCase().trim();
    return ['motion', 'active', 'true', '1', 'yes', 'trigger', 'triggered', 'occupied'].includes(s);
  }
}
