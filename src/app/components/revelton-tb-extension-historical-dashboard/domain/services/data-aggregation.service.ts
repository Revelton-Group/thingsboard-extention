import { Injectable } from '@angular/core';
import { ChartPoint } from '../../core/models/sensor-chart.models';
import { TelemetryPoint } from '../../core/models/time-range.models';

/**
 * DataAggregationService
 *
 * SRP: Owns only time-bucketing and statistical calculation logic.
 * Pure functions — no side effects, fully unit-testable without Angular.
 */
@Injectable({ providedIn: 'any' })
export class DataAggregationService {

  /**
   * Buckets raw telemetry points into fixed time intervals and averages each bucket.
   * @param dataPoints Raw ThingsBoard telemetry points [{ts, value}]
   * @param intervalMs Width of each bucket in milliseconds
   * @returns Sorted array of [timestamp, averagedValue] chart points
   */
  aggregateSeries(dataPoints: TelemetryPoint[], intervalMs: number): ChartPoint[] {
    if (!dataPoints || dataPoints.length === 0) return [];

    const buckets = new Map<number, number[]>();
    for (const p of dataPoints) {
      const bucketTs = Math.floor(p.ts / intervalMs) * intervalMs;
      if (!buckets.has(bucketTs)) buckets.set(bucketTs, []);
      buckets.get(bucketTs)!.push(Number(p.value));
    }

    return Array.from(buckets.entries())
      .map(([ts, vals]) => [ts, this.round(vals.reduce((a, b) => a + b, 0) / vals.length)] as ChartPoint)
      .sort((a, b) => a[0] - b[0]);
  }

  /**
   * Calculates basic statistics for a numeric telemetry series.
   */
  calcStats(dataPoints: TelemetryPoint[]): { latest: number; min: number; max: number; avg: number } {
    if (!dataPoints || dataPoints.length === 0) {
      return { latest: 0, min: 0, max: 0, avg: 0 };
    }
    const nums = dataPoints.map(p => Number(p.value));
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      latest: this.round(nums[nums.length - 1]),
      min: this.round(Math.min(...nums)),
      max: this.round(Math.max(...nums)),
      avg: this.round(sum / nums.length),
    };
  }

  /**
   * Calculates percentage of true/1 readings vs total readings.
   */
  calcOccupancyPercent(dataPoints: TelemetryPoint[]): number {
    if (!dataPoints || dataPoints.length === 0) return 0;
    const occupied = dataPoints.filter(
      p => Number(p.value) > 0 || String(p.value) === 'true'
    ).length;
    return Math.round((occupied / dataPoints.length) * 100);
  }

  /**
   * Checks if the latest value from a series represents an "open" / "true" / active state.
   * Handles numeric, boolean, and string variants from different sensor brands.
   */
  isActive(value: string | number | boolean, invertForContact = false): boolean {
    const normalized = String(value).toLowerCase();
    const truthy =
      Number(value) > 0 ||
      normalized === 'true' ||
      normalized === 'open' ||
      normalized === 'opened' ||
      normalized === 'on';

    // Contact sensor: true = contact/closed, false = broken/open (inverted)
    return invertForContact ? !truthy : truthy;
  }

  private round(n: number): number {
    return Math.round(n * 10) / 10;
  }
}
