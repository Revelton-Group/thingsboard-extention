/**
 * Control Panel — Domain Models
 * SOLID: Interface Segregation — each config domain is isolated.
 * Design-aligned: schedule intervals, maintenance tests, noise periods.
 */

/** Section navigation */
export interface ControlPanelSection {
  id: ControlPanelSectionId;
  label: string;
  icon: string;
}

export type ControlPanelSectionId =
  | 'air_quality'
  | 'thermostat'
  | 'noise'
  | 'window'
  | 'mews';

export const CONTROL_PANEL_SECTIONS: ControlPanelSection[] = [
  { id: 'air_quality', label: 'Air Quality', icon: 'air' },
  { id: 'thermostat',  label: 'Thermostat',  icon: 'thermostat' },
  { id: 'noise',       label: 'Noise Sensor',icon: 'volume_up' },
  { id: 'window',      label: 'Window Alert',icon: 'window' },
  { id: 'mews',        label: 'Mews Sync',   icon: 'sync' },

];

/** Day of week */
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Map weekday to numeric index (1=Mon, 7=Sun)
export const WEEKDAY_INDEX: Record<Weekday, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7
};

/** ── Thermostat Automation ── */
export interface ThermostatScheduleInterval {
  id: number;
  start: string;  // HH:MM
  end: string;    // HH:MM
  temp: number;   // °C
}

export interface ThermostatMaintenanceTest {
  id: number;
  day: number;    // 1=Mon … 7=Sun
  time: string;   // HH:MM
}

export interface ThermostatAutomationConfig {
  /** Heating valve open (master toggle) */
  valveOpen: boolean;
  /** Preheating temperature setpoint (°C) */
  preheatingTemp: number;
  /** Schedule intervals with per-interval temperature */
  schedule: ThermostatScheduleInterval[];
  /** Valve maintenance (anti-seize) */
  maintenance: {
    enabled: boolean;
    tests: ThermostatMaintenanceTest[];
  };
  /** Preheating minutes before guest check-in */
  preheatingMinutes: number;
  /** Winter season range (YYYY-MM-DD) */
  winterSeason: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

/** ── Window Alert ── */
export interface WindowAlertConfig {
  enabled: boolean;
  /** Minutes before alert is triggered for an open window */
  thresholdMinutes: number;
  /** Auto-pause heating when window is open */
  autoPauseHeating: boolean;
}

/** ── Mews Sync ── */
export interface MewsSyncConfig {
  /** Auto-sync enabled */
  autoSync: boolean;
  /** Sync interval in minutes */
  intervalMinutes: number;
}

/** ── Telegram Notifications ── */
export interface TelegramAlertToggles {
  temp: boolean;
  humidity: boolean;
  water: boolean;
  window: boolean;
  battery: boolean;
  checkin: boolean;
  co2: boolean;
  noise: boolean;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  topicId: string;
  /** Per-alert-type toggles */
  alerts: TelegramAlertToggles;
}

/** ── Air Quality Thresholds ── */
export interface AirQualityThresholdConfig {
  enabled: boolean;
  co2Max: number;
  co2Min: number;
  /** Warning zone: when current value is within this many units of co2Max → WARNING */
  co2WarnGap: number;
  pm25Max: number;
  pm25Min: number;
  pm25WarnGap: number;
  pm10Max: number;
  pm10Min: number;
  pm10WarnGap: number;
  tvocMax: number;
  tvocMin: number;
  tvocWarnGap: number;
  tempMax: number;
  tempMin: number;
  tempWarnGap: number;
  humMax: number;
  humMin: number;
  humWarnGap: number;
  pressMax: number;
  pressMin: number;
  pressWarnGap: number;
}

/** ── Noise Thresholds ── */
export interface NoisePeriodThresholds {
  laeq: number;
  lai: number;
  laimax: number;
}

export interface NoisePeriod {
  start: string;  // HH:MM
  end: string;    // HH:MM
}

export interface NoiseThresholdConfig {
  enabled: boolean;
  // Flat backward-compatible accessors (use day values)
  noiseMax: number;
  laeqMax: number;
  laiMax: number;
  laimaxMax: number;
  /** Day period (e.g., 07:00–22:00) */
  dayPeriod: NoisePeriod;
  /** Day thresholds */
  day: NoisePeriodThresholds;
  /** Night period (e.g., 22:00–07:00) */
  nightPeriod: NoisePeriod;
  /** Night thresholds */
  night: NoisePeriodThresholds;
}

/** ── Room Scope ── */
export type RoomScope = 'all' | 'selected' | 'except';

/** ── Top-level config envelope ── */
export interface ControlPanelConfig {
  airQuality: AirQualityThresholdConfig;
  thermostat: ThermostatAutomationConfig;
  noise: NoiseThresholdConfig;
  window: WindowAlertConfig;
  mews: MewsSyncConfig;
  telegram: TelegramConfig;
  /** Which rooms the settings apply to */
  roomScope: RoomScope;
  /** Room numbers excluded when scope='all', or included when scope='selected' */
  roomScopeList: number[];
}

/** Default values */
export const DEFAULT_CONTROL_PANEL_CONFIG: ControlPanelConfig = {
  airQuality: {
    enabled: true,
    co2Max: 1000, co2Min: 400, co2WarnGap: 200,
    pm25Max: 35,  pm25Min: 5,  pm25WarnGap: 10,
    pm10Max: 150, pm10Min: 10, pm10WarnGap: 40,
    tvocMax: 600, tvocMin: 100, tvocWarnGap: 150,
    tempMax: 28,  tempMin: 18, tempWarnGap: 3,
    humMax: 65,   humMin: 30,  humWarnGap: 10,
    pressMax: 1100, pressMin: 980, pressWarnGap: 30,
  },
  thermostat: {
    valveOpen: true,
    preheatingTemp: 22,
    preheatingMinutes: 180,
    schedule: [
      { id: 1, start: '08:00', end: '20:00', temp: 21 },
      { id: 2, start: '20:00', end: '08:00', temp: 22 },
    ],
    maintenance: {
      enabled: true,
      tests: [
        { id: 1, day: 3, time: '03:00' },
      ],
    },
    winterSeason: {
      enabled: true,
      start: '2026-10-15',
      end: '2027-04-15'
    }
  },
  noise: {
    enabled: true,
    noiseMax: 65,
    laeqMax: 60,
    laiMax: 65,
    laimaxMax: 70,
    dayPeriod: { start: '07:00', end: '22:00' },
    day: { laeq: 55, lai: 65, laimax: 75 },
    nightPeriod: { start: '22:00', end: '07:00' },
    night: { laeq: 45, lai: 55, laimax: 65 },
  },
  window: {
    enabled: true,
    thresholdMinutes: 15,
    autoPauseHeating: true,
  },
  mews: {
    autoSync: true,
    intervalMinutes: 30,
  },
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    topicId: '',
    alerts: {
      temp: true,
      humidity: true,
      water: true,
      window: true,
      battery: true,
      checkin: false,
      co2: true,
      noise: true,
    },
  },
  roomScope: 'all',
  roomScopeList: [],
};
