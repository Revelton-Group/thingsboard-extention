export const HOUR_MS = 3600000;
export const DAY_MS = 24 * HOUR_MS;

const BASELINE_DAYS = 28;
const MIN_BASELINE_DAYS = 3;
const NIGHT_END_HOUR = 5;
const LEAK_FACTOR = 1.5;

const HOURLY_RANGE_DAYS = 2;
export const MAX_RANGE_DAYS = 92;

export const METER_STALE_MS = 3 * HOUR_MS;
const STALE_INTERVALS = 2.5;
export const TOTAL_KEYS = ['total', 'data_total', 'data_water_total_m3', 'water_total_m3'];
export const RATE_KEYS = ['rate', 'data_rate'];

export type UtilityUnit = 'kwh' | 'm3' | '';
export type UtilityRateUnit = 'kw' | 'm3h' | '';

export interface UtilityTypeDef {
  icon: string;
  nameKey: string | null;
  unit: UtilityUnit;
  rateUnit: UtilityRateUnit;
  leakCheck: boolean;
}

const KNOWN_TYPES: Record<string, UtilityTypeDef> = {
  electricity: { icon: 'bolt', nameKey: 'utTypeElectricity', unit: 'kwh', rateUnit: 'kw', leakCheck: false },
  water: { icon: 'water_drop', nameKey: 'utTypeWater', unit: 'm3', rateUnit: 'm3h', leakCheck: true },
  'hot-water': { icon: 'hot_tub', nameKey: 'utTypeHotWater', unit: 'm3', rateUnit: 'm3h', leakCheck: true },
  heating: { icon: 'whatshot', nameKey: 'utTypeHeating', unit: 'kwh', rateUnit: 'kw', leakCheck: false },
  gas: { icon: 'local_fire_department', nameKey: 'utTypeGas', unit: 'm3', rateUnit: 'm3h', leakCheck: false },
};
const TYPE_ORDER = Object.keys(KNOWN_TYPES);
const UNKNOWN_TYPE: UtilityTypeDef = { icon: 'speed', nameKey: null, unit: '', rateUnit: '', leakCheck: false };

export interface HourUse {
  ts: number;
  use: number;
  exact: boolean;
}

export interface UtilityMeter {
  id: string;
  name: string;
  model: string;
  typeId: string;
  total: number | null;
  rate: number | null;
  lastTs: number;
  /** Typical time between readings, 0 when not known yet. */
  intervalMs: number;
  hours: HourUse[];
}

export type UsualStatus = 'usual' | 'above' | 'high' | 'below' | 'none';

export type UtilityIssue =
  | { kind: 'leak'; level: 'alert' }
  | { kind: 'high'; level: 'warn'; pct: number }
  | { kind: 'offline'; level: 'warn'; meterId: string };

export interface UtilitySummary {
  typeId: string;
  meters: UtilityMeter[];
  today: number | null;
  pct: number | null;
  status: UsualStatus;
  issues: UtilityIssue[];
}

export interface SeriesBucket {
  ts: number;
  value: number;
}

export interface UtilitySeries {
  buckets: SeriesBucket[];
  total: number;
  prevTotal: number | null;
  nightShare: number | null;
  hasData: boolean;
  hourly: boolean;
}

export function isUtilitiesAlias(alias: unknown): boolean {
  return String(alias || '').toLowerCase().includes('utilit');
}

export function datasourceId(ds: any): string | undefined {
  return typeof ds?.entityId === 'string' ? ds.entityId : ds?.entityId?.id;
}

export function utilityDeviceIds(datasources: any[] | undefined): string[] {
  const ids = new Set<string>();
  for (const ds of datasources || []) {
    const id = datasourceId(ds);
    if (id && ds.entityType === 'DEVICE' && isUtilitiesAlias(ds.aliasName)) ids.add(id);
  }
  return Array.from(ids).sort();
}

/** `milesight-em300-util-water` → `water`; null when the profile is not a utility meter. */
export function utilityTypeOf(profile: unknown): string | null {
  const m = String(profile || '').trim().toLowerCase().match(/(?:^|[-_ ])util[-_ ]([a-z0-9]+(?:[-_ ][a-z0-9]+)*)$/);
  return m ? m[1].replace(/[_ ]/g, '-') : null;
}

/** `milesight-em300-util-water` → `Milesight EM300`; empty when the profile has nothing before `-util-`. */
export function utilityModelOf(profile: unknown): string {
  const name = String(profile || '').trim();
  const m = name.toLowerCase().match(/[-_ ]util[-_ ][a-z0-9]+(?:[-_ ][a-z0-9]+)*$/);
  if (!m || !m.index) return '';
  return name.slice(0, m.index).split(/[-_ ]+/).filter(Boolean)
    .map(w => (/\d/.test(w) && /[a-z]/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function utilityModelShort(model: string): string {
  const words = model.split(' ');
  return words.length > 1 ? words.slice(1).join(' ') : model;
}

export function utilityDef(typeId: string): UtilityTypeDef {
  return KNOWN_TYPES[typeId] || UNKNOWN_TYPE;
}

export function humanizeType(typeId: string): string {
  const words = typeId.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function compareTypes(a: string, b: string): number {
  const rank = (t: string) => {
    const i = TYPE_ORDER.indexOf(t);
    return i < 0 ? TYPE_ORDER.length : i;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function clockIn(ts: number, tz: string): { hour: number; minute: number; second: number } {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(tz, f);
  }
  const part = (parts: Intl.DateTimeFormatPart[], type: string) => Number(parts.find(p => p.type === type)?.value || 0);
  const parts = f.formatToParts(ts);
  return { hour: part(parts, 'hour'), minute: part(parts, 'minute'), second: part(parts, 'second') };
}

export function hourOfDay(ts: number, tz: string): number {
  return clockIn(ts, tz).hour;
}

export function startOfDay(ts: number, tz: string): number {
  const c = clockIn(ts, tz);
  const guess = Math.floor(ts / 1000) * 1000 - (c.hour * HOUR_MS + c.minute * 60000 + c.second * 1000);
  const h = clockIn(guess, tz).hour;
  if (h === 23) return guess + HOUR_MS;
  if (h === 1) return guess - HOUR_MS;
  return guess;
}

export function nextDay(dayStart: number, tz: string): number {
  return startOfDay(dayStart + 26 * HOUR_MS, tz);
}

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();

/** Calendar day of a timestamp in the time zone, as `YYYY-MM-DD`. */
export function dayKey(ts: number, tz: string): string {
  let f = dayKeyFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayKeyFormatters.set(tz, f);
  }
  const parts = f.formatToParts(ts);
  const part = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Start of a `YYYY-MM-DD` day in the time zone; null when the text is not a date. */
export function dayStartOf(key: string, tz: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) return null;
  const noon = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isFinite(noon) ? startOfDay(noon, tz) : null;
}

export function floorHour(ts: number): number {
  return Math.floor(ts / HOUR_MS) * HOUR_MS;
}

/** Hourly use from readings of a rising counter (the highest reading of each hour counts). A gap is spread evenly; a counter reset counts as 0. */
export function toHourly(points: { ts: number; value: unknown }[]): HourUse[] {
  const sorted = (points || [])
    .filter(p => p.value !== null && p.value !== '')
    .map(p => ({ h: floorHour(Number(p.ts)), v: Number(p.value) }))
    .filter(p => Number.isFinite(p.h) && Number.isFinite(p.v))
    .sort((a, b) => a.h - b.h);
  const readings: { h: number; v: number }[] = [];
  for (const p of sorted) {
    const last = readings[readings.length - 1];
    if (last && last.h === p.h) last.v = Math.max(last.v, p.v);
    else readings.push(p);
  }
  const out: HourUse[] = [];
  for (let i = 1; i < readings.length; i++) {
    const gap = Math.round((readings[i].h - readings[i - 1].h) / HOUR_MS);
    const use = Math.max(0, readings[i].v - readings[i - 1].v) / gap;
    for (let g = 0; g < gap; g++) out.push({ ts: readings[i - 1].h + g * HOUR_MS, use, exact: gap === 1 });
  }
  return out;
}

export function mergeHours(lists: HourUse[][]): HourUse[] {
  const byTs = new Map<number, HourUse>();
  for (const list of lists) {
    for (const h of list) {
      const cur = byTs.get(h.ts);
      if (cur) {
        cur.use += h.use;
        cur.exact = cur.exact && h.exact;
      } else {
        byTs.set(h.ts, { ...h });
      }
    }
  }
  return Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);
}

function usageBetween(hours: HourUse[], from: number, to: number): { use: number; count: number } {
  let use = 0;
  let count = 0;
  for (const h of hours) {
    const overlap = Math.min(h.ts + HOUR_MS, to) - Math.max(h.ts, from);
    if (overlap <= 0) continue;
    use += (h.use * overlap) / HOUR_MS;
    count++;
  }
  return { use, count };
}

/** Median time between readings; 0 with fewer than 3 readings. */
export function readingInterval(points: { ts: number }[]): number {
  const ts = (points || []).map(p => Number(p.ts)).filter(Number.isFinite).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < ts.length; i++) if (ts[i] > ts[i - 1]) gaps.push(ts[i] - ts[i - 1]);
  if (gaps.length < 2) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Today so far and the average of the same part of the day over the last 4 weeks.
 * "So far" ends at the last reading, so a meter that reports every few hours is not compared against hours it has not reported yet.
 */
export function compareToUsual(hours: HourUse[], now: number, tz: string): { today: number | null; usual: number | null } {
  const todayStart = startOfDay(now, tz);
  const lastEnd = hours.length ? hours[hours.length - 1].ts + HOUR_MS : 0;
  const end = Math.min(floorHour(now) + HOUR_MS, lastEnd);
  const current = usageBetween(hours, todayStart, end);
  const today = current.count > 0 ? current.use : null;
  const elapsed = Math.min(now, end) - todayStart;
  if (elapsed < HOUR_MS) return { today, usual: null };

  const needed = Math.max(1, Math.floor(elapsed / HOUR_MS / 2));
  const samples: number[] = [];
  let dayStart = todayStart;
  for (let k = 0; k < BASELINE_DAYS; k++) {
    dayStart = startOfDay(dayStart - 1, tz);
    const past = usageBetween(hours, dayStart, dayStart + elapsed);
    if (past.count >= needed) samples.push(past.use);
  }
  if (samples.length < MIN_BASELINE_DAYS) return { today, usual: null };
  return { today, usual: samples.reduce((a, b) => a + b, 0) / samples.length };
}

export function statusOfPct(pct: number | null): UsualStatus {
  if (pct === null) return 'none';
  if (pct > 125) return 'high';
  if (pct > 105) return 'above';
  if (pct < 90) return 'below';
  return 'usual';
}

/** Flow never stopped between 01:00 and 05:00 tonight, and that window used clearly more than usual. */
export function nightFlowFlag(hours: HourUse[], now: number, tz: string): boolean {
  const todayStart = startOfDay(now, tz);
  const windowOf = (day: number) => [day + HOUR_MS, day + NIGHT_END_HOUR * HOUR_MS];
  const [from, to] = windowOf(todayStart);
  if (now < to) return false;

  const tonight = hours.filter(h => h.ts >= from && h.ts < to);
  if (tonight.length < NIGHT_END_HOUR - 1 || !tonight.every(h => h.exact && h.use > 0)) return false;

  const samples: number[] = [];
  let dayStart = todayStart;
  for (let k = 0; k < BASELINE_DAYS; k++) {
    dayStart = startOfDay(dayStart - 1, tz);
    const [a, b] = windowOf(dayStart);
    const past = usageBetween(hours, a, b);
    if (past.count > 0) samples.push(past.use);
  }
  if (samples.length < MIN_BASELINE_DAYS) return false;
  const usual = samples.reduce((x, y) => x + y, 0) / samples.length;
  return usageBetween(hours, from, to).use >= usual * LEAK_FACTOR;
}

export function staleAfter(meter: UtilityMeter): number {
  return Math.max(METER_STALE_MS, (meter.intervalMs || 0) * STALE_INTERVALS);
}

export function isMeterOffline(meter: UtilityMeter, now: number): boolean {
  return !meter.lastTs || now - meter.lastTs > staleAfter(meter);
}

export function summarize(meters: UtilityMeter[], now: number, tz: string): UtilitySummary[] {
  const byType = new Map<string, UtilityMeter[]>();
  for (const m of meters) byType.set(m.typeId, [...(byType.get(m.typeId) || []), m]);

  return Array.from(byType.keys()).sort(compareTypes).map(typeId => {
    const group = byType.get(typeId)!;
    let today: number | null = null;
    let compared = 0;
    let usual = 0;
    for (const m of group) {
      const c = compareToUsual(m.hours, now, tz);
      if (c.today === null) continue;
      today = (today ?? 0) + c.today;
      if (c.usual === null) continue;
      compared += c.today;
      usual += c.usual;
    }
    const pct = usual > 0 ? Math.round((compared / usual) * 100) : null;
    const status = statusOfPct(pct);

    const issues: UtilityIssue[] = [];
    if (utilityDef(typeId).leakCheck && nightFlowFlag(mergeHours(group.map(m => m.hours)), now, tz)) {
      issues.push({ kind: 'leak', level: 'alert' });
    } else if (status === 'high' && pct !== null) {
      issues.push({ kind: 'high', level: 'warn', pct });
    }
    for (const m of group) {
      if (isMeterOffline(m, now)) issues.push({ kind: 'offline', level: 'warn', meterId: m.id });
    }
    return { typeId, meters: group, today, pct, status, issues };
  });
}

/** 1 day: the last 24 hours. 7 or 30 days: calendar days ending today, compared with the same window one period earlier. */
export function buildSeries(hours: HourUse[], days: number, now: number, tz: string): UtilitySeries {
  const edges: number[] = [];
  const end = floorHour(now) + HOUR_MS;
  if (days === 1) {
    for (let i = 24; i >= 1; i--) edges.push(end - i * HOUR_MS);
  } else {
    let d = startOfDay(now, tz);
    edges.unshift(d);
    for (let i = 1; i < days; i++) {
      d = startOfDay(d - 1, tz);
      edges.unshift(d);
    }
  }
  const shift = days * DAY_MS;
  return seriesOf(hours, edges, end, edges[0] - shift, now - shift, days === 1, tz);
}

/**
 * Calendar days from `from` (start of the first day) to `to` (start of the day after the last one):
 * hourly bars for up to 2 days, daily bars beyond, compared with the same span right before it.
 */
export function buildRangeSeries(hours: HourUse[], from: number, to: number, now: number, tz: string): UtilitySeries {
  const hourly = to - from <= HOURLY_RANGE_DAYS * DAY_MS + HOUR_MS;
  const edges: number[] = [];
  for (let ts = from; ts < to; ts = hourly ? ts + HOUR_MS : nextDay(ts, tz)) edges.push(ts);
  const end = Math.min(to, floorHour(now) + HOUR_MS);
  const shift = to - from;
  return seriesOf(hours, edges, end, from - shift, Math.min(to, now) - shift, hourly, tz);
}

function seriesOf(hours: HourUse[], edges: number[], end: number, prevFrom: number, prevTo: number, hourly: boolean, tz: string): UtilitySeries {
  const start = edges[0];
  const buckets = edges.map((ts, i) => ({ ts, value: usageBetween(hours, ts, Math.min(edges[i + 1] ?? end, end)).use }));
  const total = buckets.reduce((a, b) => a + b.value, 0);
  const prev = usageBetween(hours, prevFrom, prevTo);

  let night = 0;
  let hasData = false;
  for (const h of hours) {
    if (h.ts < start || h.ts >= end) continue;
    hasData = true;
    if (hourOfDay(h.ts, tz) < NIGHT_END_HOUR) night += h.use;
  }
  return {
    buckets,
    total,
    prevTotal: prev.count > 0 ? prev.use : null,
    nightShare: total > 0 ? night / total : null,
    hasData,
    hourly,
  };
}

export function niceCeil(x: number): number {
  if (x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const r = x / p;
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(n => n >= r - 1e-9)! * p;
}
