/**
 * Control Panel — Domain Models
 * SOLID: Interface Segregation — each config domain is isolated.
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
  | 'mews'
  | 'telegram';

export const CONTROL_PANEL_SECTIONS: ControlPanelSection[] = [
  { id: 'air_quality', label: 'Air Quality', icon: 'air' },
  { id: 'thermostat',  label: 'Thermostat',  icon: 'thermostat' },
  { id: 'noise',       label: 'Noise Sensor',icon: 'volume_up' },
  { id: 'window',      label: 'Window Alert',icon: 'window' },
  { id: 'mews',        label: 'Mews Sync',   icon: 'sync' },
  { id: 'telegram',    label: 'Telegram',    icon: 'send' },
];

/** Day of week */
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** ── Thermostat Automation ── */
export interface ThermostatAutomationConfig {
  enabled: boolean;
  /** Days on which valve exercise runs */
  activeDays: Weekday[];
  /** HH:MM — start of exercise window */
  startTime: string;
  /** HH:MM — end of exercise window */
  endTime: string;
  /** Target temperature during exercise (°C) */
  exerciseTemp: number;
}

/** ── Window Alert ── */
export interface WindowAlertConfig {
  enabled: boolean;
  /** Hours before alert is triggered for an open window */
  thresholdHours: number;
}

/** ── Mews Sync ── */
export interface MewsSyncConfig {
  /** Sync interval in minutes */
  intervalMinutes: number;
}

export const MEWS_SYNC_OPTIONS = [
  { label: '5 min',  value: 5  },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

/** ── Telegram Notifications ── */
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  topicId: string;
}

/** ── Air Quality Thresholds ── */
export interface AirQualityThresholdConfig {
  enabled: boolean;
  co2Max: number;
  pm25Max: number;
  pm10Max: number;
  tvocMax: number;
  tempMax: number;
  humMax: number;
  pressMax: number;
}

/** ── Noise Thresholds ── */
export interface NoiseThresholdConfig {
  enabled: boolean;
  noiseMax: number;
  laeqMax: number;
  laiMax: number;
  laimaxMax: number;
}

/** ── Top-level config envelope ── */
export interface ControlPanelConfig {
  airQuality: AirQualityThresholdConfig;
  thermostat: ThermostatAutomationConfig;
  noise: NoiseThresholdConfig;
  window: WindowAlertConfig;
  mews: MewsSyncConfig;
  telegram: TelegramConfig;
}

/** Default values */
export const DEFAULT_CONTROL_PANEL_CONFIG: ControlPanelConfig = {
  airQuality: {
    enabled: true,
    co2Max: 1000,
    pm25Max: 35,
    pm10Max: 150,
    tvocMax: 600,
    tempMax: 28,
    humMax: 65,
    pressMax: 1100,
  },
  thermostat: {
    enabled: false,
    activeDays: ['Mon', 'Wed', 'Fri'],
    startTime: '02:00',
    endTime: '04:00',
    exerciseTemp: 30,
  },
  noise: {
    enabled: true,
    noiseMax: 65,
    laeqMax: 60,
    laiMax: 65,
    laimaxMax: 70,
  },
  window: {
    enabled: true,
    thresholdHours: 3,
  },
  mews: {
    intervalMinutes: 15,
  },
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    topicId: ''
  },
};
