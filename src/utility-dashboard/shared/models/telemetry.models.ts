/**
 * Shared telemetry models used across all dashboards.
 * Originally from historical-dashboard/core/models/time-range.models.ts
 */

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

/** Resolved time window for a fetch request */
export interface TimeWindow {
  startTs: number;
  endTs: number;
  intervalMs: number;
  durationMs: number;
}

