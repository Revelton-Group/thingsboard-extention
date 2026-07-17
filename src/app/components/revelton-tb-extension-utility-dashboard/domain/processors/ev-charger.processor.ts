import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IUtilityProcessor, EvChargerResult } from '../../core/interfaces';
import { ChargingStatus, EvChargerStats } from '../../core/models';
import {
  EV_CHARGER_IDENTIFIER_KEYS,
  EV_CHARGER_POWER_KEYS,
  EV_CHARGER_ENERGY_KEYS,
  EV_CHARGER_SESSION_KEYS,
  EV_CHARGER_CURRENT_KEYS,
  EV_CHARGER_VOLTAGE_KEYS,
  EV_CHARGER_ALL_KEYS,
} from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../../revelton-tb-extension-historical-dashboard/data/services/thingsboard-telemetry.service';
import { DiscoveredDevice } from '../../../revelton-tb-extension-historical-dashboard/core/models/time-range.models';

@Injectable({ providedIn: 'any' })
export class EvChargerProcessor implements IUtilityProcessor {

  constructor(private telemetry: ThingsBoardTelemetryService) {}

  canHandle(availableKeys: string[]): boolean {
    const lower = availableKeys.map(k => k.toLowerCase());
    return EV_CHARGER_IDENTIFIER_KEYS.some(k => lower.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[]): Observable<EvChargerResult | null> {
    const fetchKeys = keys.filter(k => EV_CHARGER_ALL_KEYS.includes(k.toLowerCase()));

    return this.telemetry.getLatestTelemetry(device.id, fetchKeys).pipe(
      map(ts => this.buildResult(ts, device)),
      catchError(() => of(null)),
    );
  }

  private buildResult(ts: Record<string, any[]>, device: DiscoveredDevice): EvChargerResult | null {
    const stats: EvChargerStats = {
      deviceName: device.name,
      deviceId: device.id.id,
      chargingStatus: this.resolveStatus(ts),
      powerKw: this.resolveFirstNumeric(ts, EV_CHARGER_POWER_KEYS),
      energyKwh: this.resolveFirstNumeric(ts, EV_CHARGER_ENERGY_KEYS),
      sessionDurationMs: this.resolveSessionMs(ts),
      currentA: this.resolveFirstNumeric(ts, EV_CHARGER_CURRENT_KEYS),
      voltageV: this.resolveFirstNumeric(ts, EV_CHARGER_VOLTAGE_KEYS),
      rawTs: ts,
    };

    return { panel: 'evCharger', stats };
  }

  private resolveStatus(ts: Record<string, any[]>): ChargingStatus {
    const key = EV_CHARGER_IDENTIFIER_KEYS.find(k => ts[k]?.length);
    if (!key) return 'unavailable';

    const raw = ts[key][ts[key].length - 1]?.value;
    if (raw === undefined || raw === null) return 'unavailable';

    const str = String(raw).toLowerCase().trim();
    const num = Number(raw);

    if (str.includes('charge') || str.includes('in_progress') || str.includes('active') || num === 1) {
      return 'charging';
    }
    if (str.includes('fault') || str.includes('alarm') || num >= 2) {
      return 'error';
    }
    if (str.includes('idle') || str.includes('available') || str.includes('avail') || str.includes('unplugged') || str.includes('ready') || num === 0) {
      return 'idle';
    }

    return 'unavailable';
  }

  private resolveFirstNumeric(ts: Record<string, any[]>, keyVariants: readonly string[]): number {
    for (const key of keyVariants) {
      if (ts[key]?.length) {
        const val = Number(ts[key][ts[key].length - 1]?.value);
        if (!isNaN(val)) return Math.round(val * 100) / 100;
      }
    }
    return 0;
  }

  private resolveSessionMs(ts: Record<string, any[]>): number {
    const key = EV_CHARGER_SESSION_KEYS.find(k => ts[k]?.length);
    if (!key) return 0;
    const val = Number(ts[key][ts[key].length - 1]?.value);
    if (isNaN(val)) return 0;
    // Values under 10000 are treated as seconds (typical ThingsBoard behavior for durations)
    return val < 10000 ? val * 1000 : val;
  }
}
