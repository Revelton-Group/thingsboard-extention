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
  | 'thermostat'
  | 'window'
  | 'mews'
  | 'telegram';

export const CONTROL_PANEL_SECTIONS: ControlPanelSection[] = [
  { id: 'thermostat', label: 'Thermostat',    icon: 'thermostat' },
  { id: 'window',     label: 'Window Alert',  icon: 'window' },
  { id: 'mews',       label: 'Mews Sync',     icon: 'sync' },
  { id: 'telegram',   label: 'Telegram',      icon: 'send' },
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
export type TelegramAlertLevel = 'danger' | 'warning_and_above' | 'all';

export interface TelegramConfig {
  enabled: boolean;
  alertLevel: TelegramAlertLevel;
}

/** ── Top-level config envelope ── */
export interface ControlPanelConfig {
  thermostat: ThermostatAutomationConfig;
  window: WindowAlertConfig;
  mews: MewsSyncConfig;
  telegram: TelegramConfig;
}

/** Default values */
export const DEFAULT_CONTROL_PANEL_CONFIG: ControlPanelConfig = {
  thermostat: {
    enabled: false,
    activeDays: ['Mon', 'Wed', 'Fri'],
    startTime: '02:00',
    endTime: '04:00',
    exerciseTemp: 30,
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
    alertLevel: 'danger',
  },
};
