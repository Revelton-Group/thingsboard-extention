import { TranslationSet } from '../services/translation.service';

export type SettingScope = 'H' | 'HR' | 'R' | 'BRIDGE';
export type SettingKind = 'number' | 'boolean' | 'enum' | 'time' | 'date' | 'text';
export type SettingValue = number | boolean | string | null;
export type SectionId =
  | 'general' | 'heating' | 'mews' | 'air' | 'noise' | 'window' | 'socket' | 'battery' | 'offline' | 'telegram';

export interface SettingField {
  key: string;
  scope: SettingScope;
  kind: SettingKind;
  labelKey: keyof TranslationSet;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  def: SettingValue;
  advanced?: boolean;
  dailySender?: boolean;
}

export interface SettingSection {
  id: SectionId;
  labelKey: keyof TranslationSet;
  subKey: keyof TranslationSet;
  icon: string;
  roomOverride: boolean;
  fields: SettingField[];
}

const n = (
  key: string, labelKey: keyof TranslationSet, scope: SettingScope, def: number | null,
  min: number, max: number, unit: string, extra: Partial<SettingField> = {},
): SettingField => ({ key, labelKey, scope, kind: 'number', def, min, max, unit, step: 1, ...extra });

const b = (key: string, labelKey: keyof TranslationSet, scope: SettingScope, def = true): SettingField =>
  ({ key, labelKey, scope, kind: 'boolean', def });

export const SETTINGS_SECTIONS: SettingSection[] = [
  { id: 'general', labelKey: 'csGeneral', subKey: 'csSubGeneral', icon: 'tune', roomOverride: false, fields: [
    { key: 'report_language', labelKey: 'csReportLanguage', scope: 'H', kind: 'enum', options: ['en', 'ru'], def: 'en' },
    { key: 'heat_timezone', labelKey: 'csTimezone', scope: 'H', kind: 'text', def: 'Europe/Prague' },
  ] },
  { id: 'heating', labelKey: 'csHeating', subKey: 'csSubHeating', icon: 'thermostat', roomOverride: false, fields: [
    { key: 'heat_mode', labelKey: 'csHeatMode', scope: 'H', kind: 'enum', options: ['off', 'safe', 'live'], def: 'safe' },
    n('heat_comfort_temp', 'csComfortTemp', 'HR', 23, 5, 30, '°C', { step: 0.5 }),
    n('heat_eco_temp', 'csEcoTemp', 'HR', 17, 5, 30, '°C', { step: 0.5 }),
    n('heat_boost_temp', 'csBoostTemp', 'H', 28, 5, 30, '°C', { step: 0.5 }),
    n('heat_boost_delta', 'csBoostDelta', 'H', 3, 1, 10, '°C', { advanced: true, step: 0.5 }),
    n('heat_boost_exit_margin', 'csBoostExit', 'H', 0.5, 0, 5, '°C', { advanced: true, step: 0.1 }),
    n('heat_boost_max_min', 'csBoostMax', 'H', 240, 10, 1440, 'min', { advanced: true }),
    n('heat_turnover_gap_min', 'csTurnoverGap', 'H', 360, 0, 2880, 'min', { advanced: true }),
    n('heat_preheat_rate_warm', 'csRateWarm', 'H', 2.0, 0.1, 6, '°C/h', { advanced: true, step: 0.1 }),
    n('heat_preheat_rate_mild', 'csRateMild', 'H', 1.5, 0.1, 6, '°C/h', { advanced: true, step: 0.1 }),
    n('heat_preheat_rate_cold', 'csRateCold', 'H', 1.0, 0.1, 6, '°C/h', { advanced: true, step: 0.1 }),
    n('heat_preheat_min', 'csPreheatMin', 'H', 60, 0, 1440, 'min', { advanced: true }),
    n('heat_preheat_max_min', 'csPreheatMax', 'H', 360, 0, 1440, 'min', { advanced: true }),
    n('heat_adjust_max', 'csAdjustMax', 'H', 2, 0, 5, '°C', { advanced: true }),
    n('heat_adjust_every_min', 'csAdjustEvery', 'H', 120, 10, 1440, 'min', { advanced: true }),
    n('heat_room_sensor_stale_min', 'csSensorStale', 'H', 20, 5, 240, 'min', { advanced: true }),
    n('heat_lookahead_min', 'csLookahead', 'H', 10, 0, 120, 'min', { advanced: true }),
    n('heat_latitude', 'csLatitude', 'H', null, -90, 90, '°', { advanced: true, step: 0.0001 }),
    n('heat_longitude', 'csLongitude', 'H', null, -180, 180, '°', { advanced: true, step: 0.0001 }),
    n('heat_season_outdoor_temp', 'csSeasonTemp', 'H', 13, -20, 30, '°C', { advanced: true }),
    { key: 'heat_season_start', labelKey: 'csSeasonStart', scope: 'H', kind: 'date', def: '10-15', advanced: true },
    { key: 'heat_season_end', labelKey: 'csSeasonEnd', scope: 'H', kind: 'date', def: '04-15', advanced: true },
  ] },
  { id: 'mews', labelKey: 'csMews', subKey: 'csSubMews', icon: 'sync', roomOverride: false, fields: [
    n('syncIntervalMinutes', 'csMewsInterval', 'BRIDGE', 10, 5, 60, 'min'),
  ] },
  { id: 'air', labelKey: 'csAir', subKey: 'csSubAir', icon: 'air', roomOverride: true, fields: [
    b('airQuality_enabled', 'csEnabled', 'HR'),
    n('tempMin', 'csTempMin', 'HR', null, 0, 50, '°C'), n('tempMax', 'csTempMax', 'HR', null, 0, 50, '°C'),
    n('humMin', 'csHumMin', 'HR', null, 0, 100, '%'), n('humMax', 'csHumMax', 'HR', null, 0, 100, '%'),
    n('co2Max', 'csCo2Max', 'HR', null, 400, 5000, 'ppm'),
    n('tvocMax', 'csTvocMax', 'HR', null, 1, 500, 'lvl'),
    n('pm25Max', 'csPm25Max', 'HR', null, 1, 500, 'µg/m³'),
    n('pm10Max', 'csPm10Max', 'HR', null, 1, 500, 'µg/m³'),
  ] },
  { id: 'noise', labelKey: 'csNoise', subKey: 'csSubNoise', icon: 'volume_up', roomOverride: true, fields: [
    b('noise_enabled', 'csEnabled', 'HR'),
    { key: 'noise_dayPeriod_start', labelKey: 'csDayStart', scope: 'HR', kind: 'time', def: '07:00' },
    { key: 'noise_dayPeriod_end', labelKey: 'csDayEnd', scope: 'HR', kind: 'time', def: '22:00' },
    n('noise_day_laeq', 'csDayLaeq', 'HR', null, 30, 130, 'dB'),
    n('noise_day_lai', 'csDayLai', 'HR', null, 30, 130, 'dB'),
    n('noise_day_laimax', 'csDayLaimax', 'HR', null, 30, 130, 'dB'),
    n('noise_night_laeq', 'csNightLaeq', 'HR', null, 30, 130, 'dB'),
    n('noise_night_lai', 'csNightLai', 'HR', null, 30, 130, 'dB'),
    n('noise_night_laimax', 'csNightLaimax', 'HR', null, 30, 130, 'dB'),
  ] },
  { id: 'window', labelKey: 'csWindow', subKey: 'csSubWindow', icon: 'sensor_window', roomOverride: true, fields: [
    b('window_enabled', 'csEnabled', 'HR'),
    n('window_open_max_min', 'csWindowMax', 'HR', null, 0, 1440, 'min'),
  ] },
  { id: 'socket', labelKey: 'csSocket', subKey: 'csSubSocket', icon: 'power', roomOverride: true, fields: [
    b('socket_enabled', 'csEnabled', 'HR'),
    n('socket_powerMax', 'csPowerMax', 'HR', null, 10, 5000, 'W'),
  ] },
  { id: 'battery', labelKey: 'csBattery', subKey: 'csSubBattery', icon: 'battery_alert', roomOverride: true, fields: [
    n('batteryMin', 'csBatteryMin', 'HR', 20, 1, 100, '%'),
  ] },
  { id: 'offline', labelKey: 'csOffline', subKey: 'csSubOffline', icon: 'cloud_off', roomOverride: false, fields: [
    n('offline_am308_min', 'csOffAm308', 'H', 60, 5, 10080, 'min'),
    n('offline_ws302_min', 'csOffWs302', 'H', 60, 5, 10080, 'min'),
    n('offline_wt101_min', 'csOffWt101', 'H', 30, 5, 10080, 'min'),
    n('offline_ws523_min', 'csOffWs523', 'H', 120, 5, 10080, 'min'),
    n('offline_vs370_min', 'csOffVs370', 'H', 3000, 5, 10080, 'min', { dailySender: true }),
    n('offline_ws301_min', 'csOffWs301', 'H', 3000, 5, 10080, 'min', { dailySender: true }),
    n('offline_ws303_min', 'csOffWs303', 'H', 4800, 5, 10080, 'min', { dailySender: true }),
  ] },
  { id: 'telegram', labelKey: 'csTelegram', subKey: 'csSubTelegram', icon: 'send', roomOverride: true, fields: [
    b('telegram_alert_water', 'csTgWater', 'HR'), b('telegram_alert_noise', 'csTgNoise', 'HR'),
    b('telegram_alert_temp', 'csTgTemp', 'HR'), b('telegram_alert_humidity', 'csTgHumidity', 'HR'),
    b('telegram_alert_co2', 'csTgCo2', 'HR'), b('telegram_alert_battery', 'csTgBattery', 'HR'),
    b('telegram_alert_socket', 'csTgSocket', 'HR'), b('telegram_alert_window', 'csTgWindow', 'HR'),
    b('telegram_alert_offline', 'csTgOffline', 'H'),
    n('noise_alert_after_min', 'csNoiseAfter', 'HR', 60, 0, 1440, 'min'),
    n('air_alert_after_min', 'csAirAfter', 'HR', 60, 0, 1440, 'min'),
  ] },
];

export const ROOM_ONLY_FIELDS: SettingField[] = [
  { key: 'heat_enabled', labelKey: 'csRoomHeating', scope: 'R', kind: 'boolean', def: true },
];

export const ALL_FIELDS: SettingField[] = SETTINGS_SECTIONS.flatMap(s => s.fields).concat(ROOM_ONLY_FIELDS);

export const FIELD_BY_KEY: Record<string, SettingField> =
  Object.fromEntries(ALL_FIELDS.map(f => [f.key, f]));

export const HOTEL_KEYS: string[] =
  ALL_FIELDS.filter(f => f.scope !== 'BRIDGE' && f.scope !== 'R').map(f => f.key).concat('heat_bulk_ts');

export const ROOM_KEYS: string[] =
  ALL_FIELDS.filter(f => f.scope === 'HR' || f.scope === 'R').map(f => f.key);

export const KEY_PAIRS: [string, string][] = [['tempMin', 'tempMax'], ['humMin', 'humMax']];
