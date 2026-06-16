/**
 * Telemetry key variant sets for EV charger device identification and data fetching.
 * Mirrors the sensor-keys.constants.ts pattern from the historical dashboard.
 */

/** Keys that identify a device as an EV charger */
export const EV_CHARGER_IDENTIFIER_KEYS: readonly string[] = [
  'connector_0_status',
  'connector_1_status',
  'charging_status',
  'connector_status',
  'ev_connector',
  'charger_state',
  'plug_state',
  'station_a_status',
  'station_b_status',
];

/** Power-related keys (kW) */
export const EV_CHARGER_POWER_KEYS: readonly string[] = [
  'power',
  'power_kw',
  'active_power',
  'charge_power',
  'total_power',
];

/** Energy-related keys (kWh) */
export const EV_CHARGER_ENERGY_KEYS: readonly string[] = [
  'energy',
  'energy_kwh',
  'total_energy',
  'session_energy',
  'energy_consumed',
];

/** Session duration keys (milliseconds or seconds) */
export const EV_CHARGER_SESSION_KEYS: readonly string[] = [
  'session_duration',
  'charging_time',
  'session_time',
  'duration',
];

/** Current keys (A) */
export const EV_CHARGER_CURRENT_KEYS: readonly string[] = [
  'current',
  'current_a',
  'charge_current',
];

/** Voltage keys (V) */
export const EV_CHARGER_VOLTAGE_KEYS: readonly string[] = [
  'voltage',
  'voltage_v',
  'charge_voltage',
];

/** All EV charger keys flattened — used for telemetry fetching */
export const EV_CHARGER_ALL_KEYS: readonly string[] = [
  ...EV_CHARGER_IDENTIFIER_KEYS,
  ...EV_CHARGER_POWER_KEYS,
  ...EV_CHARGER_ENERGY_KEYS,
  ...EV_CHARGER_SESSION_KEYS,
  ...EV_CHARGER_CURRENT_KEYS,
  ...EV_CHARGER_VOLTAGE_KEYS,
  // Real connector_N_* keys from device telemetry
  'connector_0_status', 'connector_0_error_code', 'connector_0_timestamp',
  'connector_1_status', 'connector_1_error_code', 'connector_1_timestamp',
  'connector_2_status', 'connector_2_error_code', 'connector_2_timestamp',
  'connector_3_status', 'connector_3_error_code', 'connector_3_timestamp',
  'last_heartbeat_ts',
  // Legacy station_a/b keys kept for backward compatibility
  'station_a_status', 'station_a_power', 'station_a_energy', 'station_a_battery', 'station_a_cost', 'station_a_fault_code',
  'station_b_status', 'station_b_power', 'station_b_energy', 'station_b_battery', 'station_b_cost', 'station_b_fault_code'
];
