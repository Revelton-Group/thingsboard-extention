import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef, Input, Output, EventEmitter, Optional, OnChanges, SimpleChanges } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RoomDataService } from '../../core/services/room-data.service';
import { TranslationService } from '../../core/services/translation.service';
import { HotelStateService, InlineRoom } from '../../core/services/hotel-state.service';
import { ControlPanelService } from '../control-panel/services/control-panel.service';

/** Set to true to enable verbose console logging during development */
const DEBUG = false;

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
  @Output() close = new EventEmitter<void>();

  // Sparkline data
  tempSparkData: number[] = [];
  humSparkData: number[] = [];
  co2SparkData: number[] = [];
  aqiSparkData: number[] = [];

  tempMin: number | null = null;
  tempAvg: number | null = null;
  tempMax: number | null = null;

  humMin: number | null = null;
  humAvg: number | null = null;
  humMax: number | null = null;

  co2Min: number | null = null;
  co2Avg: number | null = null;
  co2Max: number | null = null;

  aqiMin: number | null = null;
  aqiAvg: number | null = null;
  aqiMax: number | null = null;

  // Computed status/color for vitals
  tempStatus = 'normal';
  humStatus = 'normal';
  co2Status = 'normal';
  co2Value: number | null = null;
  aqiScore: number | null = null;

  get tempColor(): string {
    if (this.tempStatus === 'danger') return 'var(--alert, #f87171)';
    if (this.tempStatus === 'warning') return 'var(--warn, #f5b54a)';
    return 'var(--accent, #5c7cfa)';
  }

  get co2Color(): string {
    if (this.co2Status === 'danger') return 'var(--alert, #f87171)';
    if (this.co2Status === 'warning') return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  get aqiColor(): string {
    if (this.aqOverall === 'Hazardous') return 'var(--alert, #f87171)';
    if (this.aqOverall === 'Poor' || this.aqOverall === 'Unhealthy') return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  get aqiColorBg(): string {
    if (this.aqOverall === 'Hazardous') return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (this.aqOverall === 'Poor' || this.aqOverall === 'Unhealthy') return 'var(--warn-soft, rgba(245,181,74,.13))';
    return 'var(--ok-soft, rgba(52,211,153,.13))';
  }

  private lastFetchedRoom: string = '';

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

  // Mode / Preset options
  get modes() {
    return [
      { id: 'auto', label: this.t.auto, icon: 'autorenew', color: '#34C759' },
      { id: 'heat', label: this.t.heat, icon: 'local_fire_department', color: '#FF9500' },
      { id: 'off', label: this.t.off, icon: 'power_settings_new', color: '#8E8E93' }
    ];
  }

  get presets() {
    return [
      { id: 'eco', label: this.t.eco, icon: 'eco', color: '#34C759' },
      { id: 'comfort', label: this.t.comfort, icon: 'fireplace', color: '#FF9500' },
      { id: 'manual', label: this.t.manual, icon: 'pan_tool', color: '#007AFF' }
    ];
  }

  getThermostatSectionColor(): string {
    if (!this.thermostats || this.thermostats.length === 0) return '';
    const trv = this.thermostats[0];
    const mode = trv.runningState || trv.systemMode;
    if (mode === 'off' || mode === 'fan') return '#8E8E93';
    if (mode === 'heat' || mode === 'heating') return '#FF9500';
    if (mode === 'cool' || mode === 'cooling' || mode === 'idle') return '#06B6D4';
    return '#34C759'; // auto/default
  }

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
  alertTimestamps: Map<string, number> = new Map();
  archivedAlerts: any[] = [];
  acknowledgedAlertIds: Set<string> = new Set();
  logs: any[] = [];
  private archiveLoaded = false;

  // Preset temperature memory: { 'trv_room_1': { 'manual': 22, 'eco': 15, 'comfort': 20 } }
  private presetMemory: Record<string, Record<string, number>> = {};

  // RPC: entityName → entityId (UUID) lookup map
  deviceEntityIdMap: { [entityName: string]: string } = {};

  private refreshInterval: any;
  private configSub: any;

  // ── Vitals Time Range ──────────────────────────────────────────
  /** Time range for vitals sparklines and expand modal: 24 | 168 | 720 hours */
  vitalsTimeRange: number = 24;

  setVitalsTimeRange(hours: number): void {
    this.vitalsTimeRange = hours;
    this.fetchHistoricalVitals();
    this.cdr.detectChanges();
  }

  // ── Inline Historical Telemetry State ──────────────────────────────
  /** Time range for inline historical section: 24 | 168 | 720 hours or 'custom' */
  histTimeRange: number | 'custom' = 24;
  histCustomStartDate: string = '';
  histCustomStartHour: string = '00';
  histCustomStartMin: string = '00';
  histCustomEndDate: string = '';
  histCustomEndHour: string = '00';
  histCustomEndMin: string = '00';

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

  histAppliedCustomStart: string = '';
  histAppliedCustomEnd: string = '';
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

  closeHistoricalData(): void {
    this.showHistoricalData = true;
    this.cdr.detectChanges();
  }

  // ── Vital Expand Modal State ────────────────────────────────────
  expandedVitalKey: string | null = null;
  expandedVitalTint = '';
  expandedVitalColor = '';
  expandedVitalIcon = '';
  expandedVitalLabel = '';
  expandedVitalValue = '';
  expandedVitalDeg = '';
  expandedVitalUnit = '';
  expandedVitalStat = '';
  expandedVitalScBg = '';
  expandedVitalSc = '';
  expandedVitalMin = '';
  expandedVitalAvg = '';
  expandedVitalMax = '';

  expandVital(key: string): void {
    this.expandedVitalKey = key;
    const cfg = this.getVitalConfig(key);
    this.expandedVitalTint = cfg.tint;
    this.expandedVitalColor = cfg.color;
    this.expandedVitalIcon = cfg.icon;
    this.expandedVitalLabel = cfg.label;
    this.expandedVitalValue = cfg.value;
    this.expandedVitalDeg = cfg.deg;
    this.expandedVitalUnit = cfg.unit;
    this.expandedVitalStat = cfg.stat;
    this.expandedVitalScBg = cfg.scBg;
    this.expandedVitalSc = cfg.sc;
    this.expandedVitalMin = cfg.min;
    this.expandedVitalAvg = cfg.avg;
    this.expandedVitalMax = cfg.max;
    this.cdr.detectChanges();
  }

  closeExpandedVital(): void {
    this.expandedVitalKey = null;
    this.cdr.detectChanges();
  }

  private getVitalConfig(key: string): any {
    const def = { tint: '', color: '', icon: '', label: key, value: '--', deg: '', unit: '', stat: 'NORMAL', scBg: 'var(--ok-soft)', sc: 'var(--ok)', min: '--', avg: '--', max: '--' };
    switch (key) {
      case 'temperature':
        return {
          ...def,
          tint: 'rgba(245,181,74,.13)',
          color: this.tempColor,
          icon: 'device_thermostat',
          label: this.t.temperature || 'Temperature',
          value: this.avgTemp !== null ? this.avgTemp.toFixed(1) : '--',
          deg: '°',
          unit: 'C',
          stat: this.tempStatus === 'danger' ? 'CRITICAL' : (this.tempStatus === 'warning' ? 'WARNING' : 'NORMAL'),
          scBg: this.tempStatus === 'danger' ? 'var(--alert-soft)' : (this.tempStatus === 'warning' ? 'var(--warn-soft)' : 'var(--ok-soft)'),
          sc: this.tempStatus === 'danger' ? 'var(--alert)' : (this.tempStatus === 'warning' ? 'var(--warn)' : 'var(--ok)'),
          min: this.tempMin !== null ? this.tempMin.toFixed(1) : '--',
          avg: this.tempAvg !== null ? this.tempAvg.toFixed(1) : '--',
          max: this.tempMax !== null ? this.tempMax.toFixed(1) : '--'
        };
      case 'humidity':
        return {
          ...def,
          tint: 'rgba(92,124,250,.14)',
          color: 'var(--accent, #5c7cfa)',
          icon: 'water_drop',
          label: this.t.humidity || 'Humidity',
          value: this.avgHum !== null ? this.avgHum.toFixed(0) : '--',
          deg: '',
          unit: '%',
          stat: this.humStatus === 'danger' ? 'CRITICAL' : (this.humStatus === 'warning' ? 'WARNING' : 'NORMAL'),
          scBg: this.humStatus === 'danger' ? 'var(--alert-soft)' : (this.humStatus === 'warning' ? 'var(--warn-soft)' : 'var(--ok-soft)'),
          sc: this.humStatus === 'danger' ? 'var(--alert)' : (this.humStatus === 'warning' ? 'var(--warn)' : 'var(--ok)'),
          min: this.humMin !== null ? this.humMin.toFixed(0) : '--',
          avg: this.humAvg !== null ? this.humAvg.toFixed(0) : '--',
          max: this.humMax !== null ? this.humMax.toFixed(0) : '--'
        };
      case 'co2':
        return {
          ...def,
          tint: 'rgba(52,211,153,.13)',
          color: this.co2Color,
          icon: 'co2',
          label: 'CO₂',
          value: this.co2Value !== null ? this.co2Value.toFixed(0) : '--',
          deg: '',
          unit: 'ppm',
          stat: this.co2Status === 'danger' ? 'CRITICAL' : (this.co2Status === 'warning' ? 'WARNING' : 'NORMAL'),
          scBg: this.co2Status === 'danger' ? 'var(--alert-soft)' : (this.co2Status === 'warning' ? 'var(--warn-soft)' : 'var(--ok-soft)'),
          sc: this.co2Status === 'danger' ? 'var(--alert)' : (this.co2Status === 'warning' ? 'var(--warn)' : 'var(--ok)'),
          min: this.co2Min !== null ? this.co2Min.toFixed(0) : '--',
          avg: this.co2Avg !== null ? this.co2Avg.toFixed(0) : '--',
          max: this.co2Max !== null ? this.co2Max.toFixed(0) : '--'
        };
      case 'aqi':
        return {
          ...def,
          tint: this.aqiColorBg,
          color: this.aqiColor,
          icon: 'air',
          label: this.t.airQuality || 'Air Quality',
          value: this.aqiScore !== null ? String(this.aqiScore) : '--',
          deg: '',
          unit: 'AQI',
          stat: this.aqOverall === 'Good' ? 'NORMAL' : (this.aqOverall === 'Hazardous' ? 'CRITICAL' : 'WARNING'),
          scBg: this.aqiColorBg,
          sc: this.aqiColor,
          min: this.aqiMin !== null ? String(this.aqiMin) : '--',
          avg: this.aqiAvg !== null ? String(this.aqiAvg) : '--',
          max: this.aqiMax !== null ? String(this.aqiMax) : '--'
        };
      default:
        return def;
    }
  }

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any,
    @Optional() private dialogRef: MatDialogRef<RoomDetailPanelComponent>,
    private cdr: ChangeDetectorRef,
    private roomDataService: RoomDataService,
    private translationService: TranslationService,
    private hotelStateService: HotelStateService,
    private controlPanelService: ControlPanelService
  ) {}

  ngOnInit(): void {

    if (this.dialogData) {
      this.data = this.dialogData;
    }
    this.initializeData();

    this.refreshInterval = setInterval(() => {
      this.updateData();
    }, 10000);

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
    this.fetchHistoricalVitals();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.configSub) this.configSub.unsubscribe();
  }

  private attributesInitialized = false;

  public updateData(): void {
    this.buildFromPassedData();
    this.fetchHistoricalVitals();
    if (!this.attributesInitialized && this.thermostats.length > 0) {
      this.attributesInitialized = true;
      this.initializeSharedAttributes();
    }
    this.cdr.detectChanges();
  }

  private initializeSharedAttributes(): void {
    const ctx = this.data?.ctx;
    if (!ctx?.http) return;

    for (const trv of this.thermostats) {
      const deviceId = this.deviceEntityIdMap[trv.entityName];
      if (!deviceId) continue;

      ctx.http.get(`/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/SHARED_SCOPE?keys=current_heating_setpoint,system_mode,preset`).subscribe(
        (res: any) => {
          if (!this.data.trvDevices || !this.data.trvDevices[trv.entityName]) return;
          const trvData = this.data.trvDevices[trv.entityName];
          
          const setPointObj = res.find((r: any) => r.key === 'current_heating_setpoint');
          if (setPointObj !== undefined && setPointObj.value !== undefined) {
             trvData.sharedSetPoint = parseFloat(setPointObj.value);
             trv.targetTemp = trvData.sharedSetPoint;
          }
          
          this.cdr.detectChanges();
        },
        (err: any) => {
          console.error("Failed to fetch shared attributes for", trv.entityName, err);
        }
      );
    }
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    this.close.emit();
  }

  public buildFromPassedData(): void {
    if (!this.data) return;

    const prevThermostats = this.thermostats;
    const prevSockets = this.smartSockets;
    this.thermostats = [];
    this.smartSockets = [];
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
      this.bookingDisplay = res.bookDisplay || this.bookingDisplay;
      this.occupancyDisplay = res.checkDisplay === 'In' ? this.t.occupied : (res.checkDisplay === 'Wait' ? this.t.loading : (res.checkDisplay === 'Out' ? this.t.vacant : this.occupancyDisplay));
      this.statusSummary = res.statusSummary || '';
      this.checkoutRemaining = res.checkoutRemaining || '';
    }

    // Thermostats
    const trvData = this.data.trvDevices || {};
    for (const [name, data] of Object.entries(trvData) as any) {
      let trv = prevThermostats.find(t => t.entityName === name);
      const now = Date.now();
      const serverMode = data.system_mode || 'auto';
      const serverPreset = data.preset || 'manual';
      const serverTarget = data.sharedSetPoint ?? data.setPoint ?? null;
      const clientTarget = data.clientSetPoint ?? data.setPoint ?? null;

      const finalMode = trv && now < (trv.modeLockUntil || 0) ? trv.systemMode : serverMode;
      const finalPreset = trv && now < (trv.presetLockUntil || 0) ? trv.preset : serverPreset;
      const finalTarget = trv && now < (trv.tempLockUntil || 0) ? trv.targetTemp : serverTarget;

      const freshData = {
        entityName: name,
        displayName: this.formatTrvDisplayName(name, this.data.deviceMeta?.[name]?.location),
        currentTemp: this.data.tempDevices?.[name] ?? null,
        targetTemp: finalTarget,
        clientTargetTemp: clientTarget,
        systemMode: finalMode,
        runningState: data.status || 'unknown',
        preset: finalPreset,
        battery: this.data.batteryDevices?.[name] ?? null,
        batteryLow: this.data.batteryLowDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? 200,
        model: this.data.deviceMeta?.[name]?.model ?? 'Tuya TS0601',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.data.offlineDevices?.[name] ?? false,
        ecoTemp: data.eco_temperature ?? 15,
        comfortTemp: data.comfort_temperature ?? 20
      };

      if (trv) {
        Object.assign(trv, freshData);
        this.thermostats.push(trv);
      } else {
        this.thermostats.push({ ...freshData, modeOpen: false, presetOpen: false, rpcPending: false, modeLockUntil: 0, presetLockUntil: 0, tempLockUntil: 0 });
      }
    }

    // Window Sensors
    const winDevices = this.data.windowDevices || {};
    for (const [name, data] of Object.entries(winDevices) as any) {
      const isWindowOpen = data.contact === 'open';
      let displayName = this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Window');
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
        model: this.data.deviceMeta?.[name]?.model ?? 'Tuya TS0203',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.data.offlineDevices?.[name] ?? false,
        tamper: this.data.tamperDevices?.[name]
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
      let displayName = this.data.deviceMeta?.[name]?.location || 'Water Leak';
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
        offline: this.data.offlineDevices?.[name] ?? false,
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
        offline: this.data.offlineDevices?.[name] ?? false,
        laeq: data.laeq ?? null,
        lai: data.lai ?? null,
        laimax: data.laimax ?? null,
        isLoud: !quiet
      });
    }

    // Occupancy Sensors
    const occupancyDevices = this.data.occupancyDevices || {};
    for (const [name, data] of Object.entries(occupancyDevices) as any) {
      const isWS301 = name.toUpperCase().includes('WS301') || name.toUpperCase().includes('VS370') || name.toUpperCase().includes('VS3') || name.toUpperCase().includes('370') || name.toUpperCase().includes('OCC') || name.toUpperCase().includes('PRESENCE') || name.toUpperCase().includes('RADAR') || name.toUpperCase().includes('MOTION');
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
        illuminance: data.illuminance || null,
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
        offline: this.data.offlineDevices?.[name] ?? false,
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
        offline: this.data.offlineDevices?.[name] ?? false,
      });
    }

    // Smart Sockets
    const plugData = this.data.plugDevices || {};
    for (const [name, data] of Object.entries(plugData) as any) {
      let socket = prevSockets.find(s => s.entityName === name);
      const now = Date.now();
      const serverState = data.state ?? 'OFF';
      const finalState = socket && now < (socket.stateLockUntil || 0) ? socket.state : serverState;

      this.smartSockets.push({
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || name,
        state: finalState,
        power: data.power ?? null,
        voltage: data.voltage ?? null,
        current: data.current ?? null,
        energyToday: data.energyToday ?? null,
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model ?? 'Smart Plug',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.data.offlineDevices?.[name] ?? false,
        controlKey: data.controlKey || 'state',
        stateLockUntil: socket ? socket.stateLockUntil : 0
      });
    }

    // Sorting
    this.thermostats.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    this.aqSensors.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    this.smartSockets.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));

    // Partition allSensors into typed categories for new card layout
    this.allRawSensors = [...this.allSensors];
    this.occupancySensors = this.allSensors.filter(s => s.type === 'occupancy');
    this.windowSensors = this.allSensors.filter(s => s.type === 'window');
    this.waterLeakSensors = this.allSensors.filter(s => s.type === 'water');
    this.noiseSensors = this.allSensors.filter(s => s.type === 'noise');

    // Sort each category by device number
    for (const arr of [this.occupancySensors, this.windowSensors, this.waterLeakSensors, this.noiseSensors]) {
      arr.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    }

    // Compute status fields for vitals
    this.tempStatus = this.data.tempStatus || 'normal';
    this.humStatus = this.data.humStatus || 'normal';
    this.co2Value = this.aqSensors.length > 0 ? this.aqSensors[0].co2 : null;
    if (this.co2Value !== null) {
      if (this.co2Value > 1500) this.co2Status = 'danger';
      else if (this.co2Value > 1000) this.co2Status = 'warning';
      else this.co2Status = 'normal';
    }
    this.aqiScore = this.aqSensors.length > 0 ? (this.aqSensors[0].aqiScore ?? null) : null;
    if (this.aqiScore !== null) {
      this.aqiMin = this.aqiMin ?? this.aqiScore;
      this.aqiMax = this.aqiMax ?? this.aqiScore;
      this.aqiAvg = this.aqiScore;
    }

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
          message: `${this.t.temperature} is ${this.avgTemp}°C (${tempStatus === 'danger' ? this.t.cpCritAlert : 'Warning'})`,
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
          message: `${this.t.humidity} is ${this.avgHum}% (${humStatus === 'danger' ? this.t.cpCritAlert : 'Warning'})`,
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
            message: `CO₂ level is high: ${aq.co2} ppm (Max: ${config.airQuality.co2Max} ppm)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.pm25 !== null && aq.pm25 >= config.airQuality.pm25Max) {
          triggeredAlerts.push({
            id: `pm25-${aq.entityName}`,
            title: `PM2.5`,
            message: `PM2.5 level is high: ${aq.pm25} µg/m³ (Max: ${config.airQuality.pm25Max} µg/m³)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.pm10 !== null && aq.pm10 >= config.airQuality.pm10Max) {
          triggeredAlerts.push({
            id: `pm10-${aq.entityName}`,
            title: `PM10`,
            message: `PM10 level is high: ${aq.pm10} µg/m³ (Max: ${config.airQuality.pm10Max} µg/m³)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.tvoc !== null && aq.tvoc >= config.airQuality.tvocMax) {
          triggeredAlerts.push({
            id: `tvoc-${aq.entityName}`,
            title: `TVOC`,
            message: `TVOC level is high: ${aq.tvoc} ppb (Max: ${config.airQuality.tvocMax} ppb)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.temperature !== null && aq.temperature >= config.airQuality.tempMax) {
          triggeredAlerts.push({
            id: `temp-aq-${aq.entityName}`,
            title: `${this.t.temperature}`,
            message: `Temperature is high: ${aq.temperature}°C (Max: ${config.airQuality.tempMax}°C)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.humidity !== null && aq.humidity >= config.airQuality.humMax) {
          triggeredAlerts.push({
            id: `hum-aq-${aq.entityName}`,
            title: `${this.t.humidity}`,
            message: `Humidity is high: ${aq.humidity}% (Max: ${config.airQuality.humMax}%)`,
            time: this.t.justNow || 'Just now',
            severity: 'warning'
          });
        }
        if (aq.pressure !== null && aq.pressure >= config.airQuality.pressMax) {
          triggeredAlerts.push({
            id: `press-aq-${aq.entityName}`,
            title: `Pressure`,
            message: `Pressure is high: ${aq.pressure} hPa (Max: ${config.airQuality.pressMax} hPa)`,
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
              title: `Noise LAeq`,
              message: `Noise level (LAeq) exceeded: ${Math.round(laeq)} dBA (Max: ${config.noise.laeqMax} dBA)`,
              time: this.t.justNow || 'Just now',
              severity: 'warning'
            });
          }
          if (lai >= config.noise.laiMax) {
            triggeredAlerts.push({
              id: `noise-lai-${s.entityName}`,
              title: `Noise LAI`,
              message: `Noise level (LAI) exceeded: ${Math.round(lai)} dBA (Max: ${config.noise.laiMax} dBA)`,
              time: this.t.justNow || 'Just now',
              severity: 'warning'
            });
          }
          if (laimax >= config.noise.laimaxMax) {
            triggeredAlerts.push({
              id: `noise-laimax-${s.entityName}`,
              title: `Noise LAImax`,
              message: `Noise level (LAImax) exceeded: ${Math.round(laimax)} dBA (Max: ${config.noise.laimaxMax} dBA)`,
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

    if (config.window && config.window.enabled) {
      for (const s of this.allSensors) {
        if (s.type === 'window' && s.isOpen) {
          triggeredAlerts.push({
            id: `window-${s.entityName}`,
            title: s.displayName,
            message: this.translationService.activeLangCode === 'RU' ? 'открыто' : 'open',
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
  }

  private extractDeviceNumber(displayName: string): number {
    const match = displayName.match(/(\d+)\s*$/);
    if (match) return parseInt(match[1], 10);
    const leadMatch = displayName.match(/^(\d+)/);
    return leadMatch ? parseInt(leadMatch[1], 10) : 999;
  }

  private formatTrvDisplayName(entityName: string, _location?: string): string {
    return this.formatDeviceName(entityName, 'TRV');
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
        timeZone: 'Europe/Prague',
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

  selectMode(trv: any, modeId: string): void {
    trv.systemMode = modeId;
    trv.modeLockUntil = Date.now() + 10000;
    this.saveAttribute(trv, 'system_mode', modeId);
  }

  selectPreset(trv: any, presetId: string): void {
    if (!this.presetMemory[trv.entityName]) this.presetMemory[trv.entityName] = {};
    if (trv.targetTemp != null) this.presetMemory[trv.entityName][trv.preset] = trv.targetTemp;

    trv.preset = presetId;
    trv.presetOpen = false;
    trv.presetLockUntil = Date.now() + 10000;
    this.saveAttribute(trv, 'preset', presetId);

    const restoredTemp = this.presetMemory[trv.entityName][presetId] ?? (presetId === 'eco' ? trv.ecoTemp : presetId === 'comfort' ? trv.comfortTemp : null);
    if (restoredTemp != null) {
      trv.targetTemp = restoredTemp;
      trv.tempLockUntil = Date.now() + 10000;
      this.saveAttribute(trv, 'current_heating_setpoint', restoredTemp);
    }
  }

  toggleMode(event: MouseEvent, trv: any): void {
    event.stopPropagation();
    trv.modeOpen = !trv.modeOpen;
    if (trv.modeOpen) trv.presetOpen = false;
    this.cdr.detectChanges();
  }

  togglePreset(event: MouseEvent, trv: any): void {
    event.stopPropagation();
    trv.presetOpen = !trv.presetOpen;
    if (trv.presetOpen) trv.modeOpen = false;
    this.cdr.detectChanges();
  }

  onTempChange(trv: any, newTemp: number): void {
    trv.targetTemp = newTemp;
    trv.tempLockUntil = Date.now() + 10000;
    if (!this.presetMemory[trv.entityName]) this.presetMemory[trv.entityName] = {};
    this.presetMemory[trv.entityName][trv.preset || 'manual'] = newTemp;
    this.saveAttribute(trv, 'current_heating_setpoint', newTemp);
  }

  private saveAttribute(trv: any, key: string, value: any): void {
    const ctx = this.data?.ctx;
    if (!ctx?.http) return;

    const deviceId = this.deviceEntityIdMap[trv.entityName];
    if (!deviceId) return;

    trv.rpcPending = true;
    this.cdr.detectChanges();

    // Persist locally so it survives dialog close even if websocket doesn't immediately push it
    if (this.data && this.data.trvDevices && this.data.trvDevices[trv.entityName]) {
      if (key === 'current_heating_setpoint') {
        this.data.trvDevices[trv.entityName].sharedSetPoint = value;
      } else if (key === 'system_mode') {
        this.data.trvDevices[trv.entityName].system_mode = value;
      } else if (key === 'preset') {
        this.data.trvDevices[trv.entityName].preset = value;
      }
    }

    // Sync Shared Attribute
    ctx.http.post(`/api/plugins/telemetry/DEVICE/${deviceId}/SHARED_SCOPE`, { [key]: value }).subscribe(
      () => { trv.rpcPending = false; this.cdr.detectChanges(); },
      () => { trv.rpcPending = false; this.cdr.detectChanges(); }
    );

    // One-way RPC
    const methods: any = { 'current_heating_setpoint': 'set_temperature', 'system_mode': 'set_system_mode', 'preset': 'set_preset' };
    if (methods[key]) {
      ctx.http.post(`/api/rpc/oneway/${deviceId}`, { method: methods[key], params: value }).subscribe();
    }
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

    ctx.http.post(`/api/plugins/telemetry/DEVICE/${deviceId}/SHARED_SCOPE`, { [controlKey]: valueToSend }).subscribe(
      () => { this.cdr.detectChanges(); },
      (err) => {
        socket.state = isCurrentlyOn ? 'ON' : 'OFF';
        socket.stateLockUntil = 0;
        this.cdr.detectChanges();
        console.error('Failed to toggle socket state', err);
      }
    );

    ctx.http.post(`/api/rpc/oneway/${deviceId}`, { method: 'set_state', params: valueToSend }).subscribe(
      () => {},
      () => {}
    );
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

  getLinkQualityClass(lqi: number | null): string {
    if (lqi == null) return 'meta-item-gray';
    if (lqi >= 100) return 'meta-item-green';
    if (lqi >= 50) return 'meta-item-orange';
    return 'meta-item-gray';
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
    const key = `revelton_alerts_archive_${this.roomNumber}`;
    const ackKey = `revelton_alerts_ack_${this.roomNumber}`;
    const tsKey = `revelton_alerts_ts_${this.roomNumber}`;
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
    const key = `revelton_alerts_archive_${this.roomNumber}`;
    const ackKey = `revelton_alerts_ack_${this.roomNumber}`;
    const tsKey = `revelton_alerts_ts_${this.roomNumber}`;
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

  acknowledgeAlert(alert: any): void {
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

  trackById(index: number, item: any): string | number {
    return item.id;
  }

  fetchHistoricalVitals(): void {
    const ctx = this.data?.ctx;
    const http = ctx?.http;
    if (!http || !this.deviceEntityIdMap || this.roomNumber === '--') {
      return;
    }
    // Re-fetch when room or time range changes
    const cacheKey = `${this.roomNumber}_${this.vitalsTimeRange}`;
    if (cacheKey === this.lastFetchedRoom) return;
    this.lastFetchedRoom = cacheKey;

    const endTs = Date.now();
    const startTs = endTs - (this.vitalsTimeRange * 60 * 60 * 1000);
    const limit = this.vitalsTimeRange <= 24 ? 300 : (this.vitalsTimeRange <= 168 ? 1000 : 2000);

    // Identify AQ, Temp, Hum device IDs
    let aqDeviceId: string | null = null;
    let tempDeviceId: string | null = null;
    let humDeviceId: string | null = null;

    if (this.aqSensors?.length > 0) {
      aqDeviceId = this.deviceEntityIdMap[this.aqSensors[0].entityName] ?? null;
    } else {
      const aqKey = Object.keys(this.deviceEntityIdMap).find(name => /^(aq|am|air)/i.test(name));
      if (aqKey) aqDeviceId = this.deviceEntityIdMap[aqKey];
    }

    const tempKeys = Object.keys(this.data.tempDevices || {}).filter(k => !/trv/i.test(k) && !/thermostat/i.test(k));
    if (tempKeys.length > 0) tempDeviceId = this.deviceEntityIdMap[tempKeys[0]] ?? null;

    const humKeys = Object.keys(this.data.humDevices || {});
    if (humKeys.length > 0) humDeviceId = this.deviceEntityIdMap[humKeys[0]] ?? null;

    const keysToFetch = 'temperature,humidity,co2,temp,hum,data_temperature,data_humidity,data_co2';
    const safeFetch = (id: string | null): Promise<any> => {
      if (!id) return Promise.resolve(null);
      return http.get(`/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${keysToFetch}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`).toPromise().catch(() => null);
    };

    const uniqueIds = [...new Set([aqDeviceId, tempDeviceId, humDeviceId].filter(Boolean))];
    Promise.all(uniqueIds.map(id => safeFetch(id))).then((results) => {
      let tempPoints: any[] = [];
      let humPoints: any[] = [];
      let co2Points: any[] = [];

      uniqueIds.forEach((id, index) => {
        const resData = results[index];
        if (!resData) return;

        if (id === tempDeviceId || (!tempDeviceId && id === aqDeviceId)) {
          tempPoints = resData['temperature'] || resData['temp'] || resData['data_temperature'] || [];
        }
        if (id === humDeviceId || (!humDeviceId && id === aqDeviceId)) {
          humPoints = resData['humidity'] || resData['hum'] || resData['data_humidity'] || [];
        }
        if (id === aqDeviceId) {
          co2Points = resData['co2'] || resData['data_co2'] || [];
        }
      });

      // Extract values as number arrays
      this.tempSparkData = tempPoints.map(p => Number(p.value)).filter(v => !isNaN(v));
      this.humSparkData = humPoints.map(p => Number(p.value)).filter(v => !isNaN(v));
      this.co2SparkData = co2Points.map(p => Number(p.value)).filter(v => !isNaN(v));

      // Calculate Min, Avg, Max
      if (this.tempSparkData.length > 0) {
        this.tempMin = Math.min(...this.tempSparkData);
        this.tempMax = Math.max(...this.tempSparkData);
        this.tempAvg = this.tempSparkData.reduce((a, b) => a + b, 0) / this.tempSparkData.length;
      } else if (this.avgTemp !== null) {
        // Fallback simulation if timeseries is empty
        this.tempMin = this.avgTemp - 0.6;
        this.tempMax = this.avgTemp + 0.8;
        this.tempAvg = this.avgTemp;
        this.tempSparkData = [this.avgTemp - 0.5, this.avgTemp - 0.2, this.avgTemp + 0.1, this.avgTemp - 0.3, this.avgTemp + 0.4, this.avgTemp];
      }

      if (this.humSparkData.length > 0) {
        this.humMin = Math.min(...this.humSparkData);
        this.humMax = Math.max(...this.humSparkData);
        this.humAvg = this.humSparkData.reduce((a, b) => a + b, 0) / this.humSparkData.length;
      } else if (this.avgHum !== null) {
        // Fallback simulation if timeseries is empty
        this.humMin = Math.max(0, this.avgHum - 3);
        this.humMax = Math.min(100, this.avgHum + 4);
        this.humAvg = this.avgHum;
        this.humSparkData = [this.avgHum - 2, this.avgHum + 1, this.avgHum - 1, this.avgHum + 3, this.avgHum - 2, this.avgHum];
      }

      const co2Val = this.aqSensors?.length > 0 ? this.aqSensors[0].co2 : null;
      if (this.co2SparkData.length > 0) {
        this.co2Min = Math.min(...this.co2SparkData);
        this.co2Max = Math.max(...this.co2SparkData);
        this.co2Avg = this.co2SparkData.reduce((a, b) => a + b, 0) / this.co2SparkData.length;
      } else if (co2Val !== null && co2Val !== undefined) {
        const val = Number(co2Val);
        this.co2Min = Math.max(300, val - 80);
        this.co2Max = val + 120;
        this.co2Avg = val;
        this.co2SparkData = [val - 50, val + 80, val - 30, val + 100, val - 20, val];
      }

      this.cdr.detectChanges();
    });
  }

  isMotionActive(val: any): boolean {
    if (val === null || val === undefined) return false;
    const s = String(val).toLowerCase().trim();
    return ['motion', 'active', 'true', '1', 'yes'].includes(s);
  }
}
