const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const file = path.join(__dirname, '..', 'src', 'utility-dashboard', 'domain', 'electricity', 'electricity.core.ts');
const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', out)(require, m, m.exports);
const core = m.exports;

const TZ = 'Europe/Prague';
const SLOT = core.SLOT_MS;
const day = key => core.dayStartOf(key, TZ);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

assert.strictEqual(core.isCezProfile('CEZ Meter'), true);
assert.strictEqual(core.isCezProfile(' cez-meter '), true);
assert.strictEqual(core.isCezProfile('CEZ Meter 2'), false);
assert.strictEqual(core.isCezProfile(undefined), false);
assert.deepStrictEqual(core.parseMeterName('CEZ Meter 1000267929 - Jaltska Hotel'), { serial: '1000267929', hotel: 'Jaltska Hotel' });
assert.deepStrictEqual(core.parseMeterName('Main meter'), { serial: '', hotel: '' });
assert.strictEqual(core.numberOf('2.5'), 2.5);
assert.strictEqual(core.numberOf(''), null);
assert.strictEqual(core.numberOf('x'), null);

// calendar days in Prague time, across both clock changes
assert.strictEqual(day('2026-10-25'), Date.UTC(2026, 9, 24, 22));
assert.strictEqual(core.nextDay(day('2026-10-25'), TZ) - day('2026-10-25'), 25 * core.HOUR_MS);
assert.strictEqual(core.nextDay(day('2026-03-29'), TZ) - day('2026-03-29'), 23 * core.HOUR_MS);
assert.strictEqual(core.addDays(day('2026-10-20'), 10, TZ), day('2026-10-30'));
assert.strictEqual(core.addDays(day('2026-11-05'), -30, TZ), day('2026-10-06'));
assert.strictEqual(core.weekdayOf(day('2026-10-12'), TZ), 0);
assert.strictEqual(core.weekdayOf(day('2026-10-25'), TZ), 6);
assert.deepStrictEqual(core.monthsBetween(day('2026-10-12'), day('2026-11-11'), TZ).map(x => x.key), ['2026-10', '2026-11']);
assert.strictEqual(core.monthsBetween(day('2026-10-12'), day('2026-11-11'), TZ)[0].to, day('2026-11-01'));

function meter(id, hotel, firstKey, days, kw) {
  const power = new Map();
  const daily = new Map();
  for (const key of days) {
    const from = day(key);
    const to = core.nextDay(from, TZ);
    for (let t = from; t < to; t += SLOT) power.set(t, kw);
    daily.set(from, kw * (to - from) / core.HOUR_MS);
  }
  const last = Math.max(...power.keys());
  return { id, name: id, hotel, serial: id, daily, power, flags: new Map(), firstDay: day(firstKey), lastTs: last };
}

const a = meter('a', 'Hotel 10', '2026-11-01', ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], 2);
const b = meter('b', 'Hotel 2', '2026-11-03', ['2026-11-03', '2026-11-04'], 6);
const groups = core.groupByHotel([a, b]);
assert.deepStrictEqual(groups.map(g => g.hotel), ['Hotel 2', 'Hotel 10']);

const extent = core.dataExtent([a, b], TZ);
assert.deepStrictEqual(extent, { first: day('2026-11-01'), last: day('2026-11-04') });
assert.strictEqual(core.dataExtent([{ ...a, lastTs: 0 }], TZ), null);

// periods end at the latest day with data and never start before the first one
let r = core.resolveRange({ period: '30d', anchor: null, from: null, to: null }, extent.first, extent.last, TZ);
assert.strictEqual(r.days.length, 4);
assert.strictEqual(r.canPrev, false);
r = core.resolveRange({ period: 'day', anchor: null, from: null, to: null }, extent.first, extent.last, TZ);
assert.deepStrictEqual(r.days, [day('2026-11-04')]);
assert.strictEqual(r.canPrev, true);
assert.strictEqual(r.prevAnchor, day('2026-11-03'));
assert.strictEqual(r.canNext, false);
r = core.resolveRange({ period: 'year', anchor: null, from: null, to: null }, day('2025-12-20'), day('2026-02-10'), TZ);
assert.strictEqual(r.from, day('2026-01-01'));
assert.strictEqual(r.canPrev, true);
assert.strictEqual(r.prevAnchor, day('2025-12-31'));
r = core.resolveRange({ period: 'custom', anchor: null, from: day('2024-01-01'), to: day('2026-06-01') }, day('2024-01-01'), day('2026-06-01'), TZ);
assert.strictEqual(r.days.length, core.MAX_RANGE_DAYS);
assert.strictEqual(r.days[r.days.length - 1], day('2026-06-01'));

// two days, both hotels complete
let v = core.computeView(groups, [day('2026-11-03'), day('2026-11-04')], null, TZ);
near(v.kwh, 2 * 24 * 2 + 6 * 24 * 2);
assert.strictEqual(v.missing, 0);
assert.strictEqual(v.deltaPct, null);
near(v.avgDay, 192);
near(v.total.peak, 8);
near(v.total.loadFactor, 1);
near(v.total.nightShare, 8 / 24);
assert.strictEqual(v.total.received, 2 * 2 * 96);
assert.strictEqual(v.total.expected, 2 * 2 * 96);
assert.deepStrictEqual(v.shares.map(s => s.hotel), ['Hotel 2', 'Hotel 10']);
near(v.shares[0].share, 0.75);
assert.strictEqual(v.curve.step, 'hour');
assert.strictEqual(v.curve.ts.length, 48);
near(v.curve.total[0], 8);
assert.strictEqual(v.heat.columns.length, 2);
near(v.heat.max, 8);
assert.strictEqual(v.buckets.length, 2);
assert.deepStrictEqual(v.buckets[0].values, [144, 48]);

// a meter is only expected from its first day; a day without a daily total is a gap, not zero
v = core.computeView(groups, [day('2026-11-02'), day('2026-11-03')], null, TZ);
assert.strictEqual(v.missing, 0);
assert.deepStrictEqual(v.buckets[0].values, [null, 48]);
assert.strictEqual(v.rows.find(x => x.meter.id === 'b').expected, 96);
a.daily.delete(day('2026-11-03'));
v = core.computeView(groups, [day('2026-11-02'), day('2026-11-03')], null, TZ);
assert.strictEqual(v.missing, 1);
assert.strictEqual(v.buckets[1].missing, 1);
near(v.kwh, 48 + 144);
v = core.computeView(groups.slice(1), [day('2026-11-03')], null, TZ);
assert.strictEqual(v.kwh, null);
assert.strictEqual(v.buckets[0].total, null);
assert.strictEqual(v.avgDay, null);

// previous period of the same length, only when both are complete
v = core.computeView(groups.slice(1), [day('2026-11-02')], null, TZ);
near(v.deltaPct, 0);
v = core.computeView(groups.slice(1), [day('2026-11-04')], null, TZ);
assert.strictEqual(v.deltaPct, null);

// consecutive flagged intervals of one meter are one outage
const t0 = day('2026-11-04') + 40 * SLOT;
b.flags.set(t0, 16);
b.flags.set(t0 + SLOT, 8);
b.power.set(t0 + SLOT, 0);
b.flags.set(t0 + 2 * SLOT, 16);
b.flags.set(t0 + 10 * SLOT, 16);
v = core.computeView(groups, [day('2026-11-03'), day('2026-11-04')], day('2026-11-04'), TZ);
assert.strictEqual(v.events.length, 2);
assert.deepStrictEqual([v.events[1].start, v.events[1].end, v.events[1].minutes, v.events[1].low, v.events[1].codes],
  [t0, t0 + 3 * SLOT, 45, 0, [16, 8]]);
assert.strictEqual(v.total.flagged, 4);
assert.strictEqual(v.focus, day('2026-11-04'));
assert.strictEqual(v.curve.step, 'slot');
assert.strictEqual(v.curve.ts.length, 96);
assert.strictEqual(v.curve.bands.length, 2);
assert.deepStrictEqual(v.curve.flagged[41], ['Hotel 2']);
assert.deepStrictEqual(v.curve.flagged[43], []);

// the autumn clock-change day has 100 intervals and a doubled hour
const c = meter('c', 'Hotel 3', '2026-10-25', ['2026-10-25'], 4);
v = core.computeView(core.groupByHotel([c]), [day('2026-10-25')], null, TZ);
assert.strictEqual(v.total.expected, 100);
assert.strictEqual(v.curve.ts.length, 100);
assert.strictEqual(v.heat.cells.filter(x => x === null).length, 0);
near(v.kwh, 100);

// a long period: bars per month, load curve per day, heat map per week
const longDays = [];
for (let d = day('2026-06-01'); d <= day('2026-10-31'); d = core.nextDay(d, TZ)) longDays.push(core.dayKey(d, TZ));
const long = meter('l', 'Hotel 4', '2026-06-01', longDays, 1);
v = core.computeView(core.groupByHotel([long]), longDays.map(day), null, TZ);
assert.strictEqual(v.buckets.length, 5);
assert.strictEqual(v.buckets[0].monthly, true);
near(v.buckets[0].total, 30 * 24);
assert.strictEqual(v.curve.step, 'day');
assert.strictEqual(v.curve.ts.length, longDays.length);
assert.strictEqual(v.heat.weekly, true);
assert.strictEqual(v.heat.columns.length, 22);
assert.deepStrictEqual(v.months.months.map(x => [x.key, x.days, x.daysInMonth]),
  [['2026-06', 30, 30], ['2026-07', 31, 31], ['2026-08', 31, 31], ['2026-09', 30, 30], ['2026-10', 31, 31]]);

// one meter of a hotel misses an interval: the hotel and the total are unknown there, not lower
const h1 = meter('h1', 'Hotel 7', '2026-11-04', ['2026-11-04'], 5);
const h2 = meter('h2', 'Hotel 7', '2026-11-04', ['2026-11-04'], 5);
const hole = day('2026-11-04') + 10 * SLOT;
h2.power.delete(hole);
h2.flags.set(hole + SLOT, 16);
h2.power.delete(hole + SLOT);
v = core.computeView(core.groupByHotel([h1, h2]), [day('2026-11-04')], null, TZ);
assert.strictEqual(v.curve.total[10], null);
assert.strictEqual(v.curve.series[0].values[10], null);
near(v.curve.total[12], 10);
near(v.total.peak, 10);
near(v.total.loadFactor, 1);
near(v.heat.cells[2], 10);
v = core.computeView(core.groupByHotel([h1, h2]), [day('2026-11-03'), day('2026-11-04')], null, TZ);
assert.strictEqual(v.heat.cells.slice(0, 24).every(c => c === null), true);
near(v.heat.cells[24 + 2], 10);
assert.strictEqual(v.rows.find(x => x.meter.id === 'h2').flagged, 1);
assert.strictEqual(v.total.flagged, 1);

// the spring clock-change hour is skipped, not missing
const s1 = meter('s1', 'Hotel 8', '2026-03-29', ['2026-03-29'], 2);
v = core.computeView(core.groupByHotel([s1]), [day('2026-03-29')], null, TZ);
assert.strictEqual(v.total.expected, 92);
assert.strictEqual(v.heat.skipped[2], true);
assert.strictEqual(v.heat.skipped.filter(Boolean).length, 1);
assert.strictEqual(v.heat.cells.filter((c, i) => c === null && !v.heat.skipped[i]).length, 0);

assert.strictEqual(core.niceTop(0), 1);
assert.strictEqual(core.niceTop(621.7), 800);
assert.strictEqual(core.niceTop(48.7), 80);

console.log('electricity core: all checks passed');
