# Control Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status 2026-10-14:** Tasks 1-7 are implemented (no commits, per the repo rule). Deviations: sections have hand-built templates that follow the approved mockup (https://claude.ai/artifact/6Hut9MupwacnXqbroJXb1f) instead of one generic field loop; ThemeService.attach is not called because the overlay lives inside the widget root and inherits its tokens; the old `controlPanelConfig` loader and models were deleted together with `features/control-panel/`; the dashboard's own alert for pressure was dropped (no pressure limit in the contract). `node tools/check-control-settings.js` covers the pure core; the page itself was checked with a Chrome harness, not in a live ThingsBoard widget.

**Goal:** Replace the deleted Control Panel with a new "Control Settings" page that reads and writes the ThingsBoard attribute contract (Hotel default, Room override, device settings) and feeds the same effective limits into the room cards and room dialog.

**Architecture:** One schema file describes every setting (key, scope, type, unit, range, default). A pure-logic core (effective value, write payload, validation) is dependency-free and checked by a node script. A `ControlSettingsService` (provided per widget, like the old `ControlPanelService`) loads Hotel attributes once, room overrides on demand, and exposes `settings$` plus `effective(roomId?)` to `RoomDataService` and `RoomDetailPanelComponent`. The page is a schema-driven inline overlay (same pattern as `room-detail-overlay`), so adding a setting is a schema row plus two translation strings.

**Tech Stack:** Angular 20 NgModule components, RxJS BehaviorSubjects, `ctx.http` (ThingsBoard REST), existing `TranslationService` / `ThemeService`. No new dependencies.

**Spec:** https://claude.ai/artifact/7UyLoYku5V39aP3KWxTPr7 (source in the backend repo: `docs/ui-attributes.md`, last change 2026-10-12)

## Global Constraints

- Hotel asset = asset that `Contains` the room assets; `SERVER_SCOPE`. Room = asset `Guest Room`, `SERVER_SCOPE`. Device = `SHARED_SCOPE` (UI writes) / `SERVER_SCOPE`.
- Control Settings page writes to **Hotel only**. Never write the same limit to every room.
- Room override: key present and not empty wins; otherwise Hotel; otherwise the spec default; default "–" means that metric is not checked.
- "Back to hotel value" **deletes** the key from Room (`DELETE .../SERVER_SCOPE?keys=a,b`), never writes an empty value.
- Types: numbers as number, switches as boolean (`true`/`false`), time `"HH:MM"`, date `"MM-DD"`.
- Write: `POST /api/plugins/telemetry/ASSET/{id}/SERVER_SCOPE` body `{"co2Max": 1000}`; device: `POST /api/plugins/telemetry/DEVICE/{id}/SHARED_SCOPE`.
- Bulk thermostat button: one request with `heat_bulk_wt_mode` (`"auto"`|`"manual"`) and `heat_bulk_ts` (epoch ms, new on every press).
- Thermostat manual change: one request with `wt_mode: "manual"` and `wt_target_temperature` (already implemented, do not change).
- Never write or delete: `dev_eui`, `application_id`, `application_name`, `device_name`, `active`, `lastActivityTime`, `lastConnectTime`, `lastDisconnectTime`, `inactivityAlarmTime`, `inactivityTimeout`, `sustainedNotified`, `last_battery_tg_date`, `battery_tg_active`, `wt_attempts`, `wt_last_cmd`, `heat_manual_checkin`, any `heat_*` listed under spec section 7.
- Telegram bot token / chat id are not attributes; the page has no token field.
- Offline limit for VS370 / WS301 / WS303 must be >= 1500 minutes (they report once a day).
- Project rules: NgModule components only, declare in `hotel-dashboard.module.ts` and re-export from `public-api.ts`; colors only from ThemeService tokens; every new string in `TranslationSet` + `EN` + `RU`; no code comments unless non-obvious; no new dependencies; never commit unless asked.

## Review Focus

- TB returns attribute values as strings or JSON-encoded (`"true"`, `"1200"`); the page must coerce them, not show NaN or an always-off switch.
- Room key present but `""` / `null` must count as "not set" and fall back to Hotel.
- Hotel asset not resolved yet (`hotelAsset$` is `undefined` or `null`): page opens read-only with a message, Save disabled, no request sent.
- Partial failure: one key of a multi-key save rejected; the page must keep the draft, mark the failed field, and not claim "Saved".
- Day period crossing midnight (`22:00 -> 07:00`) and a non-default `heat_timezone`: day/night limit selection must use hotel time, not browser time.
- Bulk button pressed twice within the same millisecond or double-clicked: second press must still produce a larger `heat_bulk_ts` and must not fire while a request is in flight.
- A leftover `controlPanelConfig` JSON on the hotel asset from the old widget must be ignored, never merged.

## File Structure

| File | Responsibility |
|---|---|
| `core/settings/control-settings.schema.ts` (new) | `SETTINGS_SECTIONS`, `SettingField`, key lists. No Angular, no HTTP. |
| `core/settings/control-settings.core.ts` (new) | Pure functions: `coerce`, `effective`, `validate`, `buildSave`, `buildReset`, `buildBulk`, `dayNight`. |
| `core/settings/control-settings.service.ts` (new) | HTTP load/save, `settings$`, per-room override cache, `thresholds(roomId?)`. |
| `features/control-settings/control-settings.component.ts/.html/.scss` (new) | Page overlay, nav, schema-driven sections, save bar. |
| `features/control-settings/room-overrides.component.ts/.html/.scss` (new, phase 3) | "Hotel value / own value" block inside the room dialog. |
| `core/services/room-data.service.ts` (modify) | Inject `ControlSettingsService`, read thresholds from it. |
| `features/room-view/room-detail-panel.component.ts` (modify) | Alerts use effective thresholds; day/night noise. |
| `features/hotel-dashboard/revelton-hotel.component.*` (modify) | Header button, `<tb-control-settings>`, provide/set ctx. |
| `features/room-view/room-card.component.ts` (modify) | Provider swap. |
| `core/services/translation.service.ts` (modify) | New `cs*` keys, EN + RU; prune `cp*` keys at the end. |
| `features/control-panel/**` (delete in the last task) | Old service + models. |
| `tools/check-control-settings.js` (new) | Node check of the pure core (uses installed `typescript`, no new dependency). |

Phases (each one ships on its own): **P1** Tasks 1-3 (data layer, no UI change), **P2** Tasks 4-5 (page), **P3** Task 6 (room overrides), **P4** Task 7 (cleanup).

---

### Task 1: Schema and pure core

**Files:**
- Create: `src/hotel-dashboard/core/settings/control-settings.schema.ts`
- Create: `src/hotel-dashboard/core/settings/control-settings.core.ts`
- Create: `tools/check-control-settings.js`

**Interfaces:**
- Produces:
  - `type SettingScope = 'H' | 'HR' | 'R' | 'BRIDGE'`
  - `type SettingKind = 'number' | 'boolean' | 'enum' | 'time' | 'date' | 'text'`
  - `interface SettingField { key: string; scope: SettingScope; kind: SettingKind; labelKey: keyof TranslationSet; unit?: string; min?: number; max?: number; step?: number; options?: string[]; def: number | boolean | string | null; advanced?: boolean; dailySender?: boolean }`
  - `interface SettingSection { id: string; labelKey: keyof TranslationSet; icon: string; fields: SettingField[] }`
  - `const SETTINGS_SECTIONS: SettingSection[]`, `const ALL_FIELDS: SettingField[]`, `const FIELD_BY_KEY: Record<string, SettingField>`
  - `type Attrs = Record<string, unknown>`
  - `coerce(field, raw): number | boolean | string | null`
  - `effective(field, hotel: Attrs, room?: Attrs): { value; source: 'room' | 'hotel' | 'default' }`
  - `validate(field, value): string | null` (error code: `'range'`, `'type'`, `'daily'`, `'time'`)
  - `buildSave(changes: Record<string, unknown>): { set: Attrs; errors: Record<string, string> }`
  - `buildReset(keys: string[]): string[]`
  - `buildBulk(mode: 'auto' | 'manual', nowMs: number, lastTs: number): Attrs`
  - `dayNight(nowMs: number, tz: string, start: string, end: string): 'day' | 'night'`

- [ ] **Step 1: Write the schema**

```ts
import { TranslationSet } from '../services/translation.service';

export type SettingScope = 'H' | 'HR' | 'R' | 'BRIDGE';
export type SettingKind = 'number' | 'boolean' | 'enum' | 'time' | 'date' | 'text';

export interface SettingField {
  key: string;
  scope: SettingScope;
  kind: SettingKind;
  labelKey: keyof TranslationSet;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  def: number | boolean | string | null;
  advanced?: boolean;
  dailySender?: boolean;
}

export interface SettingSection {
  id: string;
  labelKey: keyof TranslationSet;
  icon: string;
  fields: SettingField[];
}

const n = (key: string, labelKey: keyof TranslationSet, scope: SettingScope, def: number | null,
  min: number, max: number, unit: string, extra: Partial<SettingField> = {}): SettingField =>
  ({ key, labelKey, scope, kind: 'number', def, min, max, unit, step: 1, ...extra });

const b = (key: string, labelKey: keyof TranslationSet, scope: SettingScope, def = true): SettingField =>
  ({ key, labelKey, scope, kind: 'boolean', def });

export const SETTINGS_SECTIONS: SettingSection[] = [
  { id: 'general', labelKey: 'csGeneral', icon: 'tune', fields: [
    { key: 'report_language', labelKey: 'csReportLanguage', scope: 'H', kind: 'enum', options: ['en', 'ru'], def: 'en' },
    { key: 'heat_timezone', labelKey: 'csTimezone', scope: 'H', kind: 'text', def: 'Europe/Prague' },
  ] },
  { id: 'heating', labelKey: 'csHeating', icon: 'thermostat', fields: [
    { key: 'heat_mode', labelKey: 'csHeatMode', scope: 'H', kind: 'enum', options: ['off', 'safe', 'live'], def: 'safe' },
    n('heat_comfort_temp', 'csComfortTemp', 'HR', 23, 5, 30, '°C'),
    n('heat_eco_temp', 'csEcoTemp', 'HR', 17, 5, 30, '°C'),
    n('heat_boost_temp', 'csBoostTemp', 'H', 28, 5, 30, '°C'),
    n('heat_boost_delta', 'csBoostDelta', 'H', 3, 1, 10, '°C', { advanced: true }),
    n('heat_boost_exit_margin', 'csBoostExit', 'H', 0.5, 0, 5, '°C', { advanced: true, step: 0.1 }),
    n('heat_boost_max_min', 'csBoostMax', 'H', 240, 10, 1440, 'min', { advanced: true }),
    n('heat_turnover_gap_min', 'csTurnoverGap', 'H', 360, 0, 2880, 'min', { advanced: true }),
    n('heat_preheat_rate_warm', 'csRateWarm', 'H', 2.0, 0.1, 6, '°C/h', { advanced: true, step: 0.1 }),
    n('heat_preheat_rate_mild', 'csRateMild', 'H', 1.5, 0.1, 6, '°C/h', { advanced: true, step: 0.1 }),
    n('heat_preheat_rate_cold', 'csRateCold', 'H', 1.0, 0.1, 6, '°C/h', { advanced: true, step: 0.1 }),
    n('heat_preheat_min', 'csPreheatMin', 'H', 60, 0, 1440, 'min', { advanced: true }),
    n('heat_preheat_max_min', 'csPreheatMax', 'H', 360, 0, 1440, 'min', { advanced: true }),
    n('heat_adjust_max', 'csAdjustMax', 'H', 2, 0, 5, '°C', { advanced: true }),
    n('heat_adjust_every_min', 'csAdjustEvery', 'H', 120, 10, 1440, 'min', { advanced: true }),
    n('heat_room_sensor_stale_min', 'csSensorStale', 'H', 20, 5, 240, 'min', { advanced: true }),
    n('heat_lookahead_min', 'csLookahead', 'H', 10, 0, 120, 'min', { advanced: true }),
    n('heat_latitude', 'csLatitude', 'H', null, -90, 90, '°', { advanced: true, step: 0.0001 }),
    n('heat_longitude', 'csLongitude', 'H', null, -180, 180, '°', { advanced: true, step: 0.0001 }),
    n('heat_season_outdoor_temp', 'csSeasonTemp', 'H', 13, -20, 30, '°C', { advanced: true }),
    { key: 'heat_season_start', labelKey: 'csSeasonStart', scope: 'H', kind: 'date', def: '10-15', advanced: true },
    { key: 'heat_season_end', labelKey: 'csSeasonEnd', scope: 'H', kind: 'date', def: '04-15', advanced: true },
  ] },
  { id: 'mews', labelKey: 'csMews', icon: 'sync', fields: [
    n('syncIntervalMinutes', 'csMewsInterval', 'BRIDGE', 10, 5, 60, 'min'),
  ] },
  { id: 'air', labelKey: 'csAir', icon: 'air', fields: [
    b('airQuality_enabled', 'csEnabled', 'HR'),
    n('tempMax', 'csTempMax', 'HR', null, 0, 50, '°C'), n('tempMin', 'csTempMin', 'HR', null, 0, 50, '°C'),
    n('humMax', 'csHumMax', 'HR', null, 0, 100, '%'), n('humMin', 'csHumMin', 'HR', null, 0, 100, '%'),
    n('co2Max', 'csCo2Max', 'HR', null, 400, 5000, 'ppm'),
    n('tvocMax', 'csTvocMax', 'HR', null, 1, 500, 'lvl'),
    n('pm25Max', 'csPm25Max', 'HR', null, 1, 500, 'µg/m³'), n('pm10Max', 'csPm10Max', 'HR', null, 1, 500, 'µg/m³'),
  ] },
  { id: 'noise', labelKey: 'csNoise', icon: 'volume_up', fields: [
    b('noise_enabled', 'csEnabled', 'HR'),
    { key: 'noise_dayPeriod_start', labelKey: 'csDayStart', scope: 'HR', kind: 'time', def: '07:00' },
    { key: 'noise_dayPeriod_end', labelKey: 'csDayEnd', scope: 'HR', kind: 'time', def: '22:00' },
    n('noise_day_laeq', 'csDayLaeq', 'HR', null, 30, 130, 'dB'),
    n('noise_day_lai', 'csDayLai', 'HR', null, 30, 130, 'dB'),
    n('noise_day_laimax', 'csDayLaimax', 'HR', null, 30, 130, 'dB'),
    n('noise_night_laeq', 'csNightLaeq', 'HR', null, 30, 130, 'dB'),
    n('noise_night_lai', 'csNightLai', 'HR', null, 30, 130, 'dB'),
    n('noise_night_laimax', 'csNightLaimax', 'HR', null, 30, 130, 'dB'),
  ] },
  { id: 'window', labelKey: 'csWindow', icon: 'sensor_window', fields: [
    b('window_enabled', 'csEnabled', 'HR'),
    n('window_open_max_min', 'csWindowMax', 'HR', null, 0, 1440, 'min'),
  ] },
  { id: 'socket', labelKey: 'csSocket', icon: 'power', fields: [
    b('socket_enabled', 'csEnabled', 'HR'),
    n('socket_powerMax', 'csPowerMax', 'HR', null, 10, 5000, 'W'),
  ] },
  { id: 'battery', labelKey: 'csBattery', icon: 'battery_alert', fields: [
    n('batteryMin', 'csBatteryMin', 'HR', 20, 1, 100, '%'),
  ] },
  { id: 'offline', labelKey: 'csOffline', icon: 'cloud_off', fields: [
    n('offline_am308_min', 'csOffAm308', 'H', 60, 5, 10080, 'min'),
    n('offline_ws302_min', 'csOffWs302', 'H', 60, 5, 10080, 'min'),
    n('offline_wt101_min', 'csOffWt101', 'H', 30, 5, 10080, 'min'),
    n('offline_ws523_min', 'csOffWs523', 'H', 120, 5, 10080, 'min'),
    n('offline_vs370_min', 'csOffVs370', 'H', 3000, 5, 10080, 'min', { dailySender: true }),
    n('offline_ws301_min', 'csOffWs301', 'H', 3000, 5, 10080, 'min', { dailySender: true }),
    n('offline_ws303_min', 'csOffWs303', 'H', 4800, 5, 10080, 'min', { dailySender: true }),
  ] },
  { id: 'telegram', labelKey: 'csTelegram', icon: 'send', fields: [
    b('telegram_alert_water', 'csTgWater', 'HR'), b('telegram_alert_noise', 'csTgNoise', 'HR'),
    b('telegram_alert_temp', 'csTgTemp', 'HR'), b('telegram_alert_humidity', 'csTgHumidity', 'HR'),
    b('telegram_alert_co2', 'csTgCo2', 'HR'), b('telegram_alert_battery', 'csTgBattery', 'HR'),
    b('telegram_alert_socket', 'csTgSocket', 'HR'), b('telegram_alert_window', 'csTgWindow', 'HR'),
    b('telegram_alert_offline', 'csTgOffline', 'H'),
    n('noise_alert_after_min', 'csNoiseAfter', 'HR', 60, 0, 1440, 'min'),
    n('air_alert_after_min', 'csAirAfter', 'HR', 60, 0, 1440, 'min'),
  ] },
];

export const ROOM_ONLY_FIELDS: SettingField[] = [
  { key: 'heat_enabled', labelKey: 'csRoomHeating', scope: 'R', kind: 'boolean', def: true },
];

export const ALL_FIELDS: SettingField[] = SETTINGS_SECTIONS.flatMap(s => s.fields).concat(ROOM_ONLY_FIELDS);
export const FIELD_BY_KEY: Record<string, SettingField> =
  Object.fromEntries(ALL_FIELDS.map(f => [f.key, f]));
export const HOTEL_KEYS: string[] = ALL_FIELDS.filter(f => f.scope !== 'BRIDGE' && f.scope !== 'R').map(f => f.key);
export const ROOM_KEYS: string[] = ALL_FIELDS.filter(f => f.scope === 'HR' || f.scope === 'R').map(f => f.key);
```

- [ ] **Step 2: Write the failing check script**

`tools/check-control-settings.js` transpiles the two TS files in memory with the installed `typescript` and runs assertions:

```js
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function load(file) {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/import \{ TranslationSet \}[^\n]*\n/, '')
    .replace(/from '\.\/control-settings\.schema'/, "from './schema'");
  return ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const Module = require('module');
const run = (code, deps) => { const m = { exports: {} }; new Function('require', 'module', 'exports', code)((p) => deps[p] || require(p), m, m.exports); return m.exports; };
const schema = run(load('src/hotel-dashboard/core/settings/control-settings.schema.ts'), {});
const core = run(load('src/hotel-dashboard/core/settings/control-settings.core.ts'), { './schema': schema });
const F = schema.FIELD_BY_KEY;

assert.strictEqual(core.coerce(F.co2Max, '1200'), 1200);
assert.strictEqual(core.coerce(F.airQuality_enabled, 'false'), false);
assert.strictEqual(core.coerce(F.airQuality_enabled, undefined), null);
assert.deepStrictEqual(core.effective(F.co2Max, { co2Max: 1200 }, { co2Max: 900 }), { value: 900, source: 'room' });
assert.deepStrictEqual(core.effective(F.co2Max, { co2Max: 1200 }, { co2Max: '' }), { value: 1200, source: 'hotel' });
assert.deepStrictEqual(core.effective(F.co2Max, {}, {}), { value: null, source: 'default' });
assert.strictEqual(core.validate(F.offline_ws301_min, 600), 'daily');
assert.strictEqual(core.validate(F.offline_ws301_min, 1500), null);
assert.strictEqual(core.validate(F.co2Max, 100), 'range');
assert.strictEqual(core.validate(F.noise_dayPeriod_start, '7:00'), 'time');
assert.strictEqual(core.validate(F.heat_season_start, '13-40'), 'time');
assert.deepStrictEqual(core.buildSave({ co2Max: 1100, airQuality_enabled: false }).set, { co2Max: 1100, airQuality_enabled: false });
assert.ok(core.buildSave({ co2Max: 100 }).errors.co2Max);
assert.deepStrictEqual(core.buildReset(['co2Max', 'nope']), ['co2Max']);
assert.strictEqual(core.buildBulk('auto', 1000, 1000).heat_bulk_ts, 1001);
assert.strictEqual(core.buildBulk('manual', 2000, 1000).heat_bulk_wt_mode, 'manual');
assert.strictEqual(core.dayNight(Date.UTC(2026, 9, 14, 21, 30), 'Europe/Prague', '07:00', '22:00'), 'night');
assert.strictEqual(core.dayNight(Date.UTC(2026, 9, 14, 12, 0), 'Europe/Prague', '07:00', '22:00'), 'day');
assert.strictEqual(core.dayNight(Date.UTC(2026, 9, 14, 2, 0), 'Europe/Prague', '22:00', '07:00'), 'night');
console.log('control-settings core: all checks passed');
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node tools/check-control-settings.js`
Expected: FAIL, `ENOENT ... control-settings.core.ts` (the core file does not exist yet).

- [ ] **Step 4: Write the core**

```ts
import { ALL_FIELDS, FIELD_BY_KEY, SettingField } from './control-settings.schema';

export type Attrs = Record<string, unknown>;
export type Value = number | boolean | string | null;
export type Source = 'room' | 'hotel' | 'default';

const isEmpty = (raw: unknown): boolean =>
  raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');

export function coerce(field: SettingField, raw: unknown): Value {
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

export function effective(field: SettingField, hotel: Attrs, room?: Attrs): { value: Value; source: Source } {
  const r = room ? coerce(field, room[field.key]) : null;
  if (r !== null && (field.scope === 'HR' || field.scope === 'R')) return { value: r, source: 'room' };
  const h = coerce(field, hotel[field.key]);
  if (h !== null) return { value: h, source: 'hotel' };
  return { value: field.def, source: 'default' };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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
  return typeof value === 'string' && value.trim() !== '' ? null : 'type';
}

export function buildSave(changes: Record<string, unknown>): { set: Attrs; errors: Record<string, string> } {
  const set: Attrs = {};
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(changes)) {
    const field = FIELD_BY_KEY[key];
    if (!field) { errors[key] = 'unknown'; continue; }
    const err = validate(field, value);
    if (err) errors[key] = err; else set[key] = value;
  }
  return { set, errors };
}

export function buildReset(keys: string[]): string[] {
  return keys.filter(k => FIELD_BY_KEY[k] && (FIELD_BY_KEY[k].scope === 'HR' || FIELD_BY_KEY[k].scope === 'R'));
}

export function buildBulk(mode: 'auto' | 'manual', nowMs: number, lastTs: number): Attrs {
  return { heat_bulk_wt_mode: mode, heat_bulk_ts: Math.max(nowMs, lastTs + 1) };
}

export function dayNight(nowMs: number, tz: string, start: string, end: string): 'day' | 'night' {
  let hhmm: string;
  try {
    hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(nowMs);
  } catch {
    hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(nowMs);
  }
  const inDay = start <= end ? hhmm >= start && hhmm < end : hhmm >= start || hhmm < end;
  return inDay ? 'day' : 'night';
}

export { ALL_FIELDS };
```

- [ ] **Step 5: Run the check and verify it passes**

Run: `node tools/check-control-settings.js`
Expected: `control-settings core: all checks passed`

- [ ] **Step 6: Build and lint**

Run: `yarn -s build:hotel:dev && yarn -s lint`
Expected: build `Built hotel-dashboard-widgets`, lint 0 errors. (The schema references `cs*` translation keys that do not exist yet; add them to `TranslationSet`, `EN` and `RU` in this task so the build passes. The key list is in Task 4, step 1; add only what the schema uses here: every `labelKey` above.)

- [ ] **Step 7: Commit (only when the user asks)**

```bash
git add src/hotel-dashboard/core/settings tools/check-control-settings.js src/hotel-dashboard/core/services/translation.service.ts
git commit -m "feat: control settings schema and pure core"
```

---

### Task 2: ControlSettingsService

**Files:**
- Create: `src/hotel-dashboard/core/settings/control-settings.service.ts`
- Modify: `src/hotel-dashboard/hotel-dashboard.module.ts`, `src/hotel-dashboard/public-api.ts` (export only; the service is `@Injectable()` and provided on the root components, like `ControlPanelService`)

**Interfaces:**
- Consumes: `core/settings/*` from Task 1, `datasourceScopeKey` not needed (no localStorage).
- Produces:
  - `class ControlSettingsService implements OnDestroy`
  - `readonly state$: Observable<{ status: 'idle' | 'loading' | 'ready' | 'error'; hotel: Attrs; saving: boolean; lastError: string | null }>`
  - `readonly hotel$: Observable<Attrs>` (alias of `state$.hotel`, emits after every load/save)
  - `get hotel(): Attrs`
  - `setCtx(ctx: WidgetContext): void`
  - `setHotelAssetId(id: string | null): void`
  - `setBridgeIdProvider(p: () => string | null): void`
  - `load(): Promise<void>`
  - `save(changes: Record<string, unknown>): Promise<{ ok: boolean; errors: Record<string, string> }>`
  - `loadRoom(roomAssetId: string): Promise<Attrs>`
  - `saveRoom(roomAssetId: string, changes: Record<string, unknown>): Promise<boolean>`
  - `resetRoom(roomAssetId: string, keys: string[]): Promise<boolean>`
  - `bulkThermostats(mode: 'auto' | 'manual'): Promise<boolean>`
  - `value(key: string, room?: Attrs): number | boolean | string | null` (effective value shortcut for consumers)
  - `noiseLimits(nowMs: number, room?: Attrs): { enabled: boolean; laeq: number | null; lai: number | null; laimax: number | null }`

- [ ] **Step 1: Write the service**

```ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { WidgetContext } from '@home/models/widget-component.models';
import { Attrs, Value, buildBulk, buildReset, buildSave, coerce, dayNight, effective } from './control-settings.core';
import { FIELD_BY_KEY, HOTEL_KEYS, ROOM_KEYS } from './control-settings.schema';

export interface ControlSettingsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  hotel: Attrs;
  saving: boolean;
  lastError: string | null;
}

const HTTP_OPTS = { ignoreErrors: true, ignoreLoading: true };

@Injectable()
export class ControlSettingsService implements OnDestroy {
  private ctx: WidgetContext | null = null;
  private hotelAssetId: string | null = null;
  private bridgeId: () => string | null = () => null;
  private lastBulkTs = 0;
  private bulkBusy = false;
  private epoch = 0;

  private readonly _state$ = new BehaviorSubject<ControlSettingsState>({ status: 'idle', hotel: {}, saving: false, lastError: null });
  readonly state$ = this._state$.asObservable();
  readonly hotel$ = this._state$.pipe(map(s => s.hotel));
  get hotel(): Attrs { return this._state$.value.hotel; }

  setCtx(ctx: WidgetContext): void { this.ctx = ctx; }
  setBridgeIdProvider(p: () => string | null): void { this.bridgeId = p; }

  setHotelAssetId(id: string | null): void {
    if (id === this.hotelAssetId) return;
    this.hotelAssetId = id;
    this.epoch++;
    this._state$.next({ status: 'idle', hotel: {}, saving: false, lastError: null });
    if (id) void this.load();
  }

  async load(): Promise<void> {
    const http = this.ctx?.http;
    if (!http || !this.hotelAssetId) return;
    const epoch = this.epoch;
    this.patch({ status: 'loading' });
    try {
      const rows: { key: string; value: unknown }[] = await firstValueFrom(
        http.get(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/values/attributes/SERVER_SCOPE?keys=${HOTEL_KEYS.join(',')}`, HTTP_OPTS));
      if (epoch !== this.epoch) return;
      const hotel: Attrs = {};
      for (const r of rows || []) hotel[r.key] = r.value;
      this._state$.next({ status: 'ready', hotel, saving: false, lastError: null });
    } catch (e) {
      if (epoch === this.epoch) this.patch({ status: 'error', lastError: 'load' });
    }
  }

  async save(changes: Record<string, unknown>): Promise<{ ok: boolean; errors: Record<string, string> }> {
    const http = this.ctx?.http;
    if (!http || !this.hotelAssetId) return { ok: false, errors: { _: 'not-ready' } };
    const { set, errors } = buildSave(changes);
    if (Object.keys(errors).length) return { ok: false, errors };
    const hotelSet: Attrs = {};
    const bridgeSet: Attrs = {};
    for (const [k, v] of Object.entries(set)) (FIELD_BY_KEY[k].scope === 'BRIDGE' ? bridgeSet : hotelSet)[k] = v;
    this.patch({ saving: true, lastError: null });
    try {
      if (Object.keys(hotelSet).length) {
        await firstValueFrom(http.post(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/SERVER_SCOPE`, hotelSet, HTTP_OPTS));
      }
      if (Object.keys(bridgeSet).length) {
        const id = this.bridgeId();
        if (!id) throw new Error('no-bridge');
        await firstValueFrom(http.post(`/api/plugins/telemetry/DEVICE/${id}/SHARED_SCOPE`, bridgeSet, HTTP_OPTS));
      }
      this._state$.next({ ...this._state$.value, hotel: { ...this.hotel, ...hotelSet }, saving: false });
      return { ok: true, errors: {} };
    } catch (e) {
      this.patch({ saving: false, lastError: 'save' });
      return { ok: false, errors: { _: 'save' } };
    }
  }

  async loadRoom(roomAssetId: string): Promise<Attrs> {
    const http = this.ctx?.http;
    if (!http) return {};
    const rows: { key: string; value: unknown }[] = await firstValueFrom(
      http.get(`/api/plugins/telemetry/ASSET/${roomAssetId}/values/attributes/SERVER_SCOPE?keys=${ROOM_KEYS.join(',')}`, HTTP_OPTS));
    const out: Attrs = {};
    for (const r of rows || []) out[r.key] = r.value;
    return out;
  }

  async saveRoom(roomAssetId: string, changes: Record<string, unknown>): Promise<boolean> {
    const http = this.ctx?.http;
    const { set, errors } = buildSave(changes);
    if (!http || Object.keys(errors).length || !Object.keys(set).length) return false;
    try {
      await firstValueFrom(http.post(`/api/plugins/telemetry/ASSET/${roomAssetId}/SERVER_SCOPE`, set, HTTP_OPTS));
      return true;
    } catch { return false; }
  }

  async resetRoom(roomAssetId: string, keys: string[]): Promise<boolean> {
    const http = this.ctx?.http;
    const list = buildReset(keys);
    if (!http || !list.length) return false;
    try {
      await firstValueFrom(http.delete(`/api/plugins/telemetry/ASSET/${roomAssetId}/SERVER_SCOPE?keys=${list.join(',')}`, HTTP_OPTS));
      return true;
    } catch { return false; }
  }

  async bulkThermostats(mode: 'auto' | 'manual'): Promise<boolean> {
    const http = this.ctx?.http;
    if (!http || !this.hotelAssetId || this.bulkBusy) return false;
    this.bulkBusy = true;
    const body = buildBulk(mode, Date.now(), this.lastBulkTs);
    try {
      await firstValueFrom(http.post(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/SERVER_SCOPE`, body, HTTP_OPTS));
      this.lastBulkTs = body.heat_bulk_ts as number;
      return true;
    } catch { return false; }
    finally { this.bulkBusy = false; }
  }

  value(key: string, room?: Attrs): Value {
    const f = FIELD_BY_KEY[key];
    return f ? effective(f, this.hotel, room).value : null;
  }

  noiseLimits(nowMs: number, room?: Attrs): { enabled: boolean; laeq: number | null; lai: number | null; laimax: number | null } {
    const tz = String(this.value('heat_timezone') ?? 'Europe/Prague');
    const start = String(this.value('noise_dayPeriod_start', room) ?? '07:00');
    const end = String(this.value('noise_dayPeriod_end', room) ?? '22:00');
    const p = dayNight(nowMs, tz, start, end);
    const num = (k: string) => { const v = this.value(k, room); return typeof v === 'number' ? v : null; };
    return {
      enabled: this.value('noise_enabled', room) !== false,
      laeq: num(`noise_${p}_laeq`), lai: num(`noise_${p}_lai`), laimax: num(`noise_${p}_laimax`),
    };
  }

  ngOnDestroy(): void { this.ctx = null; this.bridgeId = () => null; this.epoch++; }

  private patch(p: Partial<ControlSettingsState>): void { this._state$.next({ ...this._state$.value, ...p }); }
}
```

`coerce` is imported for future use by consumers; drop the import if lint reports it unused.

- [ ] **Step 2: Wire it into the roots (no behavior change yet)**

In `revelton-hotel.component.ts` add `ControlSettingsService` to `providers` and to the constructor; in the subscription that already calls `controlPanelService.setHotelAssetId(...)` (line ~338) also call `this.controlSettings.setHotelAssetId(this.hotelAsset?.id ?? null)`, and next to `setCtx` / `setMewsBridgeIdProvider` call `this.controlSettings.setCtx(this.ctx)` and `this.controlSettings.setBridgeIdProvider(() => this.hotelState.mewsBridgeId)`. In `room-card.component.ts` provide it and call `setCtx`. Export it in `public-api.ts`.

- [ ] **Step 3: Build, lint, run the check script**

Run: `yarn -s build:hotel:dev && yarn -s lint && node tools/check-control-settings.js`
Expected: build OK, 0 lint errors, checks pass.

- [ ] **Step 4: Verify live on the dev widget**

With `yarn serve` running and the `dev` widget open on a hotel dashboard, in the browser console of the widget page: no new errors; Network tab shows one `GET .../ASSET/<hotel id>/values/attributes/SERVER_SCOPE?keys=report_language,heat_timezone,...` per load, and none from room cards.

---

### Task 3: Move RoomDataService and RoomDetailPanel to effective settings

**Files:**
- Modify: `src/hotel-dashboard/core/services/room-data.service.ts` (constructor at line ~118, AQI custom breakpoints at ~1091-1118)
- Modify: `src/hotel-dashboard/features/room-view/room-detail-panel.component.ts` (config reads at ~611-617, ~835-1017)
- Modify: `src/hotel-dashboard/features/hotel-dashboard/revelton-hotel.component.ts`, `src/hotel-dashboard/features/room-view/room-card.component.ts` (the old service stays provided until Task 7 only if something still injects it; remove the injection here)

**Interfaces:**
- Consumes: `ControlSettingsService.value`, `.noiseLimits`, `.hotel$`.
- Produces: no new public API; `RoomDataService.THRESHOLDS` and detail-panel alerts keep their shapes.

Mapping (old field → new key; `room` = the room's override attrs when available, otherwise Hotel only):

| Old read | New |
|---|---|
| `config.airQuality.enabled` | `airQuality_enabled !== false` |
| `tempMax/tempMin/humMax/humMin/co2Max/pm25Max/pm10Max/tvocMax` | same key names |
| `pressMax/pressMin` | removed (spec: no pressure limit); the pressure alert is dropped |
| `*WarnGap` | no setting; use the existing built-in gaps (`co2: 200`, `pm25: 10`, `pm10: 40`, `tvoc: 1`, `temp: 3`, `hum: 10`) as constants in `RoomDataService` |
| `config.noise.laeqMax/laiMax/laimaxMax` | `noiseLimits(now).laeq / .lai / .laimax` (day/night by hotel timezone) |
| `config.window.enabled/thresholdMinutes` | `window_enabled !== false`, `window_open_max_min` (null = not checked) |
| `config.socket.enabled/powerMax` | `socket_enabled !== false`, `socket_powerMax` (null = not checked) |
| `config.roomScope*`, `config.thermostat.*`, `config.telegram.*`, `config.mews.*` | no consumer in the dashboard; nothing to migrate |

- [ ] **Step 1: Replace the subscription in `RoomDataService`**

Constructor injects `ControlSettingsService` instead of `ControlPanelService`. The `config$` subscription becomes:

```ts
this.settings.hotel$.subscribe(() => {
  const s = this.settings;
  const tMax = s.value('tempMax'), tMin = s.value('tempMin');
  this.THRESHOLDS.temperature = typeof tMax === 'number' && typeof tMin === 'number' && s.value('airQuality_enabled') !== false
    ? { warning: { min: tMin + 3, max: tMax - 3 }, danger: { min: tMin, max: tMax } }
    : this.THRESHOLDS.temperature;
  const hMax = s.value('humMax'), hMin = s.value('humMin');
  this.THRESHOLDS.humidity = typeof hMax === 'number' && typeof hMin === 'number' && s.value('airQuality_enabled') !== false
    ? { warning: { min: hMin + 10, max: hMax - 10 }, danger: { min: hMin, max: hMax } }
    : this.THRESHOLDS.humidity;
  const n = s.noiseLimits(Date.now());
  this.THRESHOLDS.noise = n.enabled && n.laeq !== null
    ? { warning: Math.max(40, n.laeq - 10), danger: n.laeq }
    : this.THRESHOLDS.noise;
});
```

Keep the exact warning offsets that the old subscription used (read lines 128-175 first and preserve its arithmetic; the block above is the shape, not new behavior).

- [ ] **Step 2: Replace the AQI custom-breakpoint block (~1091-1118)**

`getBp(max, gap)` stays. Source the maxima from `this.settings.value('co2Max')` etc.; when a value is `null` skip that custom breakpoint so the existing default curve applies (spec: default "–" means not checked). Warn gaps become module constants.

- [ ] **Step 3: Replace the alert generation in `room-detail-panel.component.ts`**

Replace each `config.<group>.<field>` read at ~611-1017 with `this.settings.value('<key>', this.roomOverrides)` and `this.settings.noiseLimits(Date.now(), this.roomOverrides)`. Add a `private roomOverrides: Attrs = {}` filled once when the dialog opens by `await this.settings.loadRoom(this.roomAssetId)` (the panel already resolves `roomAssetId` in `resolveRoomAsset`, line ~330). Skip a check when the limit is `null`.

- [ ] **Step 4: Build, lint, verify**

Run: `yarn -s build:hotel:dev && yarn -s lint`
Expected: 0 errors. Then on the `dev` widget: a room above `co2Max` shows the CO2 alert with the Hotel limit; changing `co2Max` in TB (hotel asset attributes) and pressing refresh changes the limit shown; a room with its own `co2Max` override shows the room limit.

---

### Task 4: Settings page shell and generic sections

**Files:**
- Create: `src/hotel-dashboard/features/control-settings/control-settings.component.ts`, `.html`, `.scss`
- Modify: `hotel-dashboard.module.ts` (declare + export), `public-api.ts`, `revelton-hotel.component.html` (header button + `<tb-control-settings>`), `revelton-hotel.component.ts` (`settingsOpen`, `openSettings()`, `closeSettings()`), `revelton-hotel.component.scss` (button style next to the theme selector), `translation.service.ts`

**Interfaces:**
- Consumes: `SETTINGS_SECTIONS`, `ControlSettingsService`, `TranslationService`, `ThemeService.attach`.
- Produces: `<tb-control-settings [open]="settingsOpen" (closed)="closeSettings()">`.

Page behaviour (this is the design contract the mockup must match):
- Inline overlay filling the widget (`position:absolute; inset:0; z-index: 9500`), header: title, "Hotel: <name>", close. Body: left nav (sections) + content; below 720px container width the nav becomes a horizontal scroll strip (container query on the overlay, name `cs`).
- Each section renders its fields from the schema: number input with unit suffix, switch, select, time/date input. Fields with `advanced: true` are inside a collapsed "Advanced" group.
- A draft object holds only changed keys. A sticky bottom bar shows "N changes", Cancel and Save. Save calls `service.save(draft)`; errors are shown on the field (`csErr_range`, `csErr_daily`, `csErr_time`, `csErr_type`).
- A switch that is off dims the other fields of its section.
- Not ready (`status !== 'ready'`): fields disabled, message `csNotReady`.

- [ ] **Step 1: Add the translation keys**

Add to `TranslationSet`, `EN`, `RU` (Task 1 added the field `labelKey`s): `csTitle`, `csHotel`, `csAdvanced`, `csChanges`, `csSave`, `csCancel`, `csSaved`, `csNotReady`, `csErr_range`, `csErr_daily`, `csErr_time`, `csErr_type`, `csErr_save`, `csNotSet`, `csBulkAuto`, `csBulkManual`, `csBulkSent`. Run the existing translation check from the scratchpad `i18n/` scripts (EN and RU key sets must stay equal).

- [ ] **Step 2: Write the component class**

```ts
@Component({
  selector: 'tb-control-settings',
  templateUrl: './control-settings.component.html',
  styleUrls: ['./control-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlSettingsComponent implements OnInit, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly sections = SETTINGS_SECTIONS;
  activeId = 'general';
  draft: Record<string, unknown> = {};
  errors: Record<string, string> = {};
  showAdvanced = false;
  state: ControlSettingsState = { status: 'idle', hotel: {}, saving: false, lastError: null };
  private sub = new Subscription();
  private detachTheme: (() => void) | null = null;

  constructor(
    private settings: ControlSettingsService,
    private translation: TranslationService,
    private theme: ThemeService,
    private host: ElementRef<HTMLElement>,
    private cd: ChangeDetectorRef,
  ) {}

  get t() { return this.translation.t; }
  get section(): SettingSection { return this.sections.find(s => s.id === this.activeId)!; }
  get changeCount(): number { return Object.keys(this.draft).length; }
  get editable(): boolean { return this.state.status === 'ready'; }

  ngOnInit(): void {
    this.detachTheme = this.theme.attach(this.host.nativeElement);
    this.sub.add(this.settings.state$.subscribe(s => { this.state = s; this.cd.markForCheck(); }));
    this.sub.add(this.translation.activeLangCode$.subscribe(() => this.cd.markForCheck()));
  }

  label(f: SettingField): string { return (this.t[f.labelKey] as string) || f.key; }

  current(f: SettingField): Value {
    if (f.key in this.draft) return this.draft[f.key] as Value;
    return effective(f, this.state.hotel).value;
  }

  setValue(f: SettingField, raw: unknown): void {
    const v = f.kind === 'number' ? (raw === '' || raw === null ? null : Number(raw)) : raw;
    const base = effective(f, this.state.hotel).value;
    if (v === base || (v === null && base === null)) delete this.draft[f.key]; else this.draft[f.key] = v;
    delete this.errors[f.key];
    this.cd.markForCheck();
  }

  isSet(f: SettingField): boolean { return coerce(f, this.state.hotel[f.key]) !== null; }

  async save(): Promise<void> {
    const res = await this.settings.save(this.draft);
    if (res.ok) { this.draft = {}; this.errors = {}; }
    else this.errors = res.errors;
    this.cd.markForCheck();
  }

  cancel(): void { this.draft = {}; this.errors = {}; this.cd.markForCheck(); }
  close(): void { this.closed.emit(); }

  async bulk(mode: 'auto' | 'manual'): Promise<void> { await this.settings.bulkThermostats(mode); this.cd.markForCheck(); }

  ngOnDestroy(): void { this.sub.unsubscribe(); this.detachTheme?.(); }
}
```

A `null` draft value for a number field means "clear the limit": `save` must send a delete for it, so in `save()` split the draft: `null` values go to a new `service.clearHotel(keys)` (DELETE on the hotel asset) and the rest to `service.save`. Add `clearHotel(keys: string[]): Promise<boolean>` to the service in this step and extend the check script with one case for the key filter.

- [ ] **Step 3: Write the template**

Field loop (one `ng-template` renders every kind; nothing is repeated per section):

```html
<div class="cs-overlay" *ngIf="open" role="dialog" aria-modal="true" [attr.aria-label]="t.csTitle">
  <header class="cs-head">
    <h2>{{ t.csTitle }}</h2>
    <button class="cs-close" (click)="close()" [attr.aria-label]="t.close"><i class="material-icons">close</i></button>
  </header>

  <div class="cs-body">
    <nav class="cs-nav">
      <button *ngFor="let s of sections" [class.active]="s.id === activeId" (click)="activeId = s.id">
        <i class="material-icons">{{ s.icon }}</i><span>{{ t[s.labelKey] }}</span>
      </button>
    </nav>

    <section class="cs-content">
      <p class="cs-note" *ngIf="!editable">{{ t.csNotReady }}</p>

      <div class="cs-grid">
        <ng-container *ngFor="let f of section.fields">
          <div class="cs-field" *ngIf="!f.advanced || showAdvanced" [class.has-error]="errors[f.key]">
            <label [attr.for]="'cs-' + f.key">{{ label(f) }}</label>

            <ng-container [ngSwitch]="f.kind">
              <label *ngSwitchCase="'boolean'" class="cs-switch">
                <input type="checkbox" [id]="'cs-' + f.key" [checked]="current(f) !== false"
                       [disabled]="!editable" (change)="setValue(f, $any($event.target).checked)">
                <span></span>
              </label>
              <select *ngSwitchCase="'enum'" [id]="'cs-' + f.key" [disabled]="!editable"
                      (change)="setValue(f, $any($event.target).value)">
                <option *ngFor="let o of f.options" [value]="o" [selected]="current(f) === o">{{ o }}</option>
              </select>
              <input *ngSwitchCase="'time'" type="time" [id]="'cs-' + f.key" [value]="current(f)"
                     [disabled]="!editable" (change)="setValue(f, $any($event.target).value)">
              <input *ngSwitchCase="'date'" type="text" inputmode="numeric" placeholder="MM-DD" [id]="'cs-' + f.key"
                     [value]="current(f)" [disabled]="!editable" (change)="setValue(f, $any($event.target).value)">
              <input *ngSwitchCase="'text'" type="text" [id]="'cs-' + f.key" [value]="current(f)"
                     [disabled]="!editable" (change)="setValue(f, $any($event.target).value)">
              <span *ngSwitchDefault class="cs-num">
                <input type="number" [id]="'cs-' + f.key" [attr.min]="f.min" [attr.max]="f.max" [attr.step]="f.step"
                       [value]="current(f)" [placeholder]="t.csNotSet" [disabled]="!editable"
                       (change)="setValue(f, $any($event.target).value)">
                <small>{{ f.unit }}</small>
              </span>
            </ng-container>

            <small class="cs-err" *ngIf="errors[f.key]">{{ t['csErr_' + errors[f.key]] }}</small>
          </div>
        </ng-container>
      </div>

      <button class="cs-link" *ngIf="hasAdvanced(section)" (click)="showAdvanced = !showAdvanced">{{ t.csAdvanced }}</button>
    </section>
  </div>

  <footer class="cs-bar" *ngIf="changeCount">
    <span>{{ changeCount }} {{ t.csChanges }}</span>
    <button class="cs-secondary" (click)="cancel()">{{ t.csCancel }}</button>
    <button class="cs-primary" (click)="save()" [disabled]="state.saving || !editable">{{ t.csSave }}</button>
  </footer>
</div>
```

Add `hasAdvanced(s)` (`s.fields.some(f => f.advanced)`) to the class. `t['csErr_' + ...]` needs `(t as Record<string, string>)[...]`; use a small `err(key)` method instead.

- [ ] **Step 4: Write the SCSS**

Use only ThemeService tokens (`--bg`, `--panel`, `--panel2`, `--inner`, `--border`, `--accent`, `--accent-soft`, `--tx`, `--t2`, `--t3`, `--ok`, `--warn`, `--alert`). Structure: `.cs-overlay { position:absolute; inset:0; z-index:9500; display:flex; flex-direction:column; background:var(--bg); container-type:inline-size; container-name:cs; }`, `.cs-body { flex:1; display:grid; grid-template-columns:200px minmax(0,1fr); min-height:0; }`, `.cs-content { overflow:auto; padding:16px; }`, `.cs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }`, `.cs-bar { position:sticky; bottom:0; }`. `@container cs (max-width: 720px) { .cs-body { grid-template-columns:minmax(0,1fr); } .cs-nav { flex-direction:row; overflow-x:auto; } }`.

- [ ] **Step 5: Register and open it**

In `hotel-dashboard.module.ts` add `ControlSettingsComponent` to `HOTEL_COMPONENTS` (declared and exported, per the file's existing array), re-export from `public-api.ts`. In `revelton-hotel.component.html` put a button before the theme selector (class `revelton-settings-btn`, icon `settings`, title `t.csTitle`) calling `openSettings()`, and `<tb-control-settings [open]="settingsOpen" (closed)="closeSettings()"></tb-control-settings>` at the end of the container. The room dialog must stay above the overlay only when open on top of it, so give the overlay a lower z-index (9500) than `.room-detail-overlay` (9000 is lower; set the settings overlay to 8900 instead and verify they never need to coexist).

- [ ] **Step 6: Build, lint**

Run: `yarn -s build:hotel:dev && yarn -s lint && node tools/check-control-settings.js`
Expected: OK, 0 errors.

- [ ] **Step 7: Verify in a browser**

Headless Chrome harness (same method used for the header work): compile the component SCSS with `node_modules/.bin/sass`, render a static copy of the template at 360, 600 and 1100 px container widths, check nav layout, no horizontal overflow, save bar visible. Then on the `dev` widget (needs the user's `yarn serve`): change `co2Max`, Save, confirm the attribute in TB and that the room dialog alert limit follows.

---

### Task 5: Heating, offline, Telegram and Mews specifics

**Files:**
- Modify: `control-settings.component.ts/.html/.scss`, `control-settings.service.ts`, `translation.service.ts`

**Interfaces:**
- Consumes: `ControlSettingsService.bulkThermostats`, `value`, `state$`.

- [ ] **Step 1: Heating section header with the mode explanation and the bulk buttons**

Above the generic fields of `heating`, render the three `heat_mode` states as a segmented control with one-line help (`off`: automation stopped, `safe`: decides and writes to the room only, `live`: fully active), and two buttons: "All thermostats: Auto" and "All thermostats: Manual" calling `bulk('auto' | 'manual')`. Disable both while a request is in flight and show `csBulkSent` for 3 seconds after success. Keys: `csHeatModeOff`, `csHeatModeSafe`, `csHeatModeLive`, `csHeatModeHelpOff|Safe|Live`.

- [ ] **Step 2: Offline section guard**

Number inputs of `dailySender` fields show the hint "must be at least 1500 min (reports once a day)"; the generic `validate` already returns `'daily'`. Add the `csErr_daily` strings.

- [ ] **Step 3: Telegram section grouping and Mews**

Telegram: two groups, "Alert types" (the nine switches) and "Timing" (`noise_alert_after_min`, `air_alert_after_min`), plus a static note that bot token and group are configured on the server. Mews: the interval field is `BRIDGE`; if `bridgeId()` is null, disable it with the message `csNoBridge`.

- [ ] **Step 4: Build, lint, harness check, live check of one bulk press**

Run: `yarn -s build:hotel:dev && yarn -s lint`. Live check only with the user's approval (a bulk press changes every thermostat): confirm one request with `heat_bulk_wt_mode` + `heat_bulk_ts`, and a second press produces a larger timestamp.

---

### Task 6: Room overrides in the room dialog (phase 3)

**Files:**
- Create: `features/control-settings/room-overrides.component.ts/.html/.scss`
- Modify: `room-detail-panel.component.html/.ts`, `hotel-dashboard.module.ts`, `public-api.ts`, `translation.service.ts`

**Interfaces:**
- Consumes: `ControlSettingsService.loadRoom`, `saveRoom`, `resetRoom`, `effective`.
- Produces: `<tb-room-overrides [roomAssetId]="roomAssetId">` showing, per `HR` field of the air / noise / window / socket / battery / telegram sections, "Hotel: X / This room: Y" with an edit field and "Back to hotel value".

- [ ] **Step 1:** Component loads `loadRoom(roomAssetId)` on init, computes `effective(f, hotel, room)` per field, and marks the source (`room` shown with an accent chip).
- [ ] **Step 2:** Editing a field calls `saveRoom(id, {[key]: value})`; "Back to hotel value" calls `resetRoom(id, [key])` and reloads. `heat_enabled` is a switch at the top ("Heating automation in this room").
- [ ] **Step 3:** Place it in the room dialog as a collapsed "Room settings" section after the devices layout so the first screen stays unchanged (project rule: the dialog's first view must fit without scrolling).
- [ ] **Step 4:** Build, lint, harness check at 360/760/1200 px; live check on one test room with the user's approval (writes a Room attribute, then resets it, leaving the room as it was).

---

### Task 7: Remove the old control panel code and update docs

**Files:**
- Delete: `src/hotel-dashboard/features/control-panel/services/control-panel.service.ts`, `src/hotel-dashboard/features/control-panel/models/control-panel.models.ts`
- Modify: `revelton-hotel.component.ts`, `room-card.component.ts`, `room-detail-panel.component.ts`, `room-data.service.ts` (remove the last `ControlPanelService` references), `public-api.ts`, `translation.service.ts` (prune `cp*` and `controlConfig` keys that nothing uses), `core/utils/scope-key.ts` comment, `CLAUDE.md`

- [ ] **Step 1:** `grep -rn "ControlPanel\|control-panel" src` must return nothing except the deleted paths in git; remove each hit.
- [ ] **Step 2:** Update `CLAUDE.md`: replace the Control Panel row and the "Threshold system" / "Hotel identity" bullets with the Control Settings model (Hotel default, Room override, schema file, key contract link); remove the `controlPanelConfig` and flat `co2Max` room-write sentences.
- [ ] **Step 3:** Run `yarn -s build:hotel:dev && yarn -s lint && node tools/check-control-settings.js`; expect 0 lint errors and a successful build.
- [ ] **Step 4:** Bundle size check: `ls -l dist/hotel-dashboard-dev/system/*.js`; the release bundle must not grow by more than ~40 KB over 1.2.6 (1,437,230 B).
- [ ] **Step 5:** Release only on the user's explicit request (version bump, `yarn build:hotel`, upload the TB resource, switch the widget type; these need the user's manual permission mode as before).

---

## Open decisions for you

1. **Page placement.** Plan assumes an inline full-widget overlay with a left nav (same pattern as the room dialog). Alternative: a separate ThingsBoard dashboard state/page. Overlay is simpler and keeps theme/i18n.
2. **TVOC.** The spec says AM308 sends a level (1-5+, `tvocMax` default 5), while the dashboard currently shows TVOC in ppb. Confirm on a live device (`data_tvoc` values) before the page labels it; the schema above uses "lvl".
3. **Window and offline alerts.** The backend now raises real TB alarms (`Window Open Alarm`, `Low Battery Alarm`...). This plan keeps the dashboard's own client-side alerts and only feeds them the new limits. Reading TB alarms instead is a separate, larger change.
4. **Who may edit.** Any dashboard user whose TB role can write the hotel asset. If only managers should see the page, say so and the header button will be hidden by a widget setting.
5. **Verification tooling.** The project has no test runner; Task 1 uses a plain node script (no new dependency). If you prefer to add a real test runner, that is a separate approved change.
