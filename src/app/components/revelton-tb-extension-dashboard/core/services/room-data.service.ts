import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { WidgetContext } from '@home/models/widget-component.models';
import { TranslationService } from './translation.service';
import { ControlPanelService } from '../../features/control-panel/services/control-panel.service';

/** Breakpoint thresholds for AQI calculation — override per-pollutant at runtime */
export interface AQBreakpoints {
  co2: { good: number; fair: number; poor: number; hazardous: number };
  tvoc: { good: number; fair: number; poor: number; hazardous: number };
  pm25: { good: number; fair: number; poor: number; hazardous: number };
  pm10: { good: number; fair: number; poor: number; hazardous: number };
  humidity: { comfortMin: number; comfortMax: number; warnMin: number; warnMax: number };
  temp: { comfortMin: number; comfortMax: number; warnMin: number; warnMax: number };
}

/** Result returned by calculateAirQuality() */
export interface AirQualityResult {
  aqi: number;
  label: string;
  color: string;
  dominant: string;
  subIndexes: { [sensorName: string]: number };
}

export interface RoomData {
  sensorData: {
    roomNumber: string;
    temperature: number | null;
    humidity: number | null;
    airQuality: number | null;
    checkedIn: boolean;
    waterLeak: boolean;
    noise: number | null;
    booked: boolean;
    roomTitle: string | null;
  };
  hasData: {
    temperature: boolean;
    humidity: boolean;
    airQuality: boolean;
    checkedIn: boolean;
    waterLeak: boolean;
    noise: boolean;
    booked: boolean;
  };
  // Mews reservation data
  reservation: {
    checkIn: string;
    checkOut: string;
    guestName: string;
    reservationState: string;
    hasReservation: boolean;
    // Computed display fields
    checkDisplay: string;       // 'In', 'Wait', 'Out', '--'
    checkIconClass: string;     // 'icon-teal', 'icon-gray', 'icon-orange'
    checkPillClass: string;     // 'pill-normal', 'pill-inactive', 'pill-wait'
    bookDisplay: string;        // 'Yes', 'No', '--'
    bookIconClass: string;      // 'icon-green', 'icon-red', 'icon-gray'
    bookPillClass: string;      // 'pill-normal', 'pill-danger', 'pill-inactive'
    bookCellClass: string;      // 'cell-danger', ''
    checkoutRemaining: string;  // '2h 30m', '' 
    statusSummary: string;      // 'Guest in room · checkout in 2h', 'Arriving today 15:00', etc.
  };
  winAgg: any;
  trvAgg: any;
  tempStatus: string;
  humStatus: string;
  airStatus: string;
  noiseStatus: string;
  roomStatus: string;
  alarmCount: number;
  sensorAlarmCount?: number; // Only temp/hum/air/noise/waterLeak — drives bell color
  hasBatteryLow?: boolean;
  // Device maps
  windowDevices: any;
  trvDevices: any;
  tempDevices: any;
  humDevices: any;
  batteryDevices: any;
  batteryLowDevices: any;
  linkQualityDevices: any;
  lastSeenDevices: any;
  offlineDevices: any;
  tamperDevices: any;
  airSensors: any;
  deviceMeta: any;
  leakDevices: any;
  noiseDevices: any;
  occupancyDevices: any;
  activeDevices: any;
  plugDevices: any;
  deviceEntityIdMap: any;
}

@Injectable({
  providedIn: 'root'
})
export class RoomDataService {

  private dataSubject = new BehaviorSubject<RoomData | null>(null);
  public data$ = this.dataSubject.asObservable();

  private THRESHOLDS: {
    temperature: { warning: { min: number, max: number }, danger: { min: number, max: number } },
    humidity: { warning: { min: number, max: number }, danger: { min: number, max: number } },
    airQuality: { warning: number, danger: number },
    noise: { warning: number, danger: number }
  } = {
    temperature: { warning: { min: 16, max: 28 }, danger: { min: 14, max: 32 } },
    humidity: { warning: { min: 30, max: 65 }, danger: { min: 20, max: 80 } },
    airQuality: { warning: 100, danger: 150 },
    noise: { warning: 55, danger: 70 }
  };

  private lastSeenTimestamps: { [device: string]: number } = {};

  constructor(
    private http: HttpClient,
    private translationService: TranslationService,
    private controlPanelService: ControlPanelService
  ) {
    this.controlPanelService.config$.subscribe(config => {
      if (config) {
        if (config.airQuality && config.airQuality.enabled) {
          // Warning at 80% of configured max, Danger at 100% of configured max
          this.THRESHOLDS.airQuality = {
            warning: Math.round(config.airQuality.co2Max * 0.8),
            danger: config.airQuality.co2Max
          };
        } else {
          this.THRESHOLDS.airQuality = { warning: 800, danger: 1000 };
        }

        if (config.noise && config.noise.enabled) {
          const mainLimit = config.noise.laeqMax ?? config.noise.noiseMax ?? 60;
          // Warning at configured limit - 10 dB, Danger at configured limit
          this.THRESHOLDS.noise = {
            warning: Math.max(40, mainLimit - 10),
            danger: mainLimit
          };
        } else {
          this.THRESHOLDS.noise = { warning: 50, danger: 60 };
        }
      }
    });
  }

  get t() {
    return this.translationService.t;
  }

  public updateFromTelemetry(ctx: WidgetContext, currentData: RoomData): RoomData {
    if (!ctx?.data) return currentData;

    const newData = { ...currentData };
    if (!newData.plugDevices) newData.plugDevices = {};

    for (const item of ctx.data) {
      if (!item || !item.dataKey) continue;

      const key = item.dataKey.name;
      let value = null;

      if (item.data && item.data.length > 0 && item.data[0]) {
        value = item.data[0][1];
      }
      
      const entityName = (item.datasource && item.datasource.entityName) ? item.datasource.entityName : 'unknown';


      if (value === null || value === undefined || value === '' || value === 'null') continue;



      // Capture entity UUID
      const ds = item.datasource;
      if (ds?.entityId && entityName !== 'unknown') {
        const id = typeof ds.entityId === 'string' ? ds.entityId : (ds.entityId as any).id;
        if (id) newData.deviceEntityIdMap[entityName] = id;
      }
      if (ds?.deviceType && entityName !== 'unknown') {
        if (!newData.deviceMeta[entityName]) newData.deviceMeta[entityName] = {};
        newData.deviceMeta[entityName].model = ds.deviceType;
      }
      if (entityName !== 'unknown' && this.isPlugDevice(entityName, newData.deviceMeta)) {
        if (!newData.plugDevices[entityName]) newData.plugDevices[entityName] = {};
      }

      switch (key) {
        case 'temp':
        case 'temperature':
        case 'local_temperature':
        case 'last_temperature_measurement':
        case 'data_temperature':
        case 'data_temp': {
          const temp = parseFloat(value);
          if (!isNaN(temp)) {
            newData.tempDevices[entityName] = temp;
            newData.hasData.temperature = true;
            if (this.isAirSensor(entityName, newData.deviceMeta)) {
              if (!newData.airSensors[entityName]) newData.airSensors[entityName] = {};
              newData.airSensors[entityName].temp = temp;
            }
          }
          break;
        }
        case 'hum':
        case 'humidity':
        case 'relative_humidity':
        case 'data_humidity':
        case 'data_hum': {
          const hum = parseFloat(value);
          if (!isNaN(hum)) {
            newData.humDevices[entityName] = hum;
            newData.hasData.humidity = true;
            if (this.isAirSensor(entityName, newData.deviceMeta)) {
              if (!newData.airSensors[entityName]) newData.airSensors[entityName] = {};
              newData.airSensors[entityName].hum = hum;
            }
          }
          break;
        }
        case 'current_heating_setpoint':
          if (!newData.trvDevices[entityName]) newData.trvDevices[entityName] = {};
          newData.trvDevices[entityName].setPoint = parseFloat(value) || 0;
          break;
        case 'running_state':
          if (!newData.trvDevices[entityName]) newData.trvDevices[entityName] = {};
          const mode = String(value).toLowerCase();
          newData.trvDevices[entityName].status = mode === 'heat' ? 'heating' : mode === 'off' ? 'off' : mode === 'idle' ? 'idle' : mode;
          break;
        case 'preset':
          if (!newData.trvDevices[entityName]) newData.trvDevices[entityName] = {};
          newData.trvDevices[entityName].preset = String(value).toLowerCase();
          break;
        case 'system_mode':
        case 'mode':
          if (!newData.trvDevices[entityName]) newData.trvDevices[entityName] = {};
          newData.trvDevices[entityName].system_mode = String(value).toLowerCase();
          break;
        case 'eco_temperature':
          if (!newData.trvDevices[entityName]) newData.trvDevices[entityName] = {};
          newData.trvDevices[entityName].eco_temperature = parseFloat(value);
          break;
        case 'comfort_temperature':
          if (!newData.trvDevices[entityName]) newData.trvDevices[entityName] = {};
          newData.trvDevices[entityName].comfort_temperature = parseFloat(value);
          break;
        case 'contact':
          if (!newData.windowDevices[entityName]) newData.windowDevices[entityName] = { contact: 'closed' };
          newData.windowDevices[entityName].contact = (value === true || value === 'true' || value === 1 || value === '1') ? 'closed' : 'open';
          break;
        case 'battery_low':
        case 'batteryLow':
          newData.batteryLowDevices[entityName] = (value === true || String(value).toLowerCase() === 'true' || value === 1);
          break;
        case 'tamper':
          newData.tamperDevices[entityName] = (value === true || value === 'true' || value === 1);
          break;
        case 'active':
          newData.activeDevices[entityName] = (value === true || String(value).toLowerCase() === 'true' || value === 1 || value === '1');
          break;
        case 'battery':
        case 'data_battery':
        case 'status_battery_level':
          newData.batteryDevices[entityName] = parseFloat(value);
          break;
        case 'linkquality':
        case 'rssi': {
          const val = parseFloat(value);
          if (!isNaN(val)) {
            if (val < 0) {
              // Convert RSSI (dBm) to LQI (0-254) range using custom LoRaWAN thresholds
              const lqi = RoomDataService.rssiToLqi(val);
              newData.linkQualityDevices[entityName] = lqi;
            } else {
              newData.linkQualityDevices[entityName] = val;
            }
            if (this.isLeakSensor(entityName, newData.deviceMeta)) {
              if (!newData.leakDevices[entityName]) {
                newData.leakDevices[entityName] = {};
              }
              newData.leakDevices[entityName].rssi = val;
            }
            if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
              if (!newData.occupancyDevices[entityName]) {
                newData.occupancyDevices[entityName] = {};
              }
              newData.occupancyDevices[entityName].rssi = val;
            }
          }
          break;
        }
        case 'last_seen':
        case 'lastActivityTime':
          const ts = Date.parse(value) || parseInt(value, 10);
          if (!isNaN(ts)) {
            this.lastSeenTimestamps[entityName] = ts;
            newData.lastSeenDevices[entityName] = this.timeAgo(ts);
            newData.offlineDevices[entityName] = (Date.now() - ts) > (24 * 60 * 60 * 1000);
          }
          break;
        case 'airQuality':
          newData.sensorData.airQuality = parseFloat(value);
          newData.hasData.airQuality = true;
          if (this.isAirSensor(entityName, newData.deviceMeta)) {
            if (!newData.airSensors[entityName]) newData.airSensors[entityName] = {};
            newData.airSensors[entityName].aqi = parseFloat(value);
          }
          break;
        case 'co2':
        case 'data_co2':
        case 'pm25':
        case 'data_pm25':
        case 'pm2_5':
        case 'data_pm2_5':
        case 'pm10':
        case 'data_pm10':
        case 'tvoc':
        case 'data_tvoc':
        case 'iaq':
        case 'data_iaq':
        case 'light':
        case 'light_level':
        case 'data_light':
        case 'data_light_level':
        case 'pressure':
        case 'data_pressure': {
          let cleanKey = key.replace('data_', '');
          if (cleanKey === 'light_level') cleanKey = 'light';
          if (cleanKey === 'pm2_5') cleanKey = 'pm25';
          if (this.isAirSensor(entityName, newData.deviceMeta)) {
            if (!newData.airSensors[entityName]) newData.airSensors[entityName] = {};
            newData.airSensors[entityName][cleanKey] = parseFloat(value);
            newData.hasData.airQuality = true;
          }
          break;
        }
        case 'pir':
        case 'data_pir':
          if (this.isAirSensor(entityName, newData.deviceMeta)) {
            if (!newData.airSensors[entityName]) newData.airSensors[entityName] = {};
            newData.airSensors[entityName].pir = String(value);
          }
          break;
        case 'model':
          if (!newData.deviceMeta[entityName]) newData.deviceMeta[entityName] = {};
          newData.deviceMeta[entityName].model = String(value);
          break;
        case 'location':
          if (!newData.deviceMeta[entityName]) newData.deviceMeta[entityName] = {};
          newData.deviceMeta[entityName].location = String(value);
          break;
        case 'checkedIn':
          newData.sensorData.checkedIn = (value === true || value === 'true' || value === 1);
          newData.hasData.checkedIn = true;
          break;
        case 'isOccupied':
          newData.sensorData.checkedIn = (value === true || value === 'true' || value === 1 || value === '1');
          newData.hasData.checkedIn = true;
          break;
        case 'waterLeak':
        case 'data_leakage_status': {
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            const isLeak = key === 'waterLeak' ? 
              (value === true || value === 'true' || value === 1) : 
              (String(value).toLowerCase() !== 'normal');
            newData.sensorData.waterLeak = isLeak;
            newData.hasData.waterLeak = true;
            if (!newData.leakDevices[entityName]) {
              newData.leakDevices[entityName] = {};
            }
            newData.leakDevices[entityName].leak = isLeak;
          }
          break;
        }
        case 'data_device_status':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].deviceStatus = String(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].deviceStatus = String(value);
          }
          break;
        case 'data_firmware_version':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].firmwareVersion = String(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].firmwareVersion = String(value);
          }
          break;
        case 'data_hardware_version':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].hardwareVersion = String(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].hardwareVersion = String(value);
          }
          break;
        case 'data_ipso_version':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].ipsoVersion = String(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].ipsoVersion = String(value);
          }
          break;
        case 'data_lorawan_class':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].lorawanClass = String(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].lorawanClass = String(value);
          }
          break;
        case 'data_sn':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].sn = String(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].sn = String(value);
          }
          break;
        case 'dr':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].dr = parseFloat(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].dr = parseFloat(value);
          }
          break;
        case 'f_cnt':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].fCnt = parseFloat(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].fCnt = parseFloat(value);
          }
          break;
        case 'f_port':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].fPort = parseFloat(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].fPort = parseFloat(value);
          }
          break;
        case 'snr':
          if (this.isLeakSensor(entityName, newData.deviceMeta)) {
            if (!newData.leakDevices[entityName]) newData.leakDevices[entityName] = {};
            newData.leakDevices[entityName].snr = parseFloat(value);
          }
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].snr = parseFloat(value);
          }
          break;
        case 'data_occupancy':
        case 'occupancy':
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].occupancy = String(value);
          }
          break;
        case 'data_illuminance':
        case 'illuminance':
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].illuminance = String(value);
          }
          break;
        case 'data_tsl_version':
          if (this.isOccupancySensor(entityName, newData.deviceMeta)) {
            if (!newData.occupancyDevices[entityName]) newData.occupancyDevices[entityName] = {};
            newData.occupancyDevices[entityName].tslVersion = String(value);
          }
          break;
        case 'noise':
        case 'data_LAeq':
        case 'data_LAI':
        case 'data_LAImax': {
          if (this.isNoiseSensor(entityName, newData.deviceMeta)) {
            if (!newData.noiseDevices[entityName]) {
              newData.noiseDevices[entityName] = { level: 0 };
            }
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              if (key === 'noise') {
                newData.sensorData.noise = numVal;
                newData.hasData.noise = true;
                newData.noiseDevices[entityName].level = numVal;
              } else if (key === 'data_LAeq') {
                newData.sensorData.noise = numVal;
                newData.hasData.noise = true;
                newData.noiseDevices[entityName].level = numVal;
                newData.noiseDevices[entityName].laeq = numVal;
              } else if (key === 'data_LAI') {
                newData.noiseDevices[entityName].lai = numVal;
                if (!newData.noiseDevices[entityName].level || newData.noiseDevices[entityName].level === 0) {
                  newData.sensorData.noise = numVal;
                  newData.hasData.noise = true;
                  newData.noiseDevices[entityName].level = numVal;
                }
              } else if (key === 'data_LAImax') {
                newData.noiseDevices[entityName].laimax = numVal;
              }
            }
          }
          break;
        }
        case 'state':
        case 'socket_state':
        case 'plug_state':
          if (entityName !== 'unknown' && this.isPlugDevice(entityName, newData.deviceMeta)) {
            if (!newData.plugDevices[entityName]) newData.plugDevices[entityName] = {};
            newData.plugDevices[entityName].state = String(value);
          }
          break;
        case 'power':
        case 'load_power':
        case 'active_power':
          if (entityName !== 'unknown' && this.isPlugDevice(entityName, newData.deviceMeta)) {
            if (!newData.plugDevices[entityName]) newData.plugDevices[entityName] = {};
            newData.plugDevices[entityName].power = parseFloat(value);
          }
          break;
        case 'booked':
          newData.sensorData.booked = (value === true || value === 'true' || value === 1);
          newData.hasData.booked = true;
          break;
        case 'checkIn':
          newData.reservation.checkIn = String(value);
          newData.reservation.hasReservation = true;
          newData.sensorData.booked = true;
          newData.hasData.booked = true;
          break;
        case 'checkOut':
          newData.reservation.checkOut = String(value);
          break;
        case 'guestName':
          newData.reservation.guestName = String(value);
          break;
        case 'reservationState':
          newData.reservation.reservationState = String(value);
          if (value && value !== '' && value !== 'null') {
            newData.sensorData.booked = true;
            newData.hasData.booked = true;
          }
          break;
        case 'roomTitle':
        case 'RoomTitle':
        case 'room_title':
        case 'title':
          newData.sensorData.roomTitle = String(value);
          break;
      }
    }

    this.aggregateAll(newData);
    this.computeReservationDisplay(newData);
    this.updateStatuses(newData);
    return newData;
  }

  private computeReservationDisplay(data: RoomData): void {
    const res = data.reservation;
    const now = new Date();

    // Default state — no Mews data
    if (!res.hasReservation) {
      res.checkDisplay = data.hasData.checkedIn ? (data.sensorData.checkedIn ? 'In' : 'Out') : '--';
      res.checkIconClass = data.hasData.checkedIn ? 'icon-teal' : 'icon-gray';
      res.checkPillClass = data.hasData.checkedIn && data.sensorData.checkedIn ? 'pill-normal' : 'pill-inactive';
      res.bookDisplay = data.hasData.booked ? (data.sensorData.booked ? this.t.booked : this.t.vacant) : '--';
      res.bookIconClass = data.hasData.booked && data.sensorData.booked ? 'icon-green' : 'icon-gray';
      res.bookPillClass = data.hasData.booked && data.sensorData.booked ? 'pill-normal' : 'pill-inactive';
      res.bookCellClass = '';
      res.checkoutRemaining = '';
      res.statusSummary = '';
      return;
    }

    const state = (res.reservationState || '').toLowerCase();
    const checkOutDate = res.checkOut ? new Date(res.checkOut) : null;
    const checkInDate = res.checkIn ? new Date(res.checkIn) : null;

    // Calculate checkout remaining time
    res.checkoutRemaining = '';
    if (checkOutDate && !isNaN(checkOutDate.getTime())) {
      const diffMs = checkOutDate.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          res.checkoutRemaining = days + 'd ' + (hours % 24) + 'h';
        } else {
          res.checkoutRemaining = hours + 'h ' + mins + 'm';
        }
      }
    }

    switch (state) {
      case 'started': {
        // Guest has checked in and is currently staying
        data.sensorData.checkedIn = true;
        data.hasData.checkedIn = true;
        data.sensorData.booked = true;
        data.hasData.booked = true;
        
        const isOverdue = checkOutDate && now > checkOutDate;
        
        res.checkDisplay = 'In';
        res.checkIconClass = isOverdue ? 'icon-orange' : 'icon-teal';
        res.checkPillClass = isOverdue ? 'pill-danger' : 'pill-normal';
        
        if (!isOverdue) {
          res.bookDisplay = this.t.started;
          res.bookIconClass = 'icon-green';
          res.bookPillClass = 'pill-normal';
          res.bookCellClass = '';
          res.statusSummary = `${this.t.guestInRoom} · ${this.t.checkout} ${this.t.in} ${res.checkoutRemaining}`;
        } else {
          res.bookDisplay = this.t.overdue;
          res.bookIconClass = 'icon-red';
          res.bookPillClass = 'pill-danger';
          res.bookCellClass = 'cell-danger';
          res.statusSummary = `${this.t.guestInRoom} · ${this.t.checkoutPassed}`;
        }
        break;
      }
      case 'confirmed':
      case 'optional': {
        // Guest has a reservation but hasn't checked in yet
        data.sensorData.booked = true;
        data.hasData.booked = true;
        data.hasData.checkedIn = true;
        data.sensorData.checkedIn = false;
        
        const isLate = checkInDate && now > checkInDate;
        
        res.checkDisplay = 'Wait';
        res.checkIconClass = isLate ? 'icon-orange' : 'icon-gray';
        res.checkPillClass = isLate ? 'pill-wait' : 'pill-wait';
        res.bookDisplay = isLate ? this.t.lateArrival : (state === 'confirmed' ? this.t.confirmed : this.t.optional);
        res.bookIconClass = isLate ? 'icon-red' : (state === 'confirmed' ? 'icon-green' : 'icon-gray');
        res.bookPillClass = isLate ? 'pill-danger' : (state === 'confirmed' ? 'pill-wait' : 'pill-inactive');
        res.bookCellClass = isLate ? 'cell-danger' : '';
        
        // Check if arriving today
        if (checkInDate && !isNaN(checkInDate.getTime())) {
          // Format the dates in Europe/Prague timezone
          const getPragueParts = (d: Date) => {
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: 'Europe/Prague',
              year: 'numeric', month: 'numeric', day: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false
            });
            const parts = formatter.formatToParts(d);
            const get = (type: string) => parts.find(p => p.type === type)?.value || '';
            return {
              dateStr: `${get('year')}-${get('month')}-${get('day')}`,
              hh: get('hour'),
              mm: get('minute'),
              dd: get('day').padStart(2, '0'),
              mo: get('month').padStart(2, '0')
            };
          };

          const checkInPrague = getPragueParts(checkInDate);
          const nowPrague = getPragueParts(now);
          const isToday = checkInPrague.dateStr === nowPrague.dateStr;
          
          if (isLate) {
            res.statusSummary = `${this.t.lateArrival} · ${this.t.shouldHaveArrivedAt} ${checkInPrague.hh}:${checkInPrague.mm}`;
          } else if (isToday) {
            res.statusSummary = `${this.t.arrivingToday} ${this.t.at} ${checkInPrague.hh}:${checkInPrague.mm}`;
          } else {
            res.statusSummary = `${this.t.arrivingOn} ${checkInPrague.dd}.${checkInPrague.mo}`;
          }
        } else {
          res.statusSummary = isLate ? this.t.overdueForCheckin : this.t.waitingForCheckin;
        }
        break;
      }
      case 'processed': {
        // Guest has checked out
        data.hasData.checkedIn = true;
        data.sensorData.checkedIn = false;
        data.sensorData.booked = false;
        data.hasData.booked = true;
        res.checkDisplay = 'Out';
        res.checkIconClass = 'icon-gray';
        res.checkPillClass = 'pill-inactive';
        res.bookDisplay = this.t.processed;
        res.bookIconClass = 'icon-gray';
        res.bookPillClass = 'pill-inactive';
        res.bookCellClass = '';
        res.checkoutRemaining = '';
        res.statusSummary = this.t.checkedOut;
        break;
      }
      case 'canceled': {
        data.hasData.checkedIn = true;
        data.sensorData.checkedIn = false;
        data.sensorData.booked = false;
        data.hasData.booked = true;
        res.checkDisplay = '--';
        res.checkIconClass = 'icon-gray';
        res.checkPillClass = 'pill-inactive';
        res.bookDisplay = this.t.canceled;
        res.bookIconClass = 'icon-gray';
        res.bookPillClass = 'pill-inactive';
        res.bookCellClass = '';
        res.checkoutRemaining = '';
        res.statusSummary = this.t.reservationCanceled;
        break;
      }
      default: {
        // Unknown state — fallback
        res.checkDisplay = data.sensorData.checkedIn ? 'In' : '--';
        res.checkIconClass = data.sensorData.checkedIn ? 'icon-teal' : 'icon-gray';
        res.checkPillClass = data.sensorData.checkedIn ? 'pill-normal' : 'pill-inactive';
        res.bookDisplay = data.sensorData.booked ? 'Yes' : '--';
        res.bookIconClass = data.sensorData.booked ? 'icon-green' : 'icon-gray';
        res.bookPillClass = data.sensorData.booked ? 'pill-normal' : 'pill-inactive';
        res.bookCellClass = '';
        res.statusSummary = '';
        break;
      }
    }
  }

  private isAirSensor(name: string, meta: any): boolean {
    const label = meta[name]?.label || '';
    const model = meta[name]?.model || '';
    const n = name.toUpperCase();
    const l = label.toUpperCase();
    const m = model.toUpperCase();
    return n.startsWith('AQ') || n.startsWith('AIR') || n.startsWith('AM') || n.includes('AM308') || n.includes('MILESIGHT') ||
           l.startsWith('AQ') || l.startsWith('AIR') || l.includes('AM308') || l.includes('MILESIGHT') ||
           m.includes('AM308') || m.includes('AMBIENCE') || m.includes('AIR') || m.includes('MILESIGHT');
  }

  private isTRV(name: string): boolean {
    const n = name.toUpperCase();
    return n.startsWith('TRV_') || n.includes('THERMOSTAT');
  }

  private isLeakSensor(name: string, meta: any): boolean {
    const label = meta[name]?.label || '';
    const model = meta[name]?.model || '';
    const n = name.toUpperCase();
    const l = label.toUpperCase();
    const m = model.toUpperCase();
    return n.includes('WS303') || n.includes('WL') || n.includes('LEAK') || n.includes('WATER') || n === 'BATHROOM' ||
           l.includes('WS303') || l.includes('WL') || l.includes('LEAK') || l.includes('WATER') || l === 'BATHROOM' ||
           m.includes('WS303') || m.includes('LEAK') || m.includes('WATER');
  }

  private isNoiseSensor(name: string, meta: any): boolean {
    const label = meta[name]?.label || '';
    const model = meta[name]?.model || '';
    const n = name.toUpperCase();
    const l = label.toUpperCase();
    const m = model.toUpperCase();
    return n.includes('WS302') || n.includes('NS') || n.includes('NOISE') || n.includes('SOUND') ||
           l.includes('WS302') || l.includes('NS') || l.includes('NOISE') || l.includes('SOUND') ||
           m.includes('WS302') || m.includes('NOISE') || m.includes('SOUND');
  }

  private isOccupancySensor(name: string, meta: any): boolean {
    const label = meta[name]?.label || '';
    const model = meta[name]?.model || '';
    const n = name.toUpperCase();
    const l = label.toUpperCase();
    const m = model.toUpperCase();
    return n.includes('WS301') || n.includes('VS370') || n.includes('VS3') || n.includes('370') || n.includes('OCC') || n.includes('PRESENCE') || n.includes('RADAR') || n.includes('MOTION') ||
           l.includes('WS301') || l.includes('VS370') || l.includes('VS3') || l.includes('370') || l.includes('OCC') || l.includes('PRESENCE') || l.includes('RADAR') || l.includes('MOTION') ||
           m.includes('WS301') || m.includes('VS370') || m.includes('VS3') || m.includes('370') || m.includes('OCC') || m.includes('PRESENCE') || m.includes('RADAR') || m.includes('MOTION');
  }

  private isPlugDevice(name: string, meta: any): boolean {
    const label = meta[name]?.label || '';
    const model = meta[name]?.model || '';
    const n = name.toUpperCase();
    const l = label.toUpperCase();
    const m = model.toUpperCase();
    return n.includes('PLUG') || n.includes('SOCKET') ||
           l.includes('PLUG') || l.includes('SOCKET') ||
           m.includes('PLUG') || m.includes('SOCKET') ||
           meta[name]?.type === 'Plug';
  }

  private aggregateAll(data: RoomData) {
    // Temp — Prefer dedicated sensors over TRV internal sensors
    const allTempKeys = Object.keys(data.tempDevices);
    const sensorTempKeys = allTempKeys.filter(k => !this.isTRV(k));

    if (sensorTempKeys.length > 0) {
      data.sensorData.temperature = parseFloat((sensorTempKeys.reduce((s, k) => s + data.tempDevices[k], 0) / sensorTempKeys.length).toFixed(1));
      data.hasData.temperature = true;
    } else {
      // If no dedicated sensors, we don't use TRV local_temperature as the room average
      data.sensorData.temperature = null;
      data.hasData.temperature = false;
    }
    // Humid
    const humKeys = Object.keys(data.humDevices);
    if (humKeys.length > 0) {
      data.sensorData.humidity = Math.round(humKeys.reduce((s, k) => s + data.humDevices[k], 0) / humKeys.length);
    }
    // Windows
    const winKeys = Object.keys(data.windowDevices);
    const winOpen = winKeys.filter(k => data.windowDevices[k].contact === 'open').length;
    data.winAgg = {
      total: winKeys.length,
      openCount: winOpen,
      anyOpen: winOpen > 0,
      display: winKeys.length === 0 ? '--' : (winKeys.length === 1 ? (winOpen ? 'open' : 'closed') : (winOpen === 0 ? 'closed' : `${winOpen}/${winKeys.length} open`))
    };
    // TRVs
    const trvKeys = Object.keys(data.trvDevices);
    if (trvKeys.length > 0) {
      const avgSet = Math.round(trvKeys.reduce((s, k) => s + (data.trvDevices[k].setPoint || 0), 0) / trvKeys.length);
      const hasHeating = trvKeys.some(k => data.trvDevices[k].status === 'heating');
      const hasOff = trvKeys.some(k => data.trvDevices[k].status === 'off');
      const worst = hasHeating ? 'heating' : hasOff ? 'off' : 'idle';
      data.trvAgg = { count: trvKeys.length, avgSetPoint: avgSet, worstStatus: worst, display: `${avgSet}° ${worst}` };
    }

    // Air Quality AQI Calculation (triggered watch compile)
    const airKeys = Object.keys(data.airSensors);
    if (airKeys.length > 0) {
      let totalAqi = 0;
      let count = 0;
      const config = this.controlPanelService.config;
      const customBreakpoints: Partial<AQBreakpoints> = {};
      if (config?.airQuality?.enabled) {
        customBreakpoints.co2 = {
          good: Math.round(config.airQuality.co2Max * 0.8),
          fair: config.airQuality.co2Max,
          poor: Math.round(config.airQuality.co2Max * 1.5),
          hazardous: Math.round(config.airQuality.co2Max * 3.0)
        };
        customBreakpoints.pm25 = {
          good: Math.round(config.airQuality.pm25Max * 0.35),
          fair: config.airQuality.pm25Max,
          poor: Math.round(config.airQuality.pm25Max * 1.5),
          hazardous: Math.round(config.airQuality.pm25Max * 4.0)
        };
        customBreakpoints.pm10 = {
          good: Math.round(config.airQuality.pm10Max * 0.35),
          fair: config.airQuality.pm10Max,
          poor: Math.round(config.airQuality.pm10Max * 1.5),
          hazardous: Math.round(config.airQuality.pm10Max * 2.8)
        };
        customBreakpoints.temp = {
          comfortMin: 18,
          comfortMax: Math.max(18, config.airQuality.tempMax - 2),
          warnMin: 14,
          warnMax: config.airQuality.tempMax
        };
        customBreakpoints.humidity = {
          comfortMin: 30,
          comfortMax: Math.max(30, config.airQuality.humMax - 5),
          warnMin: 20,
          warnMax: config.airQuality.humMax
        };
      }

      for (const k of airKeys) {
        const sensor = data.airSensors[k];
        const res = RoomDataService.calculateAirQuality(
          sensor.co2 !== undefined ? sensor.co2 : null,
          sensor.tvoc !== undefined ? sensor.tvoc : null,
          sensor.pm25 !== undefined ? sensor.pm25 : null,
          sensor.pm10 !== undefined ? sensor.pm10 : null,
          sensor.humidity !== undefined ? sensor.humidity : (sensor.hum !== undefined ? sensor.hum : null),
          sensor.temperature !== undefined ? sensor.temperature : (sensor.temp !== undefined ? sensor.temp : null),
          sensor.light !== undefined ? sensor.light : null,
          sensor.pressure !== undefined ? sensor.pressure : null,
          customBreakpoints
        );
        if (res && res.aqi !== null && !isNaN(res.aqi)) {
          totalAqi += res.aqi;
          count++;
        }
      }
      if (count > 0) {
        data.sensorData.airQuality = Math.round(totalAqi / count);
        data.hasData.airQuality = true;
      }
    }
  }

  private updateStatuses(data: RoomData) {
    data.tempStatus = data.hasData.temperature ? this.calcStatus('temperature', data.sensorData.temperature!) : 'normal';
    data.humStatus = data.hasData.humidity ? this.calcStatus('humidity', data.sensorData.humidity!) : 'normal';
    data.airStatus = data.hasData.airQuality ? this.calcStatus('airQuality', data.sensorData.airQuality!) : 'normal';
    data.noiseStatus = data.hasData.noise ? this.calcStatus('noise', data.sensorData.noise!) : 'normal';

    const hasBatteryLow = Object.values(data.batteryLowDevices).some(v => v === true) || 
                          Object.values(data.batteryDevices).some((v: any) => v < 20);
    data.hasBatteryLow = hasBatteryLow;

    const s = [data.tempStatus, data.humStatus, data.airStatus, data.noiseStatus, data.sensorData.waterLeak ? 'danger' : 'normal', hasBatteryLow ? 'warning' : 'normal'];
    data.roomStatus = s.includes('danger') ? 'danger' : s.includes('warning') ? 'warning' : 'normal';

    // sensorAlarmCount — only sensor/environmental alerts drive the bell RED
    const sensorAlerts = (data.tempStatus !== 'normal' ? 1 : 0) + (data.humStatus !== 'normal' ? 1 : 0) +
                         (data.airStatus !== 'normal' ? 1 : 0) + (data.noiseStatus !== 'normal' ? 1 : 0) +
                         (data.sensorData.waterLeak ? 1 : 0);
    data.sensorAlarmCount = sensorAlerts;

    // alarmCount — full count including windows and battery (for badge number)
    let alerts = sensorAlerts + data.winAgg.openCount + (hasBatteryLow ? 1 : 0);
    data.alarmCount = alerts;
  }

  private calcStatus(type: string, val: number): string {
    const t = (this.THRESHOLDS as any)[type];
    if (!t) return 'normal';
    if (t.warning.min !== undefined) {
      if (val < t.danger.min || val > t.danger.max) return 'danger';
      if (val < t.warning.min || val > t.warning.max) return 'warning';
    } else {
      if (val >= t.danger) return 'danger';
      if (val >= t.warning) return 'warning';
    }
    return 'normal';
  }

  public timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 10) return this.t.justNow;
    if (s < 60) return s + ' ' + this.t.secondsAgo;
    if (s < 3600) return Math.floor(s / 60) + ' ' + this.t.minutesAgo;
    if (s < 86400) return Math.floor(s / 3600) + ' ' + this.t.hoursAgo;
    return Math.floor(s / 86400) + ' ' + this.t.daysAgo;
  }

  public static calculateAirQuality(
    co2: number | null, tvoc: number | null, pm25: number | null, pm10: number | null,
    humidity: number | null, temp: number | null, light: number | null, pressure: number | null,
    thresholds?: Partial<AQBreakpoints>
  ): AirQualityResult {
    // Breakpoints
    const bp: AQBreakpoints = {
      co2: { good: 800, fair: 1200, poor: 2000, hazardous: 5000 },
      tvoc: { good: 0.3, fair: 1.0, poor: 3.0, hazardous: 25.0 },
      pm25: { good: 12, fair: 35, poor: 55, hazardous: 150 },
      pm10: { good: 54, fair: 154, poor: 254, hazardous: 424 },
      humidity: { comfortMin: 30, comfortMax: 60, warnMin: 20, warnMax: 70 },
      temp: { comfortMin: 18, comfortMax: 26, warnMin: 14, warnMax: 32 },
      ...thresholds
    };

    const linearScale = (v: number, bl: number, bh: number, al: number, ah: number) => ((ah - al) / (bh - bl)) * (v - bl) + al;

    const scores: { [key: string]: number } = {};
    if (co2 !== null) scores['CO2'] = co2 <= bp.co2.good ? linearScale(co2, 0, bp.co2.good, 0, 50) : co2 <= bp.co2.fair ? linearScale(co2, bp.co2.good, bp.co2.fair, 51, 100) : linearScale(co2, bp.co2.fair, bp.co2.poor, 101, 200);
    if (tvoc !== null) scores['TVOC'] = tvoc <= bp.tvoc.good ? linearScale(tvoc, 0, bp.tvoc.good, 0, 50) : linearScale(tvoc, bp.tvoc.good, bp.tvoc.fair, 51, 100);
    if (pm25 !== null) scores['PM2.5'] = pm25 <= bp.pm25.good ? linearScale(pm25, 0, bp.pm25.good, 0, 50) : linearScale(pm25, bp.pm25.good, bp.pm25.fair, 51, 100);
    if (pm10 !== null) scores['PM10'] = pm10 <= bp.pm10.good ? linearScale(pm10, 0, bp.pm10.good, 0, 50) : linearScale(pm10, bp.pm10.good, bp.pm10.fair, 51, 100);

    const aqi = Math.max(0, ...Object.values(scores), 0);
    const label = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Fair' : aqi <= 200 ? 'Poor' : 'Hazardous';
    const color = aqi <= 50 ? '#34C759' : aqi <= 100 ? '#FFCC00' : aqi <= 200 ? '#FF9500' : '#FF3B30';
    const dominant = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, '--');

    return { aqi: Math.round(aqi), label, color, dominant, subIndexes: scores };
  }

  public getAirQualityLabel(aqi: number | null): string {
    if (aqi === null || aqi === undefined) return '--';
    if (aqi <= 50) return this.t.excellent;
    if (aqi <= 100) return this.t.good;
    if (aqi <= 200) return this.t.fair;
    return this.t.poor;
  }

  public static rssiToLqi(rssi: number): number {
    // RSSI ranges:
    // Excellent: -30 to -70 dBm -> LQI 150 to 254
    // Good: -71 to -90 dBm -> LQI 100 to 149
    // Fair: -91 to -110 dBm -> LQI 50 to 99
    // Poor: -111 to -120 dBm -> LQI 1 to 49
    if (rssi >= -70) {
      const pct = Math.min(1, Math.max(0, (rssi - (-70)) / (-30 - (-70))));
      return Math.round(150 + pct * (254 - 150));
    } else if (rssi >= -90) {
      const pct = Math.min(1, Math.max(0, (rssi - (-90)) / (-71 - (-90))));
      return Math.round(100 + pct * (149 - 100));
    } else if (rssi >= -110) {
      const pct = Math.min(1, Math.max(0, (rssi - (-110)) / (-91 - (-110))));
      return Math.round(50 + pct * (99 - 50));
    } else {
      const pct = Math.min(1, Math.max(0, (rssi - (-120)) / (-111 - (-120))));
      return Math.round(1 + pct * (49 - 1));
    }
  }
}
