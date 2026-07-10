/* ───────────────────────────────────────────────────────────
   Dashboard Configuration — Centralized constants
   
   All deployment-specific values live here so they can be
   changed in one place when deploying to a different hotel.
   ─────────────────────────────────────────────────────────── */

/** IANA timezone for all date/time formatting across the dashboard */
export const HOTEL_TIMEZONE = 'Europe/Prague';

/** Weather API coordinates (Open-Meteo) */
export const HOTEL_LATITUDE = 50.2327;
export const HOTEL_LONGITUDE = 12.8712;

/* ──── RPC / Shared Attribute Validation ──── */

/** Allowed temperature setpoint range (°C) for thermostat shared attributes */
export const TRV_TEMP_MIN = 5;
export const TRV_TEMP_MAX = 35;

/** Allowed thermostat system modes */
export const VALID_SYSTEM_MODES: readonly string[] = ['auto', 'heat', 'off'];

/** Allowed thermostat presets */
export const VALID_PRESETS: readonly string[] = ['eco', 'comfort', 'manual'];

/** Clamp a temperature value to the valid range */
export function clampTemperature(value: number): number {
  return Math.max(TRV_TEMP_MIN, Math.min(TRV_TEMP_MAX, value));
}

/** Check if a system mode value is valid */
export function isValidSystemMode(mode: string): boolean {
  return VALID_SYSTEM_MODES.includes(mode.toLowerCase());
}

/** Check if a preset value is valid */
export function isValidPreset(preset: string): boolean {
  return VALID_PRESETS.includes(preset.toLowerCase());
}
