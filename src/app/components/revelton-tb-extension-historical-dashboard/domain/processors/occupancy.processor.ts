import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ISensorProcessor, OccupancyResult } from '../../core/interfaces';
import { DiscoveredDevice, TimeWindow, DEFAULT_OCCUPANCY_STATS } from '../../core/models';
import { OCCUPANCY_KEYS } from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { DataAggregationService } from '../services/data-aggregation.service';

@Injectable({ providedIn: 'any' })
export class OccupancyProcessor implements ISensorProcessor {

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private agg: DataAggregationService,
  ) {}

  canHandle(availableKeys: string[], _deviceName: string): boolean {
    return OCCUPANCY_KEYS.some(k => availableKeys.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[], tw: TimeWindow): Observable<OccupancyResult> {
    const fetchKeys = keys.filter(k => (OCCUPANCY_KEYS as unknown as string[]).includes(k.toLowerCase()));
    return this.telemetry.getTimeseries(device.id, fetchKeys, tw.startTs, tw.endTs, tw.intervalMs).pipe(
      map(ts => this.buildResult(ts, tw)),
      catchError(() => of(this.buildResult({}, tw))),
    );
  }

  private buildResult(ts: any, tw: TimeWindow): OccupancyResult {
    const stats = DEFAULT_OCCUPANCY_STATS();
    const chartData: any[] = [];

    const occKey = OCCUPANCY_KEYS.find(k => ts[k]?.length);
    if (occKey) {
      const raw = ts[occKey];
      const latest = raw[raw.length - 1].value;
      stats.current = (latest === true || latest === 'true' || Number(latest) > 0)
        ? 'Occupied' : 'Unoccupied';
      stats.avg = this.agg.calcOccupancyPercent(raw);
      chartData.push({ name: 'Occupancy', values: this.agg.aggregateSeries(raw, tw.intervalMs) });
    }

    return { panel: 'occupancy', stats, chartData };
  }
}
