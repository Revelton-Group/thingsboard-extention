import { Injectable } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ISensorProcessor, ThermostatResult } from '../../core/interfaces';
import { DiscoveredDevice, TimeWindow, DEFAULT_THERMOSTAT_STATS } from '../../core/models';
import {
  THERMOSTAT_IDENTIFIER_KEYS,
  TEMPERATURE_VARIANTS,
  THERMOSTAT_TIMESERIES_KEYS,
} from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { DataAggregationService } from '../services/data-aggregation.service';

/**
 * ThermostatProcessor
 *
 * SRP: Owns only thermostat data fetching and transformation.
 * OCP: Adding a new TRV brand = update TEMPERATURE_VARIANTS constant only.
 */
@Injectable({ providedIn: 'any' })
export class ThermostatProcessor implements ISensorProcessor {

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private agg: DataAggregationService,
  ) {}

  canHandle(availableKeys: string[], _deviceName: string): boolean {
    return THERMOSTAT_IDENTIFIER_KEYS.some(k => availableKeys.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[], tw: TimeWindow): Observable<ThermostatResult> {
    const tsKeys = keys.filter(k =>
      ([...THERMOSTAT_TIMESERIES_KEYS, ...TEMPERATURE_VARIANTS] as string[]).includes(k.toLowerCase())
    );

    return this.telemetry.getSharedOrServerAttribute(device.id, 'current_heating_setpoint').pipe(
      switchMap(spAttr => {
        const setpointValue = spAttr ? Number(spAttr.value) : null;
        return this.telemetry.getTimeseries(device.id, tsKeys, tw.startTs, tw.endTs, tw.intervalMs).pipe(
          map(ts => this.buildResult(ts, tw, setpointValue)),
        );
      }),
      catchError(() => of(this.buildResult({}, tw, null))),
    );
  }

  private buildResult(ts: any, tw: TimeWindow, setpointValue: number | null): ThermostatResult {
    const stats = DEFAULT_THERMOSTAT_STATS();
    const chartData: any[] = [];

    // Resolve temperature key — prefer local_temperature (Zigbee TRV), fallback to temperature
    const tempKey = TEMPERATURE_VARIANTS.find(k => ts[k]?.length > 0);
    if (tempKey) {
      const tempPoints = ts[tempKey];
      const s = this.agg.calcStats(tempPoints);
      stats.currentTemp = s.latest;
      stats.min = s.min;
      stats.max = s.max;
      stats.avg = s.avg;
      chartData.push({ name: 'Current Temp', values: this.agg.aggregateSeries(tempPoints, tw.intervalMs) });
    }

    // Flat setpoint reference line
    if (setpointValue != null && !isNaN(setpointValue)) {
      stats.setpoint = Math.round(setpointValue * 10) / 10;
      chartData.push({
        name: 'Setpoint',
        dashed: true,
        values: [[tw.startTs, setpointValue], [tw.endTs, setpointValue]],
      });
    }

    // Running state & mode
    if (ts.running_state?.length) {
      const state = ts.running_state[ts.running_state.length - 1].value;
      stats.runningState = state;
      stats.heating = state;
    }
    if (ts.system_mode?.length) {
      stats.mode = ts.system_mode[ts.system_mode.length - 1].value;
    }

    return { panel: 'thermostat', stats, chartData };
  }
}
