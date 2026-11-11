import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ThingsBoardTelemetryService } from '../../shared/services/thingsboard-telemetry.service';
import { EntityId, TelemetryPoint } from '../../shared/models/telemetry.models';
import {
  DAY_MS, ElectricityMeter, KEY_DAILY, KEY_POWER, KEY_STATUS, METER_TIMEZONE, STATUS_MEASURED,
  isCezProfile, monthsBetween, numberOf, parseMeterName, startOfDay,
} from '../electricity/electricity.core';

export interface ElectricityState {
  /** `none`: the widget has no ČEZ meter. */
  status: 'none' | 'loading' | 'ready' | 'error';
  meters: ElectricityMeter[];
  /** 15-minute data of the shown period is being fetched. */
  loading: boolean;
  /** Data of the shown period, or a meter's daily totals, could not be loaded; `retry()` tries again. */
  failed: boolean;
  revision: number;
}

interface Source { devices: string[]; root: EntityId | null; }
interface Chunk { meter: ElectricityMeter; key: string; from: number; to: number; }

const EMPTY: ElectricityState = { status: 'none', meters: [], loading: false, failed: false, revision: 0 };
const DAILY_HISTORY_MS = 5 * 366 * DAY_MS;
const DAILY_LIMIT = 2000;
/** A month of 15-minute values is at most 31 × 96 + 4. */
const CHUNK_LIMIT = 3200;
const MAX_PARALLEL = 6;
const CHECK_EVERY_MS = 15 * 60000;
/** Timers drift; a check that comes this much early still runs. */
const CHECK_SLACK_MS = 60000;
const DISCOVERY_RETRY_MS = [30000, 60000, 120000, 300000];
/** The portal can fill in a missing interval up to 7 days later. */
const REVISABLE_MS = 8 * DAY_MS;

@Injectable()
export class ElectricityService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<ElectricityState>(EMPTY);
  readonly state$ = this.stateSubject.asObservable();

  private ctx: any = null;
  private sourceKey = '';
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private discoveryAttempt = 0;
  private checkedAt = 0;
  /** `<meter id>|<YYYY-MM>` of the months whose 15-minute data is in memory. */
  private loaded = new Set<string>();
  private pending = new Set<string>();
  private failedKeys = new Set<string>();
  /** Months the shown period needs. */
  private wanted = new Set<string>();
  /** Months that changed while their request was running; the answer is used but the month is fetched again. */
  private stale = new Set<string>();
  /** Meters whose daily totals could not be loaded. */
  private dailyFailed = new Set<string>();
  private queue: { key: string; run: () => Promise<void> }[] = [];
  private running = 0;
  private readonly onVisible = () => {
    if (!document.hidden) this.check();
  };

  constructor(private telemetry: ThingsBoardTelemetryService) {}

  get state(): ElectricityState {
    return this.stateSubject.value;
  }

  init(ctx: any): void {
    this.ctx = ctx;
    this.refresh();
  }

  /** Looks for ČEZ meters again when the widget's entities changed. */
  refresh(): void {
    const source = this.source();
    const key = [source.root?.id || '', ...source.devices].join('|');
    if (key === this.sourceKey) return;
    this.sourceKey = key;
    this.reset('none');
    void this.discover(source, this.generation);
  }

  setActive(active: boolean): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = active ? setInterval(() => this.check(), CHECK_EVERY_MS) : null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisible);
      if (active) document.addEventListener('visibilitychange', this.onVisible);
    }
    if (active) this.check();
  }

  retry(): void {
    if (this.state.status === 'error') {
      this.reset('loading');
      void this.discover(this.source(), this.generation);
      return;
    }
    this.failedKeys.clear();
    if (this.dailyFailed.size) void this.reloadFailedDaily(this.generation);
    this.publish({ failed: this.dailyFailed.size > 0 });
  }

  /** Whether the 15-minute data of every meter is in memory for `[from, to)`. */
  isLoaded(from: number, to: number): boolean {
    return this.missing(from, to).length === 0;
  }

  /** Fetches the months of 15-minute data that `[from, to)` needs and are not in memory yet; drops queued months nobody needs now. */
  ensureRange(from: number, to: number): void {
    if (this.state.status !== 'ready') return;
    const generation = this.generation;
    const missing = this.missing(from, to);
    this.wanted = new Set(missing.map(c => c.key));

    this.queue = this.queue.filter(job => {
      if (this.wanted.has(job.key)) return true;
      this.pending.delete(job.key);
      return false;
    });
    for (const key of Array.from(this.failedKeys)) if (!this.wanted.has(key)) this.failedKeys.delete(key);

    for (const chunk of missing) {
      if (this.pending.has(chunk.key) || this.failedKeys.has(chunk.key)) continue;
      this.pending.add(chunk.key);
      this.queue.push({ key: chunk.key, run: () => this.loadChunk(chunk, generation) });
    }
    this.pump();

    const loading = missing.some(c => this.pending.has(c.key));
    const failed = this.dailyFailed.size > 0 || missing.some(c => this.failedKeys.has(c.key));
    if (loading !== this.state.loading || failed !== this.state.failed) this.publish({ loading, failed });
  }

  ngOnDestroy(): void {
    this.generation++;
    this.queue = [];
    if (this.timer) clearInterval(this.timer);
    if (this.discoveryTimer) clearTimeout(this.discoveryTimer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
  }

  private reset(status: 'none' | 'loading'): void {
    this.generation++;
    this.queue = [];
    this.loaded.clear();
    this.pending.clear();
    this.failedKeys.clear();
    this.wanted.clear();
    this.stale.clear();
    this.dailyFailed.clear();
    this.checkedAt = 0;
    this.discoveryAttempt = 0;
    if (this.discoveryTimer) clearTimeout(this.discoveryTimer);
    this.discoveryTimer = null;
    this.stateSubject.next({ ...EMPTY, status });
  }

  private publish(patch: Partial<ElectricityState>): void {
    this.stateSubject.next({ ...this.state, ...patch, revision: this.state.revision + 1 });
  }

  private source(): Source {
    const idOf = (ds: any): string | undefined => (typeof ds?.entityId === 'string' ? ds.entityId : ds?.entityId?.id);
    const datasources: any[] = this.ctx?.datasources?.length
      ? this.ctx.datasources
      : (this.ctx?.data || []).map((d: any) => d?.datasource).filter(Boolean);
    const devices = new Set<string>();
    for (const ds of datasources) {
      const id = idOf(ds);
      if (id && ds.entityType === 'DEVICE') devices.add(id);
    }
    const rootId = idOf(datasources[0]);
    return {
      devices: Array.from(devices).sort(),
      root: rootId ? { id: rootId, entityType: datasources[0].entityType || 'ASSET' } : null,
    };
  }

  /** A failed request is tried again later instead of being taken for "no ČEZ meter". */
  private async discover(source: Source, generation: number): Promise<void> {
    let found: Map<string, ElectricityMeter>;
    try {
      const ids = new Set(source.devices);
      if (source.root) {
        const related = await firstValueFrom(this.telemetry.getDeviceRelations(source.root, true));
        if (generation !== this.generation) return;
        related.forEach(d => ids.add(d.id.id));
      }
      if (!ids.size) {
        if (this.state.status === 'loading') this.publish({ status: 'none' });
        return;
      }
      found = await this.findMeters(Array.from(ids));
    } catch {
      if (generation !== this.generation) return;
      if (this.state.status === 'loading') this.publish({ status: 'error' });
      const delay = DISCOVERY_RETRY_MS[Math.min(this.discoveryAttempt++, DISCOVERY_RETRY_MS.length - 1)];
      this.discoveryTimer = setTimeout(() => {
        if (generation === this.generation) void this.discover(source, generation);
      }, delay);
      return;
    }
    if (generation !== this.generation) return;
    if (!found.size) {
      if (this.state.status !== 'none') this.publish({ status: 'none' });
      return;
    }

    const meters = Array.from(found.values());
    this.stateSubject.next({ ...EMPTY, status: 'loading', meters });
    const ok = await Promise.all(meters.map(m => this.loadDaily(m)));
    if (generation !== this.generation) return;
    meters.forEach((m, i) => (ok[i] ? this.dailyFailed.delete(m.id) : this.dailyFailed.add(m.id)));
    this.checkedAt = Date.now();
    this.publish({ status: ok.some(Boolean) ? 'ready' : 'error', failed: this.dailyFailed.size > 0 });
  }

  /** The devices among `ids` whose profile is `CEZ Meter`, with their labels and the time of their latest reading. */
  private async findMeters(ids: string[]): Promise<Map<string, ElectricityMeter>> {
    const res: any = await firstValueFrom(this.telemetry.findEntities({
      entityFilter: { type: 'entityList', entityType: 'DEVICE', entityList: ids },
      pageLink: { pageSize: ids.length, page: 0 },
      entityFields: ['name', 'label', 'type'].map(key => ({ type: 'ENTITY_FIELD', key })),
      latestValues: [
        ...['hotel', 'elm'].map(key => ({ type: 'ATTRIBUTE', key })),
        ...[KEY_POWER, KEY_DAILY].map(key => ({ type: 'TIME_SERIES', key })),
      ],
    }));
    const meters = new Map<string, ElectricityMeter>();
    for (const row of res?.data || []) {
      const id = row?.entityId?.id;
      const fields = row?.latest?.ENTITY_FIELD || {};
      if (!id || !isCezProfile(fields.type?.value)) continue;
      const attrs = row.latest.ATTRIBUTE || {};
      const series = row.latest.TIME_SERIES || {};
      const name = String(fields.name?.value || id);
      const parsed = parseMeterName(name);
      const dailyTs = this.tsOf(series[KEY_DAILY]);
      meters.set(id, {
        id,
        name,
        hotel: String(attrs.hotel?.value || parsed.hotel || fields.label?.value || name),
        serial: String(attrs.elm?.value || parsed.serial || ''),
        daily: new Map(),
        power: new Map(),
        flags: new Map(),
        firstDay: 0,
        lastTs: Math.max(this.tsOf(series[KEY_POWER]), dailyTs),
        dailyTs,
      });
    }
    return meters;
  }

  private tsOf(latest: any): number {
    return latest && latest.value !== '' && latest.value !== null ? Number(latest.ts) || 0 : 0;
  }

  private async loadDaily(meter: ElectricityMeter): Promise<boolean> {
    try {
      const now = Date.now();
      const res = await firstValueFrom(
        this.telemetry.getRawTimeseries(meter.id, [KEY_DAILY], now - DAILY_HISTORY_MS, now + DAY_MS, DAILY_LIMIT));
      const daily = new Map<number, number>();
      for (const p of res[KEY_DAILY] || []) {
        const v = numberOf(p.value);
        if (v !== null) daily.set(startOfDay(Number(p.ts), METER_TIMEZONE), v);
      }
      meter.daily = daily;
      const first = Math.min(...daily.keys());
      if (Number.isFinite(first)) meter.firstDay = meter.firstDay ? Math.min(meter.firstDay, first) : first;
      return true;
    } catch {
      return false;
    }
  }

  private async reloadFailedDaily(generation: number): Promise<void> {
    const meters = this.state.meters.filter(m => this.dailyFailed.has(m.id));
    const ok = await Promise.all(meters.map(m => this.loadDaily(m)));
    if (generation !== this.generation) return;
    meters.forEach((m, i) => ok[i] && this.dailyFailed.delete(m.id));
    if (ok.some(Boolean)) this.publish({ failed: this.dailyFailed.size > 0 || Array.from(this.wanted).some(key => this.failedKeys.has(key)) });
  }

  private missing(from: number, to: number): Chunk[] {
    const months = monthsBetween(from, to, METER_TIMEZONE);
    const out: Chunk[] = [];
    for (const meter of this.state.meters) {
      for (const month of months) {
        const key = `${meter.id}|${month.key}`;
        if (month.from > meter.lastTs || this.loaded.has(key)) continue;
        out.push({ meter, key, from: month.from, to: month.to });
      }
    }
    return out;
  }

  private pump(): void {
    while (this.running < MAX_PARALLEL && this.queue.length) {
      const job = this.queue.shift()!;
      this.running++;
      void job.run().finally(() => {
        this.running--;
        this.pump();
      });
    }
  }

  private async loadChunk(chunk: Chunk, generation: number): Promise<void> {
    let res: Record<string, TelemetryPoint[]> | null = null;
    try {
      res = await firstValueFrom(this.telemetry.getRawTimeseries(chunk.meter.id, [KEY_POWER, KEY_STATUS], chunk.from, chunk.to, CHUNK_LIMIT));
    } catch {
      res = null;
    }
    if (generation !== this.generation) return;
    this.pending.delete(chunk.key);
    if (res) {
      this.ingest(chunk.meter, chunk.from, chunk.to, res);
      if (!this.stale.delete(chunk.key)) this.loaded.add(chunk.key);
    } else {
      this.failedKeys.add(chunk.key);
    }
    // Publish once the shown period has all it asked for, not after every month of it.
    if (!this.wanted.has(chunk.key)) return;
    if (Array.from(this.wanted).some(key => this.pending.has(key))) return;
    const failed = this.dailyFailed.size > 0 || Array.from(this.wanted).some(key => this.failedKeys.has(key));
    this.publish({ loading: false, failed });
  }

  private ingest(meter: ElectricityMeter, from: number, to: number, res: Record<string, TelemetryPoint[]>): void {
    for (const ts of Array.from(meter.power.keys())) if (ts >= from && ts < to) meter.power.delete(ts);
    for (const ts of Array.from(meter.flags.keys())) if (ts >= from && ts < to) meter.flags.delete(ts);
    let first = Infinity;
    for (const p of res[KEY_POWER] || []) {
      const v = numberOf(p.value);
      if (v === null) continue;
      const ts = Number(p.ts);
      meter.power.set(ts, v);
      if (ts < first) first = ts;
    }
    for (const p of res[KEY_STATUS] || []) {
      const code = numberOf(p.value);
      if (code !== null && code !== STATUS_MEASURED) meter.flags.set(Number(p.ts), code);
    }
    if (Number.isFinite(first)) {
      const day = startOfDay(first, METER_TIMEZONE);
      meter.firstDay = meter.firstDay ? Math.min(meter.firstDay, day) : day;
    }
  }

  /** Picks up the next day's batch: a meter whose latest reading moved gets its daily values and recent months again. */
  private check(): void {
    if (this.state.status !== 'ready' || Date.now() - this.checkedAt < CHECK_EVERY_MS - CHECK_SLACK_MS) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.checkedAt = Date.now();
    void this.recheck(this.generation);
  }

  private async recheck(generation: number): Promise<void> {
    const meters = this.state.meters;
    let latest: Map<string, ElectricityMeter>;
    try {
      latest = await this.findMeters(meters.map(m => m.id));
    } catch {
      return;
    }
    if (generation !== this.generation) return;
    const newestDay = (m: ElectricityMeter) => Math.max(0, ...m.daily.keys());
    const moved = meters.filter(m => {
      const now = latest.get(m.id);
      if (!now) return false;
      return now.lastTs > m.lastTs || this.dailyFailed.has(m.id)
        || (!!now.dailyTs && startOfDay(now.dailyTs, METER_TIMEZONE) > newestDay(m));
    });
    if (!moved.length) return;

    for (const m of moved) {
      for (const month of monthsBetween(m.lastTs - REVISABLE_MS, Date.now(), METER_TIMEZONE)) {
        const key = `${m.id}|${month.key}`;
        this.loaded.delete(key);
        if (this.pending.has(key)) this.stale.add(key);
      }
    }
    const ok = await Promise.all(moved.map(m => this.loadDaily(m)));
    if (generation !== this.generation) return;
    moved.forEach((m, i) => {
      if (!ok[i]) {
        this.dailyFailed.add(m.id);
        return;
      }
      this.dailyFailed.delete(m.id);
      m.lastTs = latest.get(m.id)!.lastTs;
      m.dailyTs = latest.get(m.id)!.dailyTs;
    });
    this.publish({ failed: this.dailyFailed.size > 0 || Array.from(this.wanted).some(key => this.failedKeys.has(key)) });
  }
}
