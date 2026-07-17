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
    const laeqSeries = ts['laeq'] || ts['data_laeq'] || ts['data_LAeq'] || ts['noise'] || ts['sound_level'] || ts['noise_level'] || ts['acoustic'] || [];
    const laiSeries = ts['lai'] || ts['data_lai'] || ts['data_LAI'] || [];
    const laimaxSeries = ts['laimax'] || ts['data_laimax'] || ts['data_LAImax'] || [];

    const statsLaeq = DEFAULT_NOISE_STATS();
    const statsLai = DEFAULT_NOISE_STATS();
    const statsLaimax = DEFAULT_NOISE_STATS();

    const chartDataObj: any = { laeq: [], lai: [], laimax: [] };

    if (laeqSeries.length) {
      const s = this.agg.calcStats(laeqSeries);
      statsLaeq.current = s.latest;
      statsLaeq.min = s.min;
      statsLaeq.avg = s.avg;
      statsLaeq.peak = s.max;
      chartDataObj.laeq = [{ name: 'LAeq (dB)', values: this.agg.aggregateSeries(laeqSeries, tw.intervalMs) }];
    }
    if (laiSeries.length) {
      const s = this.agg.calcStats(laiSeries);
      statsLai.current = s.latest;
      statsLai.min = s.min;
      statsLai.avg = s.avg;
      statsLai.peak = s.max;
      chartDataObj.lai = [{ name: 'LAI (dB)', values: this.agg.aggregateSeries(laiSeries, tw.intervalMs) }];
    } else if (laeqSeries.length) {
      statsLai.current = statsLaeq.current;
      statsLai.min = statsLaeq.min;
      statsLai.avg = statsLaeq.avg;
      statsLai.peak = statsLaeq.peak;
      chartDataObj.lai = chartDataObj.laeq;
    }
    if (laimaxSeries.length) {
      const s = this.agg.calcStats(laimaxSeries);
      statsLaimax.current = s.latest;
      statsLaimax.min = s.min;
      statsLaimax.avg = s.avg;
      statsLaimax.peak = s.max;
      chartDataObj.laimax = [{ name: 'LAImax (dB)', values: this.agg.aggregateSeries(laimaxSeries, tw.intervalMs) }];
    } else if (laeqSeries.length) {
      statsLaimax.current = statsLaeq.current;
      statsLaimax.min = statsLaeq.min;
      statsLaimax.avg = statsLaeq.avg;
      statsLaimax.peak = statsLaeq.peak;
      chartDataObj.laimax = chartDataObj.laeq;
    }

    const stats: any = {
      ...statsLaeq,
      laeq: statsLaeq,
      lai: statsLai,
      laimax: statsLaimax,
    };

    return { panel: 'noise', stats, chartData: chartDataObj as unknown as any[] };
  }
}
