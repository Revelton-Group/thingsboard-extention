import { ALL_FIELDS, FIELD_BY_KEY, KEY_PAIRS, SettingField, SettingValue } from './control-settings.schema';

export type Attrs = Record<string, unknown>;
export type Source = 'room' | 'hotel' | 'default';

const isEmpty = (raw: unknown): boolean =>
  raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');

export function coerce(field: SettingField, raw: unknown): SettingValue {
  if (isEmpty(raw)) return null;
  if (field.kind === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).toLowerCase();
    if (s === 'true' || s === '1' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'off') return false;
    return null;
  }
  if (field.kind === 'number') {
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  }
  return String(raw);
}

export function effective(field: SettingField, hotel: Attrs, room?: Attrs): { value: SettingValue; source: Source } {
  if (room && (field.scope === 'HR' || field.scope === 'R')) {
    const r = coerce(field, room[field.key]);
    if (r !== null) return { value: r, source: 'room' };
  }
  const h = coerce(field, hotel[field.key]);
  if (h !== null) return { value: h, source: 'hotel' };
  return { value: field.def, source: 'default' };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function validate(field: SettingField, value: unknown): string | null {
  if (field.kind === 'boolean') return typeof value === 'boolean' ? null : 'type';
  if (field.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'type';
    if (field.min !== undefined && value < field.min) return 'range';
    if (field.max !== undefined && value > field.max) return 'range';
    if (field.dailySender && value < 1500) return 'daily';
    return null;
  }
  if (field.kind === 'time') return typeof value === 'string' && TIME_RE.test(value) ? null : 'time';
  if (field.kind === 'date') return typeof value === 'string' && DATE_RE.test(value) ? null : 'time';
  if (field.kind === 'enum') return field.options!.includes(String(value)) ? null : 'type';
  if (typeof value !== 'string' || value.trim() === '') return 'type';
  return field.key === 'heat_timezone' && !validZone(value) ? 'type' : null;
}

export function buildSave(changes: Record<string, unknown>, base: Attrs = {}): { set: Attrs; errors: Record<string, string> } {
  const set: Attrs = {};
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(changes)) {
    const field = FIELD_BY_KEY[key];
    if (!field) { errors[key] = 'unknown'; continue; }
    const err = validate(field, value);
    if (err) errors[key] = err; else set[key] = value;
  }
  for (const [lo, hi] of KEY_PAIRS) {
    if (!(lo in set) && !(hi in set)) continue;
    const l = coerce(FIELD_BY_KEY[lo], lo in set ? set[lo] : base[lo]);
    const h = coerce(FIELD_BY_KEY[hi], hi in set ? set[hi] : base[hi]);
    if (typeof l === 'number' && typeof h === 'number' && l >= h) {
      if (lo in set) { errors[lo] = 'order'; delete set[lo]; }
      if (hi in set) { errors[hi] = 'order'; delete set[hi]; }
    }
  }
  return { set, errors };
}

export function buildReset(keys: string[]): string[] {
  return keys.filter(k => {
    const f = FIELD_BY_KEY[k];
    return !!f && (f.scope === 'HR' || f.scope === 'R');
  });
}

export function buildBulk(mode: 'auto' | 'manual', nowMs: number, lastTs: number): Attrs {
  return { heat_bulk_wt_mode: mode, heat_bulk_ts: Math.max(nowMs, lastTs + 1) };
}

export function dayNight(nowMs: number, tz: string, start: string, end: string): 'day' | 'night' {
  const fmt = (timeZone?: string) =>
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(nowMs);
  let hhmm: string;
  try {
    hhmm = fmt(tz);
  } catch {
    hhmm = fmt();
  }
  const inDay = start <= end ? hhmm >= start && hhmm < end : hhmm >= start || hhmm < end;
  return inDay ? 'day' : 'night';
}

export { ALL_FIELDS };
