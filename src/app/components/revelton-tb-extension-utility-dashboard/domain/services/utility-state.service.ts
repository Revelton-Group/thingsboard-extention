import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import {
  DashboardViewModel,
  DEFAULT_VIEW_MODEL,
  ChargerCardViewModel,
  SocketViewModel,
  SocketState,
  ChargingStatus,
  EvChargerStats,
} from '../../core/models';
import { UtilityPanelResult } from '../../core/interfaces';
import { ThingsBoardTelemetryService } from '../../../revelton-tb-extension-historical-dashboard/data/services/thingsboard-telemetry.service';
import { DiscoveredDevice, EntityId } from '../../../revelton-tb-extension-historical-dashboard/core/models/time-range.models';
import { EvChargerProcessor } from '../processors/ev-charger.processor';

/** Data older than this (2× the sync interval) is treated as stale — shown as Offline. */
const FRESHNESS_LIMIT_MS = 20 * 60 * 1000;

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
      this.patch({ isLoading: false, chargers: [], totalSockets: 0, activeSockets: 0 });
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
            switchMap(deviceKeys => {
              if (!this.chargerProc.canHandle(deviceKeys)) {
                return of(null);
              }
              return this.chargerProc.process(device, deviceKeys);
            }),
          )
        );

        return forkJoin(deviceFetches).pipe(
          tap(results => {
            const chargers: ChargerCardViewModel[] = [];

            for (const result of results) {
              if (result && (result as UtilityPanelResult)?.panel === 'evCharger') {
                const r = result as UtilityPanelResult & { panel: 'evCharger' };
                chargers.push(this.buildChargerViewModel(r.stats));
              }
            }

            const totalPowerKw = chargers.reduce((sum, c) => sum + (c.activePowerKw || 0), 0);
            const totalEnergyKwh = chargers.reduce((sum, c) => sum + (c.lifetimeKwh || 0), 0);
            const totalSockets = chargers.reduce((sum, c) => sum + c.sockets.length, 0);
            const activeSockets = chargers.reduce(
              (sum, c) => sum + c.sockets.filter(s => s.state === 'charging').length, 0);
            const activeSessions = chargers.reduce((sum, c) => sum + c.activeSessionCount, 0);
            const activeFaults = chargers.reduce(
              (sum, c) => sum + c.sockets.filter(s => s.state === 'fault').length, 0);

            this.patch({
              isLoading: false,
              chargers,
              totalSockets,
              activeSockets,
              activeSessions,
              activeFaults,
              totalPowerKw: Math.round(totalPowerKw * 100) / 100,
              totalEnergyKwh: Math.round(totalEnergyKwh * 100) / 100,
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

  private buildChargerViewModel(stats: EvChargerStats): ChargerCardViewModel {
    const ts = stats.rawTs || {};
    const latest = (key: string): any => {
      const entry = ts[key];
      return entry && entry.length > 0 ? entry[entry.length - 1].value : undefined;
    };

    const deviceName = stats.deviceName || 'Unknown';
    const deviceId = stats.deviceId || '';
    const deviceCode = 'CityCharge Mini 2';

    // ── Summary strip: values wear ink, no status colors ──
    const activePowerKw = this.getNum(latest('total_active_kw')) ?? stats.powerKw ?? 0;
    const lifetimeKwh = this.getNum(latest('total_kwh'))
      ?? (stats.energyKwh > 0 ? stats.energyKwh : null);

    const chargingHours = this.getNum(latest('total_charging_hours'));
    let chargingTimeH: number | null = null;
    let chargingTimeM: number | null = null;
    if (chargingHours !== null) {
      chargingTimeH = Math.floor(chargingHours);
      chargingTimeM = Math.round((chargingHours - chargingTimeH) * 60);
      if (chargingTimeM === 60) { chargingTimeH += 1; chargingTimeM = 0; }
    }

    const sockets = this.buildSockets(ts, latest, stats);

    const sessionCountRaw = this.getNum(latest('active_session_count'));
    const activeSessionCount = sessionCountRaw !== null
      ? Math.round(sessionCountRaw)
      : sockets.filter(s => s.state === 'charging').length;

    // ── Online = station_online AND data fresher than 20 min (2× sync interval).
    //    Stale data must show as stale, not as "online". ──
    const syncTsRaw = latest('last_sync_epoch_ms') ?? latest('last_heartbeat_ts');
    const syncTime = syncTsRaw !== undefined ? this.parseDate(syncTsRaw).getTime() : NaN;
    const fresh = !isNaN(syncTime) && (Date.now() - syncTime) < FRESHNESS_LIMIT_MS;
    const onlineRaw = latest('station_online');
    const online = onlineRaw !== undefined
      ? this.parseBool(onlineRaw) && fresh
      : (isNaN(syncTime) ? sockets.some(s => s.state !== 'offline') : fresh);
    const syncedAgo = !isNaN(syncTime) ? this.formatTimeAgo(syncTime) : 'unknown';

    return {
      deviceName,
      deviceId,
      deviceCode,
      online,
      onlineLabel: online ? 'Online' : 'Offline',
      syncedAgo,
      activePowerKw,
      lifetimeKwh,
      chargingTimeH,
      chargingTimeM,
      activeSessionCount,
      sockets,
    };
  }

  // ─── Socket building ────────────────────────────────────────────────────────

  private buildSockets(
    ts: Record<string, any[]>,
    latest: (key: string) => any,
    stats: EvChargerStats,
  ): SocketViewModel[] {
    // Real device telemetry: discover connector numbers from connector_N_status[_text]
    const connectorNums = new Set<number>();
    for (const key of Object.keys(ts)) {
      const m = key.match(/^connector_(\d+)_status(_text)?$/);
      if (m) connectorNums.add(Number(m[1]));
    }
    if (connectorNums.size > 0) {
      return [...connectorNums]
        .sort((a, b) => a - b)
        .map((n, i) => this.buildConnectorSocket(n, i, latest));
    }

    // Legacy station_a/b_* keys
    if (latest('station_a_status') !== undefined || latest('station_b_status') !== undefined) {
      return [
        this.buildLegacySocket('station_a', 0, latest),
        this.buildLegacySocket('station_b', 1, latest),
      ];
    }

    // Fallback: single socket from aggregated processor stats
    const stateMap: Record<ChargingStatus, SocketState> = {
      idle: 'ready', charging: 'charging', error: 'fault', unavailable: 'offline',
    };
    const state = stateMap[stats.chargingStatus] || 'offline';
    const socket: SocketViewModel = {
      name: 'Socket A',
      typeLabel: 'Type 2',
      state,
      statusLabel: this.defaultStatusLabel(state),
    };
    if (state === 'charging') {
      socket.sessionKw = stats.powerKw || null;
      socket.sessionKwh = stats.energyKwh > 0 ? stats.energyKwh : null;
      socket.usedCurrentA = stats.currentA > 0 ? stats.currentA : null;
      socket.sessionDuration = stats.sessionDurationMs > 0
        ? this.formatMinutes(stats.sessionDurationMs / 60000)
        : undefined;
    } else if (state === 'ready') {
      socket.subLabel = 'Available';
    } else if (state === 'offline') {
      socket.subLabel = 'Not reporting';
    }
    return [socket];
  }

  private buildConnectorSocket(n: number, index: number, latest: (key: string) => any): SocketViewModel {
    const rawStatus = latest(`connector_${n}_status_text`) ?? latest(`connector_${n}_status`);
    const state = this.mapSocketState(rawStatus);
    const statusText = rawStatus !== undefined && rawStatus !== null ? String(rawStatus) : '';

    const socket: SocketViewModel = {
      name: `Socket ${String.fromCharCode(65 + index)}`,
      typeLabel: String(latest(`connector_${n}_type`) ?? 'Type 2'),
      state,
      statusLabel: this.defaultStatusLabel(state),
    };

    if (state === 'charging') {
      socket.sessionKw = this.getNum(latest(`connector_${n}_session_kw`))
        ?? this.getNum(latest(`connector_${n}_power`));
      socket.sessionKwh = this.getNum(latest(`connector_${n}_session_kwh`))
        ?? this.getNum(latest(`connector_${n}_energy`));
      // Username falls back to the RFID hex when the RFID has no registered user
      const user = latest(`connector_${n}_session_username`)
        ?? latest(`connector_${n}_session_rfid_hex`);
      socket.sessionUser = user !== undefined && user !== null && String(user).length > 0
        ? String(user)
        : '—';
      const durMin = this.getNum(latest(`connector_${n}_session_duration_min`));
      socket.sessionDuration = durMin !== null ? this.formatMinutes(durMin) : undefined;
      socket.usedCurrentA = this.getNum(latest(`connector_${n}_used_current_a`));
    } else if (state === 'fault') {
      socket.statusLabel = `⚠ ${statusText || 'Fault'}`;
      const errorCode = latest(`connector_${n}_error_code`);
      socket.subLabel = errorCode && errorCode !== 'NoError'
        ? `${errorCode} — reboot from the console`
        : 'Check the connector, then reboot from the console';
    } else if (state === 'ready') {
      const limit = this.getNum(latest(`connector_${n}_requested_current_a`));
      socket.subLabel = limit !== null && limit > 0
        ? `Available · limit ${Math.round(limit)} A`
        : 'Available';
    } else {
      if (statusText) socket.statusLabel = statusText;
      socket.subLabel = 'Not reporting';
    }

    return socket;
  }

  private buildLegacySocket(
    prefix: 'station_a' | 'station_b',
    index: number,
    latest: (key: string) => any,
  ): SocketViewModel {
    const raw = latest(`${prefix}_status`);
    const state = raw !== undefined ? this.mapSocketState(raw) : 'ready';
    const socket: SocketViewModel = {
      name: `Socket ${String.fromCharCode(65 + index)}`,
      typeLabel: 'Type 2',
      state,
      statusLabel: this.defaultStatusLabel(state),
    };
    if (state === 'charging') {
      socket.sessionKw = this.getNum(latest(`${prefix}_power`));
      socket.sessionKwh = this.getNum(latest(`${prefix}_energy`));
    } else if (state === 'fault') {
      const faultCode = latest(`${prefix}_fault_code`);
      socket.statusLabel = `⚠ ${faultCode || 'Fault'}`;
      socket.subLabel = 'Check the connector, then reboot from the console';
    } else if (state === 'ready') {
      socket.subLabel = 'Available';
    } else {
      socket.subLabel = 'Not reporting';
    }
    return socket;
  }

  /** Ready → green · Charging → blue · Cable/Voltage/Car Error → red · Offline/Disabled → gray */
  private mapSocketState(raw: any): SocketState {
    if (raw === undefined || raw === null) return 'offline';
    const s = String(raw).toLowerCase().trim();
    if (s.includes('charg') || s.includes('in_progress') || s === 'active' || s === '1') return 'charging';
    if (s.includes('error') || s.includes('fault') || s.includes('alarm')) return 'fault';
    if (s.includes('ready') || s.includes('idle') || s.includes('avail') || s.includes('unplugged') || s === '0') return 'ready';
    return 'offline';
  }

  private defaultStatusLabel(state: SocketState): string {
    switch (state) {
      case 'ready': return 'Ready';
      case 'charging': return 'Charging';
      case 'fault': return 'Fault';
      default: return 'Offline';
    }
  }

  // ─── Value helpers ──────────────────────────────────────────────────────────

  private getNum(raw: any): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    return isNaN(n) ? null : Math.round(n * 100) / 100;
  }

  private parseBool(raw: any): boolean {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'on' || s === 'yes';
  }

  /** Format a timestamp (ISO string or epoch ms) as a human-readable "X ago" string */
  private formatTimeAgo(ts: any): string {
    if (!ts) return 'unknown';
    try {
      const d = this.parseDate(ts);
      const time = d.getTime();
      if (isNaN(time)) return 'unknown';

      const diff = Math.floor((Date.now() - time) / 1000);
      if (diff < 0) return 'just now';
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return 'unknown';
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

  private formatMinutes(totalMin: number): string {
    const min = Math.max(0, Math.round(totalMin));
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} m`;
    return `${m} min`;
  }

  private patch(partial: Partial<DashboardViewModel>): void {
    this._vm$.next({ ...this._vm$.value, ...partial });
  }
}
