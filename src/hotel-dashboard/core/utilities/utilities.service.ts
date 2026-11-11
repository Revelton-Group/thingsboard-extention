import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HOTEL_TIMEZONE } from '../models/dashboard.config';
import {
  DAY_MS, HOUR_MS, HourUse, RATE_KEYS, TOTAL_KEYS, UtilityMeter, UtilitySummary,
  floorHour, readingInterval, startOfDay, summarize, toHourly, utilityDeviceIds, utilityModelOf, utilityTypeOf,
} from './utilities.core';

export interface UtilitiesState {
  status: 'none' | 'loading' | 'ready' | 'error';
  meters: UtilityMeter[];
  summaries: UtilitySummary[];
  issueCount: number;
  historyLoading: boolean;
  /** Start of the loaded history, 0 until the first load. */
  historyFrom: number;
}

const EMPTY: UtilitiesState = { status: 'none', meters: [], summaries: [], issueCount: 0, historyLoading: false, historyFrom: 0 };
const HTTP_OPTS = { ignoreErrors: true, ignoreLoading: true };
const HISTORY_DAYS = 62;
/**
 * An hourly aggregation costs the server one query per hour, raw readings are a single query.
 * Raw readings are used unless the meter reports too often to fit in this many points.
 */
const RAW_LIMIT = 3000;
const RAW_WINDOW_MS = (HISTORY_DAYS + 1) * DAY_MS;
/** ThingsBoard rejects a request with more than 700 aggregation intervals ("Number of intervals is to high"). */
const AGG_WINDOW_MS = 25 * DAY_MS;
const TICK_MS = 60000;
const HISTORY_REFRESH_OPEN_MS = 5 * 60000;
const HISTORY_REFRESH_CLOSED_MS = 15 * 60000;

interface Point { ts: number; value: unknown; }
/** Readings kept per meter, so a refresh only asks for what came after them. */
interface MeterHistory { key: string; dense: boolean; from: number; lastTs: number; points: Point[]; }
const NO_HISTORY: MeterHistory = { key: '', dense: false, from: 0, lastTs: 0, points: [] };

@Injectable()
export class UtilitiesService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<UtilitiesState>(EMPTY);
  readonly state$ = this.stateSubject.asObservable();

  private ctx: any = null;
  private ids: string[] = [];
  private idsKey = '';
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private panelOpen = false;
  private historyAt = 0;
  private reloadingGeneration = -1;
  private reloadQueued = false;
  private sinceTs = Infinity;
  private totals = new Map<string, { key: string; ts: number }>();
  private history = new Map<string, MeterHistory>();

  update(ctx: any): void {
    this.ctx = ctx;
    const ids = utilityDeviceIds(ctx?.datasources);
    const key = ids.join('|');
    if (key === this.idsKey) return;
    this.idsKey = key;
    this.ids = ids;
    this.generation++;
    this.historyAt = 0;
    this.reloadQueued = false;
    this.sinceTs = Infinity;
    this.totals.clear();
    this.history.clear();
    this.stopTimer();
    this.stateSubject.next(ids.length ? { ...EMPTY, status: 'loading' } : EMPTY);
    if (!ids.length) return;
    void this.reload();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  setPanelOpen(open: boolean): void {
    this.panelOpen = open;
    if (open && Date.now() - this.historyAt >= HISTORY_REFRESH_OPEN_MS) void this.reload();
  }

  /** Loads older history when a range starts before what is loaded. */
  ensureSince(ts: number): void {
    if (!this.ids.length || ts >= this.sinceTs) return;
    this.sinceTs = ts;
    const loaded = this.stateSubject.value.historyFrom;
    if (!loaded || ts < loaded) void this.reload();
  }

  retry(): void {
    if (!this.ids.length) return;
    this.stateSubject.next({ ...this.stateSubject.value, status: 'loading' });
    void this.reload();
  }

  ngOnDestroy(): void {
    this.generation++;
    this.stopTimer();
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    const every = this.panelOpen ? HISTORY_REFRESH_OPEN_MS : HISTORY_REFRESH_CLOSED_MS;
    if (Date.now() - this.historyAt >= every) void this.reload();
    else if (this.panelOpen) void this.refreshLatest(this.generation);
  }

  private publish(patch: Partial<UtilitiesState>): void {
    const merged = { ...this.stateSubject.value, ...patch };
    const summaries = summarize(merged.meters, Date.now(), HOTEL_TIMEZONE);
    const issueCount = summaries.reduce((n, s) => n + s.issues.length, 0);
    this.stateSubject.next({ ...merged, summaries, issueCount });
  }

  private async reload(): Promise<void> {
    const generation = this.generation;
    if (this.reloadingGeneration === generation) {
      this.reloadQueued = true;
      return;
    }
    this.reloadingGeneration = generation;
    this.reloadQueued = false;
    try {
      this.stateSubject.next({ ...this.stateSubject.value, historyLoading: true });
      const ok = await this.refreshLatest(generation);
      if (generation !== this.generation) return;
      if (!ok) {
        this.publish({ status: this.stateSubject.value.meters.length ? 'ready' : 'error', historyLoading: false });
        return;
      }
      await this.loadHistory(generation);
    } finally {
      if (this.reloadingGeneration === generation) {
        this.reloadingGeneration = -1;
        if (this.reloadQueued) void this.reload();
      }
    }
  }

  private async refreshLatest(generation: number): Promise<boolean> {
    try {
      const body = {
        entityFilter: { type: 'entityList', entityType: 'DEVICE', entityList: this.ids },
        pageLink: { pageSize: this.ids.length, page: 0 },
        entityFields: [
          { type: 'ENTITY_FIELD', key: 'name' },
          { type: 'ENTITY_FIELD', key: 'label' },
          { type: 'ENTITY_FIELD', key: 'type' },
        ],
        latestValues: [...TOTAL_KEYS, ...RATE_KEYS].map(key => ({ type: 'TIME_SERIES', key })),
      };
      const res: any = await firstValueFrom(this.ctx.http.post('/api/entitiesQuery/find', body, HTTP_OPTS));
      if (generation !== this.generation) return false;

      const previous = new Map(this.stateSubject.value.meters.map(m => [m.id, m]));
      const meters: UtilityMeter[] = [];
      for (const row of res?.data || []) {
        const id = row?.entityId?.id;
        const fields = row?.latest?.ENTITY_FIELD || {};
        const typeId = utilityTypeOf(fields.type?.value);
        if (!id || !typeId) continue;
        const series = row.latest.TIME_SERIES || {};
        const total = this.latestOf(series, TOTAL_KEYS);
        const rate = this.latestOf(series, RATE_KEYS);
        if (total.key) this.totals.set(id, { key: total.key, ts: total.ts });
        else this.totals.delete(id);
        meters.push({
          id,
          typeId,
          name: fields.label?.value || fields.name?.value || id,
          model: utilityModelOf(fields.type?.value),
          total: total.value,
          rate: rate.value,
          lastTs: Math.max(total.ts, rate.ts),
          intervalMs: previous.get(id)?.intervalMs || 0,
          hours: previous.get(id)?.hours || [],
        });
      }
      meters.sort((a, b) => a.name.localeCompare(b.name));
      this.publish({ meters, status: this.stateSubject.value.status === 'error' ? 'ready' : this.stateSubject.value.status });
      return true;
    } catch {
      return false;
    }
  }

  private latestOf(series: any, keys: string[]): { value: number | null; ts: number; key: string } {
    let best: { value: number | null; ts: number; key: string } = { value: null, ts: 0, key: '' };
    for (const key of keys) {
      const ts = Number(series[key]?.ts) || 0;
      const value = Number(series[key]?.value);
      if (ts > best.ts && series[key]?.value !== '' && Number.isFinite(value)) best = { value, ts, key };
    }
    return best;
  }

  private async loadHistory(generation: number): Promise<void> {
    const meters = this.stateSubject.value.meters;
    const now = Date.now();
    const startTs = Math.min(startOfDay(now, HOTEL_TIMEZONE) - HISTORY_DAYS * DAY_MS, this.sinceTs);

    const results = await Promise.all(meters.map(async m => {
      try {
        return { id: m.id, history: await this.loadMeter(m.id, startTs, now) };
      } catch {
        return null;
      }
    }));
    if (generation !== this.generation) return;

    const changed = new Map<string, { hours: HourUse[]; intervalMs: number }>();
    let loaded = 0;
    for (const r of results) {
      if (!r) continue;
      loaded++;
      if (this.history.get(r.id) === r.history) continue;
      this.history.set(r.id, r.history);
      changed.set(r.id, { hours: toHourly(r.history.points), intervalMs: readingInterval(r.history.points) });
    }
    this.historyAt = Date.now();
    this.publish({
      meters: this.stateSubject.value.meters.map(m => {
        const r = changed.get(m.id);
        return r ? { ...m, hours: r.hours, intervalMs: r.intervalMs || m.intervalMs } : m;
      }),
      status: loaded || !meters.length ? 'ready' : 'error',
      historyLoading: false,
      historyFrom: startTs,
    });
  }

  /** Returns the cached history itself when it already covers the range and the meter has reported nothing new. */
  private async loadMeter(id: string, startTs: number, now: number): Promise<MeterHistory> {
    const total = this.totals.get(id);
    if (!total) return NO_HISTORY;
    const cached = this.history.get(id);
    const known = cached?.key === total.key ? cached : undefined;
    const older = !known || known.from > startTs;
    const newer = !known || total.ts > known.lastTs;
    if (known && !older && !newer) return known;

    let dense = known?.dense ?? false;
    let points = known?.points ?? [];
    const fetch = async (from: number, to: number): Promise<Point[]> => {
      const out: Point[] = [];
      for (let a = from; a < to; a += RAW_WINDOW_MS) {
        const b = Math.min(a + RAW_WINDOW_MS, to);
        let part = dense ? null : await this.fetchRaw(id, total.key, a, b);
        if (!part) {
          dense = true;
          part = await this.fetchHourly(id, total.key, a, b);
        }
        out.push(...part);
      }
      return out;
    };
    if (!known) {
      points = await fetch(startTs, now);
    } else {
      if (older) points = [...await fetch(startTs, known.from), ...points];
      if (newer) {
        const last = points[points.length - 1];
        const from = last ? floorHour(last.ts) : known.from;
        points = [...points.filter(p => p.ts < from), ...await fetch(from, now)];
      }
    }
    return { key: total.key, dense, from: known ? Math.min(known.from, startTs) : startTs, lastTs: total.ts, points };
  }

  private series(id: string, query: string): Promise<any> {
    return firstValueFrom(this.ctx.http.get(`/api/plugins/telemetry/DEVICE/${id}/values/timeseries?${query}`, HTTP_OPTS));
  }

  /** Null when the range holds more readings than RAW_LIMIT. */
  private async fetchRaw(id: string, key: string, from: number, to: number): Promise<Point[] | null> {
    const res = await this.series(id, `keys=${key}&startTs=${from}&endTs=${to}&agg=NONE&limit=${RAW_LIMIT}&orderBy=ASC`);
    const points: Point[] = res?.[key] || [];
    return points.length < RAW_LIMIT ? points : null;
  }

  private async fetchHourly(id: string, key: string, from: number, to: number): Promise<Point[]> {
    const windows: [number, number][] = [];
    for (let a = from; a < to; a += AGG_WINDOW_MS) windows.push([a, Math.min(a + AGG_WINDOW_MS, to)]);
    const parts = await Promise.all(windows.map(([a, b]) =>
      this.series(id, `keys=${key}&startTs=${a}&endTs=${b}&interval=${HOUR_MS}&agg=MAX&limit=${AGG_WINDOW_MS / HOUR_MS + 1}&orderBy=ASC`)));
    return parts.flatMap(res => res?.[key] || []);
  }
}
