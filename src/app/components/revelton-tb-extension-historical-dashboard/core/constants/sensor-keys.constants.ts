/**
 * Telemetry key sets for each sensor type.
 *
 * Single source of truth — replaces all inline arrays and duplicated key lists
 * that were previously scattered throughout the main component.
 */

export const THERMOSTAT_KEYS = [
  'running_state',
  'system_mode',
  'current_heating_setpoint',
  'preset',
] as const;

export const THERMOSTAT_TIMESERIES_KEYS = [
  'running_state',
  'system_mode',
  'preset',
] as const;

/**
 * All known temperature key variants across different TRV / sensor brands.
 * TRV (Zigbee) uses local_temperature; generic sensors use temperature.
 */
export const TEMPERATURE_VARIANTS = [
  'temperature',
  'local_temperature',
  'room_temperature',
  'current_temperature',
  'measured_temperature',
  'env_temperature',
] as const;

/** Keys that identify a device as a thermostat/TRV */
export const THERMOSTAT_IDENTIFIER_KEYS = [
  'running_state',
  'system_mode',
  'current_heating_setpoint',
] as const;

/** Keys fetched for air quality / env sensors */
export const AIR_QUALITY_KEYS = [
  'co2',
  'humidity',
  'pm25',
  'tvoc',
  'iaq',
  'pressure',
  'temperature',
] as const;

/** Keys that indicate an air quality / env sensor */
export const AIR_QUALITY_IDENTIFIER_KEYS = [
  'co2',
  'humidity',
  'tvoc',
  'pm25',
  'iaq',
  'pressure',
] as const;

/** Keys fetched for window / door sensors */
export const WINDOW_KEYS = [
  'position',
  'contact',
  'window',
  'door',
  'open',
  'opened',
  'state',
  'tamper',
] as const;

/** Keys that identify a window/door sensor */
export const WINDOW_IDENTIFIER_KEYS = [
  'position',
  'contact',
  'window',
  'door',
  'open',
  'opened',
  'state',
] as const;

/** Device name substrings that exclude a device from window classification */
export const WINDOW_EXCLUDE_NAME_FRAGMENTS = [
  'trv',
  'thermostat',
  'radiator',
  'heating',
] as const;

export const WATER_LEAK_KEYS = ['water_leak', 'leak', 'moisture'] as const;

export const NOISE_KEYS = [
  'noise',
  'sound_level',
  'noise_level',
  'acoustic',
] as const;

export const OCCUPANCY_KEYS = [
  'occupancy',
  'presence',
  'motion',
  'pir',
] as const;

/** Colors assigned to individual window/door devices on the timeline */
export const WINDOW_DEVICE_COLORS = [
  '#eab308',
  '#0ea5e9',
  '#ec4899',
  '#10b981',
  '#8b5cf6',
] as const;
