import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ISensorProcessor, WaterLeakResult } from '../../core/interfaces';
import { DiscoveredDevice, TimeWindow, DEFAULT_WATER_LEAK_STATS } from '../../core/models';
import { WATER_LEAK_KEYS } from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { DataAggregationService } from '../services/data-aggregation.service';

@Injectable({ providedIn: 'any' })
export class WaterLeakProcessor implements ISensorProcessor {

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private agg: DataAggregationService,
  ) {}

  canHandle(availableKeys: string[], _deviceName: string): boolean {
    return WATER_LEAK_KEYS.some(k => availableKeys.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[], tw: TimeWindow): Observable<WaterLeakResult> {
    const fetchKeys = keys.filter(k => (WATER_LEAK_KEYS as unknown as string[]).includes(k.toLowerCase()));
    return this.telemetry.getTimeseries(device.id, fetchKeys, tw.startTs, tw.endTs, tw.intervalMs).pipe(
      map(ts => this.buildResult(ts, tw)),
      catchError(() => of(this.buildResult({}, tw))),
    );
  }

  private buildResult(ts: any, tw: TimeWindow): WaterLeakResult {
    const stats = DEFAULT_WATER_LEAK_STATS();
    const chartData: any[] = [];

    const leakKey = WATER_LEAK_KEYS.find(k => ts[k]?.length);
    if (leakKey) {
      const raw = ts[leakKey];
      const latest = raw[raw.length - 1].value;
      stats.current = (latest === 1 || latest === 'true' || latest === 'True')
        ? 'Leak Detected' : 'No Leak';
      stats.events = raw.filter((p: any) => Number(p.value) > 0 || p.value === 'true').length;
      chartData.push({ name: 'Water Leak', values: this.agg.aggregateSeries(raw, tw.intervalMs) });
    }

    return { panel: 'waterLeak', stats, chartData };
  }
}
