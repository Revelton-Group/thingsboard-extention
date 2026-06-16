import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ISensorProcessor, NoiseResult } from '../../core/interfaces';
import { DiscoveredDevice, TimeWindow, DEFAULT_NOISE_STATS } from '../../core/models';
import { NOISE_KEYS } from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { DataAggregationService } from '../services/data-aggregation.service';

@Injectable({ providedIn: 'any' })
export class NoiseProcessor implements ISensorProcessor {

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private agg: DataAggregationService,
  ) {}

  canHandle(availableKeys: string[], _deviceName: string): boolean {
    return NOISE_KEYS.some(k => availableKeys.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[], tw: TimeWindow): Observable<NoiseResult> {
    const fetchKeys = keys.filter(k => (NOISE_KEYS as unknown as string[]).includes(k.toLowerCase()));
    return this.telemetry.getTimeseries(device.id, fetchKeys, tw.startTs, tw.endTs, tw.intervalMs).pipe(
      map(ts => this.buildResult(ts, tw)),
      catchError(() => of(this.buildResult({}, tw))),
    );
  }

  private buildResult(ts: any, tw: TimeWindow): NoiseResult {
    const stats = DEFAULT_NOISE_STATS();
    const chartData: any[] = [];

    const noiseKey = NOISE_KEYS.find(k => ts[k]?.length);
    if (noiseKey) {
      const s = this.agg.calcStats(ts[noiseKey]);
      stats.current = s.latest;
      stats.min = s.min;
      stats.avg = s.avg;
      stats.peak = s.max;
      chartData.push({ name: 'Noise (dB)', values: this.agg.aggregateSeries(ts[noiseKey], tw.intervalMs) });
    }

    return { panel: 'noise', stats, chartData };
  }
}
