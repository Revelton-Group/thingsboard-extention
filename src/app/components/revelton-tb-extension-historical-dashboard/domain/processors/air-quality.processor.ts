import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ISensorProcessor, AirQualityResult } from '../../core/interfaces';
import {
  DiscoveredDevice, TimeWindow,
  DEFAULT_AIR_QUALITY_STATS, EMPTY_AIR_QUALITY_CHART,
  AirQualityChartData,
} from '../../core/models';
import {
  AIR_QUALITY_KEYS,
  AIR_QUALITY_IDENTIFIER_KEYS,
  THERMOSTAT_IDENTIFIER_KEYS,
} from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { DataAggregationService } from '../services/data-aggregation.service';

/**
 * AirQualityProcessor
 *
 * SRP: Owns only air quality / environment sensor data.
 * Does NOT re-classify thermostat devices — excludes them explicitly.
 */
@Injectable({ providedIn: 'any' })
export class AirQualityProcessor implements ISensorProcessor {

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private agg: DataAggregationService,
  ) {}

  canHandle(availableKeys: string[], _deviceName: string): boolean {
    const isThermostat = THERMOSTAT_IDENTIFIER_KEYS.some(k => availableKeys.includes(k));
    if (isThermostat) return false;
    return AIR_QUALITY_IDENTIFIER_KEYS.some(k => availableKeys.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[], tw: TimeWindow): Observable<AirQualityResult> {
    const fetchKeys = keys.filter(k =>
      (AIR_QUALITY_KEYS as unknown as string[]).includes(k.toLowerCase())
    );

    return this.telemetry.getTimeseries(device.id, fetchKeys, tw.startTs, tw.endTs, tw.intervalMs).pipe(
      map(ts => this.buildResult(ts, tw)),
      catchError(() => of(this.buildResult({}, tw))),
    );
  }

  private buildResult(ts: any, tw: TimeWindow): AirQualityResult {
    const stats = DEFAULT_AIR_QUALITY_STATS();
    const chart = EMPTY_AIR_QUALITY_CHART();

    if (ts.co2?.length) {
      const s = this.agg.calcStats(ts.co2);
      stats.co2 = s.latest;
      chart.co2 = [{ name: 'CO2 (ppm)', values: this.agg.aggregateSeries(ts.co2, tw.intervalMs) }];
    }
    if (ts.humidity?.length) {
      const s = this.agg.calcStats(ts.humidity);
      stats.humidity = s.latest;
      const series = { name: 'Humidity (%)', values: this.agg.aggregateSeries(ts.humidity, tw.intervalMs) };
      chart.combined = [...chart.combined, series];
    }
    if (ts.temperature?.length) {
      const s = this.agg.calcStats(ts.temperature);
      stats.temp = s.latest;
      const series = { name: 'Temp (°C)', values: this.agg.aggregateSeries(ts.temperature, tw.intervalMs) };
      chart.combined = [series, ...chart.combined];
    }
    if (ts.pm25?.length) {
      const s = this.agg.calcStats(ts.pm25);
      stats.pm25 = s.latest;
      chart.pm25 = [{ name: 'PM2.5 (µg)', values: this.agg.aggregateSeries(ts.pm25, tw.intervalMs) }];
    }
    if (ts.tvoc?.length) {
      const s = this.agg.calcStats(ts.tvoc);
      stats.tvoc = s.latest;
      chart.tvoc = [{ name: 'TVOC (ppb)', values: this.agg.aggregateSeries(ts.tvoc, tw.intervalMs) }];
    }
    if (ts.iaq?.length) {
      const s = this.agg.calcStats(ts.iaq);
      stats.iaq = s.latest;
      chart.iaq = [{ name: 'IAQ', values: this.agg.aggregateSeries(ts.iaq, tw.intervalMs) }];
    }
    if (ts.pressure?.length) {
      const s = this.agg.calcStats(ts.pressure);
      stats.pressure = s.latest;
      chart.pressure = [{ name: 'Pressure (hPa)', values: this.agg.aggregateSeries(ts.pressure, tw.intervalMs) }];
    }

    return { panel: 'airQuality', stats, chartData: chart };
  }
}
