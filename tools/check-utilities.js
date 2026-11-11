const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const file = path.join(__dirname, '..', 'src', 'hotel-dashboard', 'core', 'utilities', 'utilities.core.ts');
const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', out)(require, m, m.exports);
const core = m.exports;

const TZ = 'Europe/Prague';
const H = core.HOUR_MS;
const NOW = Date.UTC(2026, 10, 9, 13, 30);
const TODAY = Date.UTC(2026, 10, 8, 23);

assert.strictEqual(core.utilityTypeOf('milesight-em300-util-water'), 'water');
assert.strictEqual(core.utilityTypeOf('chint-util-electricity'), 'electricity');
assert.strictEqual(core.utilityTypeOf('acme-util-hot-water'), 'hot-water');
assert.strictEqual(core.utilityTypeOf('Acme Util Hot Water'), 'hot-water');
assert.strictEqual(core.utilityTypeOf('util-gas'), 'gas');
assert.strictEqual(core.utilityTypeOf('milesight-ws523'), null);
assert.strictEqual(core.utilityTypeOf('utility-water'), null);
assert.strictEqual(core.utilityTypeOf(undefined), null);

assert.strictEqual(core.utilityModelOf('itron-cyble-5-util-water'), 'Itron Cyble 5');
assert.strictEqual(core.utilityModelOf('milesight-em300-util-hot-water'), 'Milesight EM300');
assert.strictEqual(core.utilityModelOf('Acme Util Hot Water'), 'Acme');
assert.strictEqual(core.utilityModelOf('util-gas'), '');
assert.strictEqual(core.utilityModelOf('milesight-ws523'), '');
assert.strictEqual(core.utilityModelShort('Itron Cyble 5'), 'Cyble 5');
assert.strictEqual(core.utilityModelShort('Acme'), 'Acme');
assert.strictEqual(core.utilityModelShort(''), '');

assert.strictEqual(core.isUtilitiesAlias('Utilities'), true);
assert.strictEqual(core.isUtilitiesAlias('Rooms'), false);
assert.deepStrictEqual(core.utilityDeviceIds([
  { aliasName: 'Utilities', entityType: 'DEVICE', entityId: 'b' },
  { aliasName: 'Utilities', entityType: 'DEVICE', entityId: { id: 'a' } },
  { aliasName: 'Utilities', entityType: 'DEVICE', entityId: 'a' },
  { aliasName: 'Utilities', entityType: 'ASSET', entityId: 'x' },
  { aliasName: 'Rooms', entityType: 'DEVICE', entityId: 'y' },
]), ['a', 'b']);

assert.strictEqual(core.utilityDef('water').unit, 'm3');
assert.strictEqual(core.utilityDef('steam').nameKey, null);
assert.strictEqual(core.humanizeType('district-steam'), 'District steam');
assert.deepStrictEqual(['steam', 'gas', 'electricity'].sort(core.compareTypes), ['electricity', 'gas', 'steam']);

assert.strictEqual(core.startOfDay(NOW, TZ), TODAY);
assert.strictEqual(core.startOfDay(Date.UTC(2026, 2, 29, 10), TZ), Date.UTC(2026, 2, 28, 23));
assert.strictEqual(core.startOfDay(Date.UTC(2026, 9, 25, 10), TZ), Date.UTC(2026, 9, 24, 22));
assert.strictEqual(core.startOfDay(TODAY, TZ), TODAY);
assert.strictEqual(core.hourOfDay(TODAY, TZ), 0);

assert.strictEqual(core.dayKey(TODAY, TZ), '2026-11-09');
assert.strictEqual(core.dayKey(TODAY - 1, TZ), '2026-11-08');
assert.strictEqual(core.dayStartOf('2026-11-09', TZ), TODAY);
assert.strictEqual(core.dayStartOf('2026-10-25', TZ), Date.UTC(2026, 9, 24, 22));
assert.strictEqual(core.dayStartOf('9.11.2026', TZ), null);
assert.strictEqual(core.dayStartOf('', TZ), null);
assert.strictEqual(core.nextDay(Date.UTC(2026, 9, 24, 22), TZ), Date.UTC(2026, 9, 25, 23));
assert.strictEqual(core.nextDay(Date.UTC(2026, 2, 28, 23), TZ), Date.UTC(2026, 2, 29, 22));

assert.deepStrictEqual(
  core.toHourly([{ ts: 2.5 * H, value: '115' }, { ts: 0.5 * H, value: 100 }, { ts: 1.5 * H, value: 110 }]),
  [{ ts: 0, use: 10, exact: true }, { ts: H, use: 5, exact: true }],
);
assert.deepStrictEqual(
  core.toHourly([{ ts: 0, value: 0 }, { ts: 2 * H, value: 8 }]),
  [{ ts: 0, use: 4, exact: false }, { ts: H, use: 4, exact: false }],
);
assert.deepStrictEqual(core.toHourly([{ ts: 0, value: 50 }, { ts: H, value: 3 }]), [{ ts: 0, use: 0, exact: true }]);
assert.deepStrictEqual(
  core.toHourly([{ ts: 0.1 * H, value: 100 }, { ts: 0.9 * H, value: 104 }, { ts: 1.2 * H, value: 105 }, { ts: 1.8 * H, value: 110 }]),
  [{ ts: 0, use: 6, exact: true }],
);
assert.deepStrictEqual(core.toHourly([{ ts: 0, value: 5 }, { ts: H, value: null }, { ts: 2 * H, value: '' }]), []);
assert.deepStrictEqual(core.toHourly([]), []);

assert.deepStrictEqual(
  core.mergeHours([[{ ts: H, use: 1, exact: true }], [{ ts: H, use: 2, exact: false }, { ts: 0, use: 5, exact: true }]]),
  [{ ts: 0, use: 5, exact: true }, { ts: H, use: 3, exact: false }],
);

function flat(days, perHour, todayPerHour) {
  const out = [];
  for (let ts = TODAY - days * core.DAY_MS; ts <= NOW; ts += H) {
    out.push({ ts, use: ts >= TODAY ? todayPerHour : perHour, exact: true });
  }
  return out;
}
const usual = core.compareToUsual(flat(30, 2, 3), NOW, TZ);
assert.strictEqual(usual.today, 3 * 15);
assert.strictEqual(usual.usual, 2 * 14.5);
assert.strictEqual(core.compareToUsual(flat(2, 2, 3), NOW, TZ).usual, null);
assert.strictEqual(core.compareToUsual(flat(28, 2, 3), TODAY + 1800000, TZ).usual, null);
assert.strictEqual(core.compareToUsual([], NOW, TZ).today, null);

assert.strictEqual(core.statusOfPct(null), 'none');
assert.strictEqual(core.statusOfPct(126), 'high');
assert.strictEqual(core.statusOfPct(125), 'above');
assert.strictEqual(core.statusOfPct(105), 'usual');
assert.strictEqual(core.statusOfPct(90), 'usual');
assert.strictEqual(core.statusOfPct(89), 'below');

function night(usualNight, tonight, exact = true) {
  return flat(28, 0, 0).map(h => {
    const hour = core.hourOfDay(h.ts, TZ);
    if (hour < 1 || hour >= 5) return h;
    return { ...h, use: h.ts >= TODAY ? tonight : usualNight, exact };
  });
}
assert.strictEqual(core.nightFlowFlag(night(0.1, 0.2), NOW, TZ), true);
assert.strictEqual(core.nightFlowFlag(night(0.1, 0.12), NOW, TZ), false);
assert.strictEqual(core.nightFlowFlag(night(0.1, 0.2, false), NOW, TZ), false);
assert.strictEqual(core.nightFlowFlag(night(0.1, 0), NOW, TZ), false);
assert.strictEqual(core.nightFlowFlag(night(0.1, 0.2), TODAY + 3 * H, TZ), false);

const meter = (id, typeId, hours, lastTs = NOW, intervalMs = 0) => ({ id, name: id, typeId, total: 1, rate: null, lastTs, intervalMs, hours });
assert.strictEqual(core.isMeterOffline(meter('a', 'gas', [], 0), NOW), true);
assert.strictEqual(core.isMeterOffline(meter('a', 'gas', [], NOW - core.METER_STALE_MS - 1), NOW), true);
assert.strictEqual(core.isMeterOffline(meter('a', 'gas', [], NOW - core.METER_STALE_MS), NOW), false);
assert.strictEqual(core.isMeterOffline(meter('a', 'water', [], NOW - 14 * H, 6 * H), NOW), false);
assert.strictEqual(core.isMeterOffline(meter('a', 'water', [], NOW - 16 * H, 6 * H), NOW), true);

assert.strictEqual(core.readingInterval([{ ts: 0 }, { ts: 6 * H }]), 0);
assert.strictEqual(core.readingInterval([{ ts: 0 }, { ts: 6 * H }, { ts: 11 * H }, { ts: 22 * H }]), 6 * H);

function sixHourly(days, litresPerHour, todayUntil) {
  const pts = [];
  let total = 1000;
  for (let ts = TODAY - days * core.DAY_MS; ts <= todayUntil; ts += 6 * H) {
    pts.push({ ts, value: total });
    total += litresPerHour * 6;
  }
  return core.toHourly(pts);
}
const sparse = core.compareToUsual(sixHourly(10, 0.15, TODAY + 12 * H), NOW, TZ);
assert.ok(Math.abs(sparse.today / sparse.usual - 1) < 0.02, 'a 6-hourly meter compares only the hours it has reported');

const sums = core.summarize([
  meter('w', 'water', night(0.1, 0.2)),
  meter('e2', 'electricity', flat(28, 1, 2)),
  meter('e1', 'electricity', flat(28, 1, 2), NOW - 4 * H),
  meter('s', 'steam', []),
], NOW, TZ);
assert.deepStrictEqual(sums.map(s => s.typeId), ['electricity', 'water', 'steam']);
assert.strictEqual(sums[0].today, 60);
assert.strictEqual(sums[0].status, 'high');
assert.deepStrictEqual(sums[0].issues.map(i => i.kind), ['high', 'offline']);
assert.deepStrictEqual(sums[1].issues.map(i => i.kind), ['leak']);
assert.strictEqual(sums[2].pct, null);
assert.strictEqual(sums[2].status, 'none');

const week = core.buildSeries(flat(20, 1, 2), 7, NOW, TZ);
assert.strictEqual(week.buckets.length, 7);
assert.strictEqual(week.buckets[6].ts, TODAY);
assert.strictEqual(week.buckets[6].value, 30);
assert.strictEqual(week.buckets[5].value, 24);
assert.strictEqual(week.total, 6 * 24 + 30);
assert.strictEqual(week.prevTotal, 6 * 24 + 14.5);
assert.strictEqual(week.hasData, true);
assert.strictEqual(Math.round(week.nightShare * 1000), Math.round(((6 * 5 + 10) / week.total) * 1000));

const day = core.buildSeries(flat(3, 1, 2), 1, NOW, TZ);
assert.strictEqual(day.buckets.length, 24);
assert.strictEqual(day.buckets[23].ts, Date.UTC(2026, 10, 9, 13));
assert.strictEqual(day.hourly, true);
assert.strictEqual(week.hourly, false);

const past = core.buildRangeSeries(flat(20, 1, 2), TODAY - 3 * core.DAY_MS, TODAY, NOW, TZ);
assert.deepStrictEqual(past.buckets.map(b => b.value), [24, 24, 24]);
assert.strictEqual(past.buckets[0].ts, TODAY - 3 * core.DAY_MS);
assert.strictEqual(past.hourly, false);
assert.strictEqual(past.total, 72);
assert.strictEqual(past.prevTotal, 72);

const recent = core.buildRangeSeries(flat(20, 1, 2), TODAY - core.DAY_MS, TODAY + core.DAY_MS, NOW, TZ);
assert.strictEqual(recent.hourly, true);
assert.strictEqual(recent.buckets.length, 48);
assert.strictEqual(recent.buckets[24].ts, TODAY);
assert.strictEqual(recent.buckets[47].value, 0);
assert.strictEqual(recent.total, 24 + 30);
assert.strictEqual(recent.prevTotal, 24 + 14.5);

const longDay = core.buildRangeSeries([], Date.UTC(2026, 9, 24, 22), Date.UTC(2026, 9, 25, 23), NOW, TZ);
assert.strictEqual(longDay.buckets.length, 25);
assert.strictEqual(longDay.hasData, false);
assert.strictEqual(core.buildRangeSeries([], Date.UTC(2026, 9, 23, 22), Date.UTC(2026, 9, 26, 23), NOW, TZ).buckets.length, 3);

const empty = core.buildSeries([], 30, NOW, TZ);
assert.strictEqual(empty.buckets.length, 30);
assert.strictEqual(empty.hasData, false);
assert.strictEqual(empty.prevTotal, null);
assert.strictEqual(empty.nightShare, null);

assert.strictEqual(core.niceCeil(0), 1);
assert.strictEqual(core.niceCeil(7.2), 8);
assert.strictEqual(core.niceCeil(1400), 1500);

console.log('utilities core: all checks passed');
