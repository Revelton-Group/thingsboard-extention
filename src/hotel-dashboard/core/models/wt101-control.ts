/**
 * WT101 control contract: the UI only writes SHARED `wt_*` attributes on each device.
 * The ThingsBoard rule chain turns them into downlinks and reports its progress in the
 * SERVER attributes `wt_state` / `wt_sent` / `wt_last_cmd` and the `wt_downlink_error` telemetry.
 */

export type WtField = 'target' | 'mode' | 'range' | 'lock' | 'window' | 'freeze';
export type WtSync = 'confirmed' | 'pending' | 'failed';

export interface WtDeviceState {
  shared: Record<string, any>;
  server: Record<string, any>;
  error: string;
  /** lastUpdateTs of the SHARED wt_* keys */
  sharedTs?: Record<string, number>;
}

/** A field still unconfirmed this long after it was written, with the chain idle, is reported as failed */
export const WT_STALE_MS = 15 * 60 * 1000;

export const WT_FIELDS: WtField[] = ['target', 'mode', 'range', 'lock', 'window', 'freeze'];
export const WT_SHARED_KEYS = [
  'wt_target_temperature', 'wt_mode', 'wt_child_lock', 'wt_open_window_detection',
  'wt_freeze_protection', 'wt_temp_range_min', 'wt_temp_range_max',
];
export const WT_SERVER_KEYS = ['wt_state', 'wt_sent', 'wt_last_cmd'];
export const WT_MODES = ['auto', 'manual', 'off'];
export const WT_BOOL_KEYS = ['wt_child_lock', 'wt_open_window_detection', 'wt_freeze_protection'];
export const WT_TARGET_LIMITS: [number, number] = [5, 35];
export const WT_RANGE_MIN_LIMITS: [number, number] = [5, 15];
export const WT_RANGE_MAX_LIMITS: [number, number] = [16, 35];

/** Shared attribute → the field name the chain uses in wt_sent / wt_last_cmd */
export const WT_KEY_FIELD: Record<string, WtField> = {
  wt_target_temperature: 'target',
  wt_mode: 'mode',
  wt_temp_range_min: 'range',
  wt_temp_range_max: 'range',
  wt_child_lock: 'lock',
  wt_open_window_detection: 'window',
  wt_freeze_protection: 'freeze',
};

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));
const toBool = (v: any) => v === true || String(v) === 'true';

/** SHARED wt_* → the chain's wt_sent format; null when the field was never set */
export function desiredCode(f: WtField, s: Record<string, any>): string | null {
  const b = (v: any) => v == null ? null : (toBool(v) ? '1' : '0');
  switch (f) {
    case 'target': return s.wt_target_temperature != null ? String(Math.round(+s.wt_target_temperature)) : null;
    case 'mode': return s.wt_mode ?? null;
    case 'range': return s.wt_temp_range_min != null && s.wt_temp_range_max != null
      ? `${Math.round(+s.wt_temp_range_min)}-${Math.round(+s.wt_temp_range_max)}` : null;
    case 'lock': return b(s.wt_child_lock);
    case 'window': return b(s.wt_open_window_detection);
    case 'freeze': return b(s.wt_freeze_protection);
  }
}

/**
 * wt_sent as a map of field codes. ThingsBoard returns a JSON-typed attribute as an object and
 * a string attribute as text; values may arrive as strings, numbers or booleans.
 */
export function parseSent(raw: any): Record<string, string> {
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw || '{}');
    } catch {
      obj = {};
    }
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v == null) continue;
    out[k] = v === true || v === 'true' ? '1' : v === false || v === 'false' ? '0' : String(v);
  }
  return out;
}

function lastCmdFields(raw: any): string[] {
  const list = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  return list.map(s => String(s).trim()).filter(Boolean);
}

/** Field status per the chain contract; null when the field was never set (nothing to confirm) */
export function fieldSync(f: WtField, state: WtDeviceState): WtSync | null {
  const want = desiredCode(f, state.shared);
  if (want == null) return null;
  const sent = parseSent(state.server.wt_sent);
  const inLastCmd = lastCmdFields(state.server.wt_last_cmd).includes(f);
  const busy = state.server.wt_state === 'queued' || state.server.wt_state === 'sent';
  if (state.server.wt_state === 'failed' && inLastCmd) return 'failed';
  if (sent[f] !== want) return !busy && isStale(f, state) ? 'failed' : 'pending';
  if (busy && inLastCmd) return 'pending';
  return 'confirmed';
}

/** The chain is not working on it and the value was written long ago: it will not be confirmed by waiting */
function isStale(f: WtField, state: WtDeviceState): boolean {
  const ts = Object.keys(WT_KEY_FIELD)
    .filter(k => WT_KEY_FIELD[k] === f)
    .map(k => state.sharedTs?.[k] ?? 0);
  const writtenAt = Math.max(0, ...ts);
  return writtenAt > 0 && Date.now() - writtenAt > WT_STALE_MS;
}

/** Fields that are not confirmed yet, for the status tooltip */
export function unconfirmedFields(state: WtDeviceState): WtField[] {
  return WT_FIELDS.filter(f => {
    const s = fieldSync(f, state);
    return s === 'pending' || s === 'failed';
  });
}

/** failed > pending > confirmed; null when nothing was ever set */
export function worstSync(list: (WtSync | null)[]): WtSync | null {
  if (list.includes('failed')) return 'failed';
  if (list.includes('pending')) return 'pending';
  return list.includes('confirmed') ? 'confirmed' : null;
}

export function deviceSync(state: WtDeviceState): WtSync | null {
  return worstSync(WT_FIELDS.map(f => fieldSync(f, state)));
}

/**
 * Validate a change for one device before writing: the chain never sends an invalid value, so it
 * would stay pending forever. Range changes always carry both bounds, and a target that falls
 * outside a narrowed range is pulled to the nearest bound in the same write.
 */
export function completeChange(change: Record<string, any>, shared: Record<string, any>, deviceTarget: number | null): Record<string, any> | null {
  const out: Record<string, any> = {};
  if (change.wt_mode != null && WT_MODES.includes(change.wt_mode)) out.wt_mode = change.wt_mode;
  for (const k of WT_BOOL_KEYS) {
    if (k in change) out[k] = toBool(change[k]);
  }

  const rangeChanged = 'wt_temp_range_min' in change || 'wt_temp_range_max' in change;
  const min = clamp(Math.round(+(change.wt_temp_range_min ?? shared.wt_temp_range_min ?? WT_RANGE_MIN_LIMITS[0])), WT_RANGE_MIN_LIMITS);
  const max = clamp(Math.round(+(change.wt_temp_range_max ?? shared.wt_temp_range_max ?? WT_RANGE_MAX_LIMITS[1])), WT_RANGE_MAX_LIMITS);
  if (rangeChanged) {
    out.wt_temp_range_min = min;
    out.wt_temp_range_max = max;
  }

  const target = change.wt_target_temperature ?? (rangeChanged ? (shared.wt_target_temperature ?? deviceTarget) : null);
  if (target != null && !isNaN(+target)) {
    const t = clamp(clamp(Math.round(+target), WT_TARGET_LIMITS), [min, max]);
    if ('wt_target_temperature' in change || t !== Math.round(+target)) out.wt_target_temperature = t;
  }
  return Object.keys(out).length ? out : null;
}
