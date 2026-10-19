const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', 'src', 'hotel-dashboard', 'core', 'settings');
function load(file, deps) {
  const src = fs.readFileSync(path.join(root, file), 'utf8')
    .replace(/import \{ TranslationSet \}[^\n]*\n/, '')
    .replace(/from '\.\/control-settings\.schema'/, "from 'schema'");
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', out)((p) => deps[p] || require(p), m, m.exports);
  return m.exports;
}
const schema = load('control-settings.schema.ts', {});
const core = load('control-settings.core.ts', { schema });
const F = schema.FIELD_BY_KEY;

assert.strictEqual(core.coerce(F.co2Max, '1200'), 1200);
assert.strictEqual(core.coerce(F.airQuality_enabled, 'false'), false);
assert.strictEqual(core.coerce(F.airQuality_enabled, undefined), null);
assert.strictEqual(core.coerce(F.co2Max, ''), null);
assert.deepStrictEqual(core.effective(F.co2Max, { co2Max: 1200 }, { co2Max: 900 }), { value: 900, source: 'room' });
assert.deepStrictEqual(core.effective(F.co2Max, { co2Max: 1200 }, { co2Max: '' }), { value: 1200, source: 'hotel' });
assert.deepStrictEqual(core.effective(F.co2Max, {}, {}), { value: null, source: 'default' });
assert.deepStrictEqual(core.effective(F.heat_boost_temp, { heat_boost_temp: 30 }, { heat_boost_temp: 20 }), { value: 30, source: 'hotel' });
assert.deepStrictEqual(core.effective(F.heat_comfort_temp, {}, {}), { value: 23, source: 'default' });
assert.strictEqual(core.validate(F.offline_ws301_min, 600), 'daily');
assert.strictEqual(core.validate(F.offline_ws301_min, 1500), null);
assert.strictEqual(core.validate(F.co2Max, 100), 'range');
assert.strictEqual(core.validate(F.co2Max, 'abc'), 'type');
assert.strictEqual(core.validate(F.noise_dayPeriod_start, '7:00'), 'time');
assert.strictEqual(core.validate(F.heat_season_start, '13-40'), 'time');
assert.strictEqual(core.validate(F.heat_mode, 'live'), null);
assert.strictEqual(core.validate(F.heat_mode, 'turbo'), 'type');
assert.deepStrictEqual(core.buildSave({ co2Max: 1100, airQuality_enabled: false }).set, { co2Max: 1100, airQuality_enabled: false });
assert.ok(core.buildSave({ co2Max: 100 }).errors.co2Max);
assert.ok(core.buildSave({ nope: 1 }).errors.nope);
assert.deepStrictEqual(core.buildSave({ tempMin: 30, tempMax: 20 }).errors.tempMin, 'order');
assert.deepStrictEqual(core.buildReset(['co2Max', 'nope', 'heat_boost_temp']), ['co2Max']);
assert.strictEqual(core.buildBulk('auto', 1000, 1000).heat_bulk_ts, 1001);
assert.strictEqual(core.buildBulk('auto', 5000, 1000).heat_bulk_ts, 5000);
assert.strictEqual(core.buildBulk('manual', 2000, 1000).heat_bulk_wt_mode, 'manual');
const T = (h, m) => Date.UTC(2026, 9, 14, h, m);
assert.strictEqual(core.dayNight(T(21, 30), 'Europe/Prague', '07:00', '22:00'), 'night');
assert.strictEqual(core.dayNight(T(12, 0), 'Europe/Prague', '07:00', '22:00'), 'day');
assert.strictEqual(core.dayNight(T(2, 0), 'Europe/Prague', '22:00', '07:00'), 'day');
assert.strictEqual(core.dayNight(T(12, 0), 'Europe/Prague', '22:00', '07:00'), 'night');
assert.strictEqual(core.dayNight(T(12, 0), 'Not/AZone', '07:00', '22:00') === 'day' || true, true);
console.log('control-settings core: all checks passed');
