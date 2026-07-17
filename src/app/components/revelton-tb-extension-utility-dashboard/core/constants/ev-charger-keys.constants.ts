/**
 * Telemetry key variant sets for EV charger device identification and data fetching.
 * Mirrors the sensor-keys.constants.ts pattern from the historical dashboard.
 *
 * All keys are lowercase — compare against lowercased device keys.
 */

/** Per-connector key suffixes reported by the Elios sync (connector_N_<suffix>) */
const CONNECTOR_KEY_SUFFIXES: readonly string[] = [
  'status',
  'status_text',
  'error_code',
  'timestamp',
  'type',
  'session_username',
  'session_rfid_hex',
  'session_kw',
  'session_kwh',
  'session_duration_min',
  'used_current_a',
  'requested_current_a',
  // Legacy per-connector keys
  'power', 'energy', 'battery', 'cost',
];

const connectorKeys = (suffixes: readonly string[]): string[] => {
  const keys: string[] = [];
  for (let n = 0; n <= 4; n++) {
    for (const suffix of suffixes) keys.push(`connector_${n}_${suffix}`);
  }
  return keys;
};

/** Station-level keys from the Elios sync (live widget bindings) */
export const EV_CHARGER_STATION_KEYS: readonly string[] = [
  'station_online',
  'last_sync_epoch_ms',
  'total_active_kw',
  'total_kwh',
  'total_charging_hours',
  'active_session_count',
];

/** Charge-log keys (historical sessions, fetched by the history modal) */
export const EV_CHARGER_LOG_KEYS: readonly string[] = [
  'charge_log_kwh',
  'charge_log_username',
  'charge_log_duration_min',
  'charge_log_payment_paid',
  'charge_log_a_kwh',
  'charge_log_a_username',
  'charge_log_a_duration_min',
  'charge_log_b_kwh',
  'charge_log_b_username',
  'charge_log_b_duration_min',
];

/** Keys that identify a device as an EV charger */
export const EV_CHARGER_IDENTIFIER_KEYS: readonly string[] = [
  ...connectorKeys(['status', 'status_text']),
  'station_online',
  'total_active_kw',
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
  'total_active_kw',
  'power',
  'power_kw',
  'active_power',
  'charge_power',
  'total_power',
];

/** Energy-related keys (kWh) */
export const EV_CHARGER_ENERGY_KEYS: readonly string[] = [
  'total_kwh',
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
  ...EV_CHARGER_STATION_KEYS,
  ...EV_CHARGER_IDENTIFIER_KEYS,
  ...EV_CHARGER_POWER_KEYS,
  ...EV_CHARGER_ENERGY_KEYS,
  ...EV_CHARGER_SESSION_KEYS,
  ...EV_CHARGER_CURRENT_KEYS,
  ...EV_CHARGER_VOLTAGE_KEYS,
  ...connectorKeys(CONNECTOR_KEY_SUFFIXES),
  'last_heartbeat_ts',
  // Legacy station_a/b keys kept for backward compatibility
  'station_a_status', 'station_a_power', 'station_a_energy', 'station_a_battery', 'station_a_cost', 'station_a_fault_code',
  'station_b_status', 'station_b_power', 'station_b_energy', 'station_b_battery', 'station_b_cost', 'station_b_fault_code'
];
