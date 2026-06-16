import { Observable } from 'rxjs';
import { DiscoveredDevice, TimeWindow } from '../models';

/**
 * ISensorProcessor — Open/Closed contract for sensor panel data processors.
 *
 * OCP: To add a new sensor type, implement this interface in a new class.
 *      The orchestrator loop never changes.
 * LSP: All processors are interchangeable through this interface.
 */
export interface ISensorProcessor {
  /**
   * Returns true if this processor should handle the given device.
   * @param availableKeys Lowercase telemetry keys reported by the device
   * @param deviceName   Device name as stored in ThingsBoard
   */
  canHandle(availableKeys: string[], deviceName: string): boolean;

  /**
   * Fetches telemetry and emits a typed result object.
   * The orchestrator subscribes to this and merges the result into state.
   * @param device     The discovered device to fetch data for
   * @param keys       The raw (non-lowercased) keys available for this device
   * @param timeWindow The current time window for the fetch
   */
  process(device: DiscoveredDevice, keys: string[], timeWindow: TimeWindow): Observable<SensorPanelResult | null>;
}

/**
 * Discriminated union result that each processor emits.
 * The state service uses the `panel` tag to route results correctly.
 */
export type SensorPanelResult =
  | ThermostatResult
  | AirQualityResult
  | WindowResult
  | WaterLeakResult
  | NoiseResult
  | OccupancyResult;

export interface ThermostatResult   { panel: 'thermostat';   stats: any; chartData: any[] }
export interface AirQualityResult   { panel: 'airQuality';   stats: any; chartData: any; }
export interface WindowResult       { panel: 'window';       stats: any; }
export interface WaterLeakResult    { panel: 'waterLeak';    stats: any; chartData: any[] }
export interface NoiseResult        { panel: 'noise';        stats: any; chartData: any[] }
export interface OccupancyResult    { panel: 'occupancy';    stats: any; chartData: any[] }
