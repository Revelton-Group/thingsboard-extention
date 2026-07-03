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

  tempMin: number | null = null;
  tempAvg: number | null = null;
  tempMax: number | null = null;

  humMin: number | null = null;
  humAvg: number | null = null;
  humMax: number | null = null;

  co2Min: number | null = null;
  co2Avg: number | null = null;
  co2Max: number | null = null;

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

  // History Modal
  showHistoricalData = false;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any,
    @Optional() private dialogRef: MatDialogRef<RoomDetailPanelComponent>,
    private cdr: ChangeDetectorRef,
    private roomDataService: RoomDataService,
    private translationService: TranslationService,
    private hotelStateService: HotelStateService,
    private controlPanelService: ControlPanelService
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
    const prevSockets = this.smartSockets;
    this.thermostats = [];
    this.smartSockets = [];
    this.aqSensors = [];
    this.allSensors = [];
    this.leftSensors = [];
    this.rightSensors = [];
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
        model: 'WS303',
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
        model: 'WS302',
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
        model: name.toUpperCase().includes('VS370') ? 'VS370' : (name.toUpperCase().includes('WS301') ? 'WS301' : (this.data.deviceMeta?.[name]?.model || 'WS301')),
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
        displayName: this.data.deviceMeta?.[name]?.location || this.formatDeviceName(name, 'Smart Plug'),
        state: finalState,
        power: data.power ?? null,
        voltage: data.voltage ?? null,
        current: data.current ?? null,
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
    // Partition allSensors into left and right columns
    this.leftSensors = this.allSensors.filter(s => s.type === 'occupancy' || s.type === 'noise');
    this.rightSensors = this.allSensors.filter(s => s.type !== 'occupancy' && s.type !== 'noise');

    // Keep presence first, noise second in leftSensors
    this.leftSensors.sort((a, b) => {
      if (a.type === 'occupancy' && b.type !== 'occupancy') return -1;
      if (a.type !== 'occupancy' && b.type === 'occupancy') return 1;
      return this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName);
    });

    // Sort rightSensors consistently
    this.rightSensors.sort((a, b) => {
      return a.type.localeCompare(b.type) || this.extractDeviceNumber(a.displayName) - this.extractDeviceNumber(b.displayName);
    });

    // Interleave left and right sensors for row-major order:
    // Row 1: Left[0] (Presence), Right[0] (Bathroom/Water)
    // Row 2: Left[1] (Noise), Right[1] (Kitchen/Window)
    const interleaved: any[] = [];
    const maxLen = Math.max(this.leftSensors.length, this.rightSensors.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < this.leftSensors.length) {
        interleaved.push(this.leftSensors[i]);
      }
      if (i < this.rightSensors.length) {
        interleaved.push(this.rightSensors[i]);
      }
    }
    this.allSensors = interleaved;

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
            title: `${this.t.windows}`,
            message: `${s.displayName} is open`,
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
    for (const alert of this.alerts) {
      if (!this.alertTimestamps.has(alert.id)) {
        this.alertTimestamps.set(alert.id, now);
      }
      alert.timestamp = this.alertTimestamps.get(alert.id);
      alert.time = this.timeAgo(alert.timestamp);
    }

    // Clean up stale alerts from the tracking map
    const activeIds = new Set(this.alerts.map(a => a.id));
    for (const key of Array.from(this.alertTimestamps.keys())) {
      if (!activeIds.has(key)) {
        this.alertTimestamps.delete(key);
      }
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

  timeAgo(ts: number): string {
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

  loadArchive(): void {
    const key = `revelton_alerts_archive_${this.roomNumber}`;
    const ackKey = `revelton_alerts_ack_${this.roomNumber}`;
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
    } catch (e) {
      console.error('Failed to load archived/acknowledged alerts', e);
      this.archivedAlerts = [];
      this.acknowledgedAlertIds = new Set();
    }
  }

  saveArchive(): void {
    const key = `revelton_alerts_archive_${this.roomNumber}`;
    const ackKey = `revelton_alerts_ack_${this.roomNumber}`;
    try {
      localStorage.setItem(key, JSON.stringify(this.archivedAlerts));
      localStorage.setItem(ackKey, JSON.stringify(Array.from(this.acknowledgedAlertIds)));
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
    if (!http || !this.deviceEntityIdMap || this.roomNumber === '--' || this.roomNumber === this.lastFetchedRoom) {
      return;
    }
    this.lastFetchedRoom = this.roomNumber;

    const endTs = Date.now();
    const startTs = endTs - (24 * 60 * 60 * 1000); // Past 24 hours
    const limit = 300;

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

    const keysToFetch = 'temperature,humidity,co2,temp,hum';
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
          tempPoints = resData['temperature'] || resData['temp'] || [];
        }
        if (id === humDeviceId || (!humDeviceId && id === aqDeviceId)) {
          humPoints = resData['humidity'] || resData['hum'] || [];
        }
        if (id === aqDeviceId) {
          co2Points = resData['co2'] || [];
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
}
