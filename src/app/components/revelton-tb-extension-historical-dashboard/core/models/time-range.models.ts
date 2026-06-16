/**
 * Time range domain models and configuration.
 * Replaces magic string literals scattered across the component.
 */

export type TimeRangeKey = '24h' | '7d' | '30d' | 'custom';

export interface TimeRangeConfig {
  key: TimeRangeKey;
  label: string;
  buttonLabel: string;
  durationMs: number;
  intervalMs: number;
  aggregationLabel: string;
  startTs: number;
  endTs: number;
}

/** Resolved time window for a fetch request */
export interface TimeWindow {
  startTs: number;
  endTs: number;
  intervalMs: number;
  durationMs: number;
}

/** ThingsBoard entity identifier */
export interface EntityId {
  id: string;
  entityType: 'DEVICE' | 'ASSET' | 'CUSTOMER' | string;
}

/** A raw telemetry data point from ThingsBoard */
export interface TelemetryPoint {
  ts: number;
  value: string | number | boolean;
}

/** Map of key → data points returned by getEntityTimeseries */
export type TelemetryMap = Record<string, TelemetryPoint[]>;

/** A device discovered through the Relations API */
export interface DiscoveredDevice {
  id: EntityId;
  name: string;
}
