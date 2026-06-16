/**
 * Domain models for each sensor panel's statistics.
 * Replaces all `any` types for stats objects in the orchestrator.
 */

export interface ThermostatStats {
  currentTemp: number;
  setpoint: number;
  min: number;
  max: number;
  avg: number;
  runningState: 'idle' | 'heating' | 'cooling' | string;
  heating: string;
  mode: 'auto' | 'heat' | 'cool' | 'off' | string;
}

export interface AirQualityStats {
  co2: number;
  temp: number;
  humidity: number;
  pm25: number;
  tvoc: number;
  iaq: number;
  pressure: number;
}

export interface WindowStats {
  current: 'Open' | 'Closed';
  avgOpen: number;
  tamper: string;
  eventCount: number;
  avgDuration: string;
  events: WindowEvent[];
  devices: WindowDevice[];
  /** Internal accumulator — not for display */
  _totalOpenTime?: number;
}

export interface WindowEvent {
  name: string;
  time: number;
  endTime?: number;
  isOngoing?: boolean;
  durationMs: number;
  color: string;
}

export interface WindowDevice {
  name: string;
  locationName: string;
  currentStatus: 'Open' | 'Closed';
  color: string;
  markers: TimelineMarker[];
}

export interface TimelineMarker {
  left: string;
  width: string;
  tooltip?: string;
}

export interface WaterLeakStats {
  current: 'No Leak' | 'Leak Detected';
  events: number;
}

export interface NoiseStats {
  current: number;
  min: number;
  avg: number;
  peak: number;
}

export interface OccupancyStats {
  current: 'Occupied' | 'Unoccupied';
  avg: number;
  checkedIn: 'Yes' | 'No';
}

/** Default factory functions — centralises reset logic */
export const DEFAULT_THERMOSTAT_STATS = (): ThermostatStats => ({
  currentTemp: 0, setpoint: 21, min: 0, max: 0, avg: 0,
  runningState: 'idle', heating: 'idle', mode: 'auto',
});

export const DEFAULT_AIR_QUALITY_STATS = (): AirQualityStats => ({
  co2: 0, temp: 0, humidity: 0, pm25: 0, tvoc: 0, iaq: 0, pressure: 0,
});

export const DEFAULT_WINDOW_STATS = (): WindowStats => ({
  current: 'Closed', avgOpen: 0, tamper: 'None',
  eventCount: 0, avgDuration: '0m', events: [], devices: [],
});

export const DEFAULT_WATER_LEAK_STATS = (): WaterLeakStats => ({
  current: 'No Leak', events: 0,
});

export const DEFAULT_NOISE_STATS = (): NoiseStats => ({
  current: 0, min: 0, avg: 0, peak: 0,
});

export const DEFAULT_OCCUPANCY_STATS = (): OccupancyStats => ({
  current: 'Unoccupied', avg: 0, checkedIn: 'Yes',
});
