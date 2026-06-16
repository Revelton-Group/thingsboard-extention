import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import {
  DashboardViewModel,
  DEFAULT_VIEW_MODEL,
  ChargerCardViewModel,
  ChargerStationViewModel,
  ChargingStatus,
} from '../../core/models';
import { UtilityPanelResult } from '../../core/interfaces';
import { ThingsBoardTelemetryService } from '../../../revelton-tb-extension-historical-dashboard/data/services/thingsboard-telemetry.service';
import { DiscoveredDevice, EntityId } from '../../../revelton-tb-extension-historical-dashboard/core/models/time-range.models';
import { EvChargerProcessor } from '../processors/ev-charger.processor';

const STATUS_LABELS: Record<ChargingStatus, string> = {
  idle: 'Available',
  charging: 'Charging',
  error: 'Fault',
  unavailable: 'Offline',
};

@Injectable({ providedIn: 'any' })
export class UtilityStateService implements OnDestroy {
  private readonly _vm$ = new BehaviorSubject<DashboardViewModel>(DEFAULT_VIEW_MODEL());
  readonly viewModel$ = this._vm$.asObservable();

  private readonly destroy$ = new Subject<void>();
  private readonly fetchTrigger$ = new Subject<void>();

  private ctx: any;

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private chargerProc: EvChargerProcessor,
  ) {
    this.setupFetchPipeline();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  init(ctx: any): void {
    this.ctx = ctx;
    this.telemetry.init(ctx);

    if (ctx.defaultSubscription) {
      ctx.defaultSubscription.options.callbacks.onDataUpdated = () => this.onThingsBoardDataUpdated();
    }
    this.onThingsBoardDataUpdated();
  }

  // ─── Public API for widget JS callbacks ─────────────────────────────────────

  refresh(): void {
    this.onThingsBoardDataUpdated();
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private onThingsBoardDataUpdated(): void {
    const data: any[] = this.ctx?.data || [];
    const firstItem = data[0];
    const propertyName = firstItem?.datasource?.entityName
      || firstItem?.datasource?.name
      || firstItem?.datasource?.entityLabel
      || 'Property';

    this.patch({ propertyName, isLoading: false });
    this.triggerFetch();
  }

  private setupFetchPipeline(): void {
    this.fetchTrigger$.pipe(
      switchMap(() => this.runFetch()),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  private triggerFetch(): void {
    this.fetchTrigger$.next();
  }

  private runFetch() {
    const data: any[] = this.ctx?.data || [];
    const firstItem = data[0];

    if (!firstItem?.datasource?.entityId) {
      this.patch({ isLoading: false, chargers: [], totalChargers: 0, activeChargers: 0 });
      return of(null);
    }

    const rootEntityId: EntityId = {
      id: firstItem.datasource.entityId,
      entityType: firstItem.datasource.entityType || 'ASSET',
    };

    this.patch({ isLoading: true });

    return this.telemetry.getDeviceRelations(rootEntityId).pipe(
      switchMap(relatedDevices => {
        // Always include the root entity itself so direct device aliasing works
        const rootDevice: DiscoveredDevice = {
          id: rootEntityId,
          name: firstItem.datasource?.entityName
            || firstItem.datasource?.name
            || firstItem.datasource?.entityLabel
            || rootEntityId.id,
        };
        const allDevices = [rootDevice, ...(relatedDevices || [])];
        const uniqueDevices = allDevices.filter(
          (d, i, arr) => arr.findIndex(x => x.id.id === d.id.id) === i,
        );

        const deviceFetches = uniqueDevices.map(device =>
          this.telemetry.getDeviceKeys(device.id).pipe(
            switchMap(lowerKeys => {
              if (!this.chargerProc.canHandle(lowerKeys, device.name)) {
                return of(null);
              }
              return this.chargerProc.process(device, lowerKeys, {} as any);
            }),
          )
        );

        return forkJoin(deviceFetches).pipe(
          tap(results => {
            const chargerResults: ChargerCardViewModel[] = [];

            for (const result of results) {
              if (result && (result as UtilityPanelResult)?.panel === 'evCharger') {
                const r = result as UtilityPanelResult & { panel: 'evCharger' };
                chargerResults.push(this.buildChargerViewModel(r.stats));
              }
            }

            const totalPowerKw = chargerResults.reduce((sum, c) => sum + (c.stationA.powerKw || 0) + (c.stationB.powerKw || 0), 0);
            const totalEnergyKwh = chargerResults.reduce((sum, c) => sum + (c.stationA.deliveredKwh || 0) + (c.stationB.deliveredKwh || 0), 0);
            const activeChargers = chargerResults.filter(c => c.stationA.status === 'charging' || c.stationB.status === 'charging').length;
            const activeFaults = chargerResults.filter(c => c.stationA.status === 'error' || c.stationB.status === 'error').length;
            const totalRevenueEuro = chargerResults.reduce((sum, c) => sum + (c.stationA.sessionEuro || 0) + (c.stationB.sessionEuro || 0), 0);

            this.patch({
              isLoading: false,
              chargers: chargerResults,
              totalChargers: chargerResults.length * 2, // 2 stations per charger
              activeChargers,
              activeFaults,
              totalPowerKw: Math.round(totalPowerKw * 100) / 100,
              totalEnergyKwh: Math.round(totalEnergyKwh * 100) / 100,
              totalRevenueEuro: Math.round(totalRevenueEuro * 100) / 100,
            });

            if (this.ctx?.detectChanges) this.ctx.detectChanges();
          }),
        );
      }),
      catchError(err => {
        console.error('[UtilityState] fetch pipeline error:', err);
        this.patch({ isLoading: false });
        return of(null);
      }),
    );
  }

  private buildChargerViewModel(stats: any): ChargerCardViewModel {
    const ts = stats.rawTs || {};
    const getTsVal = (key: string) => {
      const entry = ts[key];
      if (entry && entry.length > 0) return entry[entry.length - 1].value;
      return undefined;
    };

    const deviceName = stats.deviceName || 'Unknown';
    const deviceId = stats.deviceId || '';

    const matches = deviceName.match(/(\d+)/);
    const num = matches ? matches[1].padStart(2, '0') : '01';
    const deviceCode = 'CityCharge Mini 2';

    // ─── Detect key pattern: connector_N_* (real device) or station_a/b_* (legacy) ───
    const hasConnectorKeys = getTsVal('connector_0_status') !== undefined
      || getTsVal('connector_1_status') !== undefined;
    const hasStationKeys = getTsVal('station_a_status') !== undefined;

    let stationA: ChargerStationViewModel;
    let stationB: ChargerStationViewModel;
    let heartbeatAgo: string;

    if (hasConnectorKeys) {
      // ── Real device telemetry: connector_0_* = Station A, connector_1_* = Station B ──
      const conn0Status = this.mapStatus(getTsVal('connector_0_status'));
      const conn0Ts = getTsVal('connector_0_timestamp');
      const conn0ErrorCode = getTsVal('connector_0_error_code');

      stationA = {
        name: 'Station A',
        status: conn0Status,
        statusLabel: STATUS_LABELS[conn0Status] || 'Unknown',
        statusReason: conn0ErrorCode && conn0ErrorCode !== 'NoError' ? conn0ErrorCode : undefined,
        // These keys are only present when actively charging
        powerKw: this.getNum(getTsVal('connector_0_power') ?? getTsVal('power')),
        deliveredKwh: this.getNum(getTsVal('connector_0_energy') ?? getTsVal('energy')),
        batteryPct: this.getNum(getTsVal('connector_0_battery')),
        sessionEuro: this.getNum(getTsVal('connector_0_cost')),
        sessionDurationFormatted: conn0Status === 'charging' ? 'Realtime' : undefined,
        chargingSince: conn0Status === 'charging' ? this.formatTimestampSince(conn0Ts) : undefined,
      };

      const conn1Status = this.mapStatus(getTsVal('connector_1_status'));
      const conn1Ts = getTsVal('connector_1_timestamp');
      const conn1ErrorCode = getTsVal('connector_1_error_code');

      stationB = {
        name: 'Station B',
        status: conn1Status,
        statusLabel: STATUS_LABELS[conn1Status] || 'Unknown',
        statusReason: conn1ErrorCode && conn1ErrorCode !== 'NoError' ? conn1ErrorCode : undefined,
        powerKw: this.getNum(getTsVal('connector_1_power') ?? getTsVal('power')),
        deliveredKwh: this.getNum(getTsVal('connector_1_energy') ?? getTsVal('energy')),
        batteryPct: this.getNum(getTsVal('connector_1_battery')),
        sessionEuro: this.getNum(getTsVal('connector_1_cost')),
        sessionDurationFormatted: conn1Status === 'charging' ? 'Realtime' : undefined,
        chargingSince: conn1Status === 'charging' ? this.formatTimestampSince(conn1Ts) : undefined,
      };

      // Prioritize last_heartbeat_ts, fallback to connector timestamps
      const heartbeatTs = getTsVal('last_heartbeat_ts') || conn0Ts || conn1Ts;
      heartbeatAgo = heartbeatTs ? this.formatTimeAgo(heartbeatTs) : 'Unknown';

    } else if (hasStationKeys) {
      // ── Legacy station_a/b_* keys ──
      const stAStatusRaw = getTsVal('station_a_status');
      const stAStatus: ChargingStatus = this.mapStatus(stAStatusRaw);
      stationA = {
        name: 'Station A',
        status: stAStatus,
        statusLabel: STATUS_LABELS[stAStatus] || 'Unknown',
        statusReason: getTsVal('station_a_fault_code'),
        powerKw: this.getNum(getTsVal('station_a_power')),
        deliveredKwh: this.getNum(getTsVal('station_a_energy')),
        batteryPct: this.getNum(getTsVal('station_a_battery')),
        sessionEuro: this.getNum(getTsVal('station_a_cost')),
        sessionDurationFormatted: stAStatus === 'charging' ? 'Realtime' : undefined,
        chargingSince: stAStatus === 'charging' ? this.getMockSinceTime() : undefined,
      };

      const stBStatusRaw = getTsVal('station_b_status');
      const stBStatus: ChargingStatus = stBStatusRaw ? this.mapStatus(stBStatusRaw) : 'idle';
      stationB = {
        name: 'Station B',
        status: stBStatus,
        statusLabel: STATUS_LABELS[stBStatus] || 'Unknown',
        statusReason: getTsVal('station_b_fault_code'),
        powerKw: this.getNum(getTsVal('station_b_power')),
        deliveredKwh: this.getNum(getTsVal('station_b_energy')),
        batteryPct: this.getNum(getTsVal('station_b_battery')),
        sessionEuro: this.getNum(getTsVal('station_b_cost')),
        sessionDurationFormatted: stBStatus === 'charging' ? 'Realtime' : undefined,
        chargingSince: stBStatus === 'charging' ? this.getMockSinceTime() : undefined,
      };

      const heartbeatTs = getTsVal('last_heartbeat_ts');
      if (heartbeatTs) {
        heartbeatAgo = this.formatTimeAgo(heartbeatTs);
      } else {
        const heartbeatSec = Math.floor(Math.random() * 5) + 1;
        heartbeatAgo = `${heartbeatSec}s ago`;
      }

    } else {
      // ── Fallback: use aggregated processor stats ──
      const status: ChargingStatus = stats.chargingStatus || 'unavailable';
      stationA = {
        name: 'Station A',
        status,
        statusLabel: STATUS_LABELS[status],
        statusReason: status === 'error' ? 'E-R842' : undefined,
        powerKw: status === 'charging' ? (stats.powerKw || null) : null,
        deliveredKwh: (stats.energyKwh && stats.energyKwh > 0) ? stats.energyKwh : null,
        batteryPct: null,
        sessionEuro: null,
        sessionDurationFormatted: this.formatDuration(stats.sessionDurationMs ?? 0),
        chargingSince: status === 'charging' ? this.getMockSinceTime() : undefined,
      };
      stationB = {
        name: 'Station B',
        status: 'unavailable',
        statusLabel: STATUS_LABELS['unavailable'],
        statusReason: undefined,
        powerKw: null,
        deliveredKwh: null,
        batteryPct: null,
        sessionEuro: null,
        sessionDurationFormatted: undefined,
        chargingSince: undefined,
      };
      const heartbeatTs = getTsVal('last_heartbeat_ts');
      if (heartbeatTs) {
        heartbeatAgo = this.formatTimeAgo(heartbeatTs);
      } else {
        const heartbeatSec = Math.floor(Math.random() * 5) + 1;
        heartbeatAgo = `${heartbeatSec}s ago`;
      }
    }

    return { deviceName, deviceId, deviceCode, stationA, stationB, heartbeatAgo };
  }

  private mapStatus(raw: any): ChargingStatus {
    if (raw === undefined || raw === null) return 'unavailable';
    const s = String(raw).toLowerCase().trim();
    if (s.includes('charg') || s.includes('in_progress') || s.includes('active') || s === '1') return 'charging';
    if (s.includes('fault') || s.includes('error') || s.includes('alarm')) return 'error';
    if (s.includes('idle') || s.includes('avail') || s.includes('unplugged') || s.includes('ready') || s === '0') return 'idle';
    return 'unavailable';
  }

  private getNum(raw: any): number | null {
    if (raw === undefined || raw === null) return null;
    const n = Number(raw);
    return isNaN(n) ? null : Math.round(n * 100) / 100;
  }

  private getMockSinceTime(): string {
    const d = new Date();
    d.setHours(d.getHours() - 1);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Format a timestamp (ISO string or epoch ms) as a human-readable "X ago" string */
  private formatTimeAgo(ts: any): string {
    if (!ts) return 'Unknown';
    try {
      const d = this.parseDate(ts);
      const time = d.getTime();
      if (isNaN(time)) return 'Unknown';

      const diff = Math.floor((Date.now() - time) / 1000);
      if (diff < 0) return 'Just now';
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return 'Unknown';
    }
  }

  /** Format a timestamp as HH:MM for "charging since" display */
  private formatTimestampSince(ts: any): string {
    if (!ts) return this.getMockSinceTime();
    try {
      const d = this.parseDate(ts);
      if (isNaN(d.getTime())) return this.getMockSinceTime();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return this.getMockSinceTime();
    }
  }

  private parseDate(ts: any): Date {
    if (typeof ts === 'number') return new Date(ts);
    // Handle numeric strings like "1715173940000"
    if (!isNaN(Number(ts)) && String(ts).length >= 10 && !String(ts).includes('-') && !String(ts).includes(':')) {
      return new Date(Number(ts));
    }
    return new Date(ts);
  }

  private formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '—';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  private patch(partial: Partial<DashboardViewModel>): void {
    this._vm$.next({ ...this._vm$.value, ...partial });
  }
}
