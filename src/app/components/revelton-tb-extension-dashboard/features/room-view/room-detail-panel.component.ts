import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef, Input, Output, EventEmitter, Optional, OnChanges, SimpleChanges } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RoomDataService } from '../../core/services/room-data.service';
import { TranslationService } from '../../core/services/translation.service';
import { HotelStateService, InlineRoom } from '../../core/services/hotel-state.service';

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
  alerts: any[] = [];
  logs: any[] = [];

  // Preset temperature memory: { 'trv_room_1': { 'manual': 22, 'eco': 15, 'comfort': 20 } }
  private presetMemory: Record<string, Record<string, number>> = {};

  // RPC: entityName → entityId (UUID) lookup map
  deviceEntityIdMap: { [entityName: string]: string } = {};

  private refreshInterval: any;

  // History Modal
  showHistoricalData = false;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any,
    @Optional() private dialogRef: MatDialogRef<RoomDetailPanelComponent>,
    private cdr: ChangeDetectorRef,
    private roomDataService: RoomDataService,
    private translationService: TranslationService,
    private hotelStateService: HotelStateService
  ) {}

  openHistoricalData(): void {
    if (this.data) {
      // Find the room in the global state or create a temporary InlineRoom if needed
      // Actually, since we have the data, we can pass it.
      // But openHistoricalData expects InlineRoom.
      // Let's see if we can just pass the current data as a partial InlineRoom or find it.
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
    this.showHistoricalData = false;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    if (this.dialogData) {
      this.data = this.dialogData;
    }
    this.initializeData();

    this.refreshInterval = setInterval(() => {
      this.updateData();
    }, 10000);
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
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  private attributesInitialized = false;

  public updateData(): void {
    this.buildFromPassedData();
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

      const url = `/api/plugins/telemetry/DEVICE/${deviceId}/SHARED_SCOPE`;
      const body: any = {};
      if (trv.targetTemp != null) body['current_heating_setpoint'] = trv.targetTemp;
      if (trv.systemMode != null) body['system_mode'] = trv.systemMode;
      if (trv.preset != null) body['preset'] = trv.preset;

      if (Object.keys(body).length === 0) continue;

      ctx.http.post(url, body).subscribe(
        () => { if (DEBUG) console.log(`Init attrs OK: ${trv.entityName}`); },
        (err: any) => console.warn(`Init attrs failed: ${trv.entityName}`, err?.status)
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
    this.thermostats = [];
    this.aqSensors = [];
    this.allSensors = [];
    this.alerts = [];
    this.logs = [];

    const sd = this.data.sensorData || {};
    const hd = this.data.hasData || {};

    this.roomNumber = sd.roomNumber || '--';
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
      const serverTarget = data.setPoint ?? null;

      const finalMode = trv && now < (trv.modeLockUntil || 0) ? trv.systemMode : serverMode;
      const finalPreset = trv && now < (trv.presetLockUntil || 0) ? trv.preset : serverPreset;
      const finalTarget = trv && now < (trv.tempLockUntil || 0) ? trv.targetTemp : serverTarget;

      const freshData = {
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Thermostat'),
        currentTemp: this.data.tempDevices?.[name] ?? null,
        targetTemp: finalTarget,
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
      this.allSensors.push({
        type: 'window',
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Window'),
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
      const isLeak = !!data.leak;
      this.allSensors.push({
        type: 'water',
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Water Leak'),
        isLeak: isLeak,
        statusLabel: isLeak ? this.t.leakDetected : this.t.noLeak,
        statusColor: isLeak ? '#FF3B30' : '#34C759',
        icon: 'water_damage',
        iconColor: isLeak ? '#FF3B30' : '#34C759',
        iconBg: isLeak ? 'rgba(255,59,48,0.08)' : 'rgba(52,199,89,0.08)',
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: this.data.deviceMeta?.[name]?.model ?? 'Tuya TS0207',
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.data.offlineDevices?.[name] ?? false
      });
    }

    // Noise Sensors
    const noiseDevices = this.data.noiseDevices || {};
    for (const [name, data] of Object.entries(noiseDevices) as any) {
      const currentLevel = data.level ?? data.laeq ?? data.lai ?? 0;
      const quiet = currentLevel <= 55;
      const isWS302 = name.toUpperCase().includes('WS302') || name.toUpperCase().startsWith('RST-KLV-WS');
      this.allSensors.push({
        type: 'noise',
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || (isWS302 ? 'Noise Sensor' : this.formatDeviceName(name, 'Noise')),
        statusLabel: Math.round(currentLevel) + ' dB – ' + (quiet ? this.t.normal : this.t.loud),
        levelVal: Math.round(currentLevel) + ' dB',
        levelText: quiet ? this.t.normal : this.t.loud,
        statusColor: quiet ? '#34C759' : '#FF9500',
        icon: quiet ? 'volume_down' : 'volume_up',
        iconColor: quiet ? '#34C759' : '#FF9500',
        iconBg: quiet ? 'rgba(52,199,89,0.08)' : 'rgba(255,149,0,0.08)',
        battery: this.data.batteryDevices?.[name] ?? null,
        linkquality: this.data.linkQualityDevices?.[name] ?? null,
        model: isWS302 ? 'WS302' : (this.data.deviceMeta?.[name]?.model ?? 'Noise Sensor'),
        lastSeen: this.data.lastSeenDevices?.[name] ?? null,
        offline: this.data.offlineDevices?.[name] ?? false,
        laeq: data.laeq ?? null,
        lai: data.lai ?? null,
        laimax: data.laimax ?? null,
        isLoud: !quiet
      });
    }

    // Air Quality Sensors
    const airDevices = this.data.airSensors || {};
    for (const [name, aqData] of Object.entries(airDevices) as any) {
      const aqResult = RoomDataService.calculateAirQuality(
        aqData.co2 ?? null, aqData.tvoc ?? aqData.iaq ?? null, aqData.pm25 ?? null, aqData.pm10 ?? null,
        aqData.hum ?? null, aqData.temp ?? null, aqData.light ?? null, aqData.pressure ?? null
      );
      this.aqSensors.push({
        entityName: name,
        displayName: this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Air Monitor'),
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

    // Sorting
    this.thermostats.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    this.aqSensors.sort((a, b) => this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
    this.allSensors.sort((a, b) => a.type.localeCompare(b.type) || this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName));
  }

  private extractDeviceNumber(displayName: string): number {
    const match = displayName.match(/(\d+)\s*$/);
    if (match) return parseInt(match[1], 10);
    const leadMatch = displayName.match(/^(\d+)/);
    return leadMatch ? parseInt(leadMatch[1], 10) : 999;
  }

  private formatDeviceName(name: string, defaultType: string): string {
    // Pattern: type_room_X_Y  (e.g., window_room_6_2, trv_room_6_1, wl_room_5_1)
    const fullMatch = name.match(/^([a-zA-Z]+)_room_(\d+)_(\d+)$/i);
    if (fullMatch) {
      const prefix = fullMatch[1].toUpperCase();
      const deviceNum = fullMatch[3];
      const types: Record<string, string> = {
        WINDOW: this.t.windows, WIN: this.t.windows,
        TRV: this.t.thermostats,
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
        TRV: this.t.thermostats,
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
        TRV: this.t.thermostats,
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

  acknowledgeAlert(alert: any): void {
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
  }

  trackByEntityName(index: number, item: any): string {
    return item.entityName;
  }

  trackById(index: number, item: any): string | number {
    return item.id;
  }
}
