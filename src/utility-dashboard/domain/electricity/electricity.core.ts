export const METER_TIMEZONE = 'Europe/Prague';
export const SLOT_MS = 15 * 60000;
export const HOUR_MS = 3600000;
export const DAY_MS = 24 * HOUR_MS;

export const KEY_DAILY = 'daily_energy_kwh';
export const KEY_POWER = 'power_kw';
export const KEY_STATUS = 'status';
export const STATUS_MEASURED = 32;

export const MAX_RANGE_DAYS = 366;
/** Up to this many days the load curve is hourly and the heat map has a column per day; beyond it they are daily and weekly. */
const DETAIL_DAYS = 62;
/** Beyond this many days the consumption bars are per month. */
const MONTHLY_BARS_DAYS = 92;
const NIGHT_FROM_HOUR = 22;
const NIGHT_TO_HOUR = 6;
const MONTHS_SHOWN = 12;

export type PeriodId = 'day' | '7d' | '30d' | 'year' | 'custom';
const SPANS: Record<string, number> = { day: 1, '7d': 7, '30d': 30 };

export interface ElectricityMeter {
  id: string;
  name: string;
  hotel: string;
  serial: string;
  /** Start of day → kWh of that day. */
  daily: Map<number, number>;
  /** Start of 15-minute interval → average kW. */
  power: Map<number, number>;
  /** Start of 15-minute interval → status code, only where it is not "measured". */
  flags: Map<number, number>;
  /** Start of the first day on record, 0 when not known. */
  firstDay: number;
  /** Latest reading of any key, 0 when the meter never reported. */
  lastTs: number;
  /** Latest `daily_energy_kwh` as ThingsBoard reports it, 0 when not known. */
  dailyTs?: number;
}

export interface HotelGroup {
  hotel: string;
  index: number;
  meters: ElectricityMeter[];
}

export interface RangeState {
  period: PeriodId;
  /** Last day of a stepped period; null = the latest day with data. */
  anchor: number | null;
  from: number | null;
  to: number | null;
}

export interface ResolvedRange {
  days: number[];
  from: number;
  /** Start of the day after the last one. */
  to: number;
  canPrev: boolean;
  canNext: boolean;
  prevAnchor: number;
  nextAnchor: number;
}

export interface Figures {
  kwh: number | null;
  daysWithData: number;
  peak: number | null;
  peakTs: number;
  loadFactor: number | null;
  nightShare: number | null;
  received: number;
  expected: number;
  flagged: number;
}

export interface MeterRow extends Figures {
  meter: ElectricityMeter;
  hotelIndex: number;
}

export interface Bucket {
  from: number;
  to: number;
  monthly: boolean;
  /** kWh per selected hotel, null where it has no value. */
  values: (number | null)[];
  total: number | null;
  /** Meter-days without a value inside the bucket. */
  missing: number;
}

export interface OutageEvent {
  start: number;
  end: number;
  hotel: string;
  hotelIndex: number;
  serial: string;
  minutes: number;
  low: number | null;
  codes: number[];
}

export interface Curve {
  step: 'slot' | 'hour' | 'day';
  from: number;
  to: number;
  ts: number[];
  series: { hotel: string; hotelIndex: number; values: (number | null)[] }[];
  total: (number | null)[];
  /** Hotels that reported an outage, per point. */
  flagged: string[][];
  /** Outage spans as fractions of the plot width. */
  bands: { left: number; width: number }[];
}

export interface Heat {
  weekly: boolean;
  columns: { from: number; to: number }[];
  /** Average kW, column by column, 24 hours each. */
  cells: (number | null)[];
  /** The hour does not exist on any day of the column (spring clock change). */
  skipped: boolean[];
  max: number;
}

export interface Typical {
  weekday: (number | null)[];
  weekend: (number | null)[];
  all: (number | null)[];
}

export interface MonthTable {
  months: { key: string; days: number; daysInMonth: number }[];
  rows: { hotel: string; hotelIndex: number; values: (number | null)[]; total: number }[];
  totals: (number | null)[];
  grand: number;
  days: number;
}

export interface ElectricityView {
  from: number;
  to: number;
  days: number[];
  kwh: number | null;
  missing: number;
  /** Change against the same number of days right before, null when either side is incomplete. */
  deltaPct: number | null;
  avgDay: number | null;
  topDay: { day: number; kwh: number } | null;
  total: Figures;
  buckets: Bucket[];
  shares: { hotel: string; hotelIndex: number; kwh: number; share: number }[];
  curve: Curve;
  heat: Heat;
  typical: Typical;
  rows: MeterRow[];
  events: OutageEvent[];
  months: MonthTable;
  focus: number | null;
}

export function isCezProfile(profile: unknown): boolean {
  return String(profile ?? '').trim().toLowerCase().replace(/[-_\s]+/g, ' ') === 'cez meter';
}

/** `CEZ Meter 1000267929 - Jaltska Hotel` → its serial and hotel; empty strings for any other shape. */
export function parseMeterName(name: unknown): { serial: string; hotel: string } {
  const m = /^cez meter\s+(\S+)\s+-\s+(.+)$/i.exec(String(name ?? '').trim());
  return m ? { serial: m[1], hotel: m[2].trim() } : { serial: '', hotel: '' };
}

export function numberOf(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const clockFormats = new Map<string, Intl.DateTimeFormat>();

function clockIn(ts: number, tz: string): { hour: number; minute: number; second: number } {
  let f = clockFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clockFormats.set(tz, f);
  }
  const parts = f.formatToParts(ts);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
  return { hour: part('hour'), minute: part('minute'), second: part('second') };
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

export function addDays(dayStart: number, n: number, tz: string): number {
  return startOfDay(dayStart + n * DAY_MS + 12 * HOUR_MS, tz);
}

const dayKeyFormats = new Map<string, Intl.DateTimeFormat>();

/** Calendar day of a timestamp in the time zone, as `YYYY-MM-DD`. */
export function dayKey(ts: number, tz: string): string {
  let f = dayKeyFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayKeyFormats.set(tz, f);
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

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(dayStart: number, tz: string): number {
  const [y, m, d] = dayKey(dayStart, tz).split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function monthStart(ts: number, tz: string): number {
  return dayStartOf(`${dayKey(ts, tz).slice(0, 7)}-01`, tz)!;
}

export function nextMonth(start: number, tz: string): number {
  return monthStart(start + 32 * DAY_MS, tz);
}

/** `YYYY-MM` keys of the calendar months that overlap `[from, to)`. */
export function monthsBetween(from: number, to: number, tz: string): { key: string; from: number; to: number }[] {
  const out: { key: string; from: number; to: number }[] = [];
  for (let a = monthStart(from, tz); a < to; a = nextMonth(a, tz)) {
    out.push({ key: dayKey(a, tz).slice(0, 7), from: a, to: nextMonth(a, tz) });
  }
  return out;
}

export function groupByHotel(meters: ElectricityMeter[]): HotelGroup[] {
  const byHotel = new Map<string, ElectricityMeter[]>();
  for (const m of meters) byHotel.set(m.hotel, [...(byHotel.get(m.hotel) || []), m]);
  return Array.from(byHotel.keys())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((hotel, index) => ({
      hotel,
      index,
      meters: byHotel.get(hotel)!.sort((a, b) => a.serial.localeCompare(b.serial, undefined, { numeric: true })),
    }));
}

/** First and last day that any meter has data for; null when none reported yet. */
export function dataExtent(meters: ElectricityMeter[], tz: string): { first: number; last: number } | null {
  let first = Infinity;
  let last = 0;
  for (const m of meters) {
    if (!m.lastTs) continue;
    last = Math.max(last, m.lastTs);
    first = Math.min(first, m.firstDay || startOfDay(m.lastTs, tz));
  }
  if (!last) return null;
  const lastDay = startOfDay(last, tz);
  return { first: Math.min(first, lastDay), last: lastDay };
}

export function resolveRange(range: RangeState, first: number, last: number, tz: string): ResolvedRange {
  const clamp = (d: number) => Math.min(last, Math.max(first, d));
  let a: number;
  let b: number;
  let canPrev = false;
  let canNext = false;
  let prevAnchor = last;
  let nextAnchor = last;

  if (range.period === 'custom' && range.from !== null && range.to !== null) {
    a = clamp(Math.min(range.from, range.to));
    b = clamp(Math.max(range.from, range.to));
    if (b - a > (MAX_RANGE_DAYS - 1) * DAY_MS + 2 * HOUR_MS) a = addDays(b, -(MAX_RANGE_DAYS - 1), tz);
  } else if (range.period === 'year') {
    const year = dayKey(clamp(range.anchor ?? last), tz).slice(0, 4);
    a = clamp(dayStartOf(`${year}-01-01`, tz)!);
    b = clamp(dayStartOf(`${year}-12-31`, tz)!);
    canPrev = a > first;
    canNext = b < last;
    prevAnchor = clamp(addDays(a, -1, tz));
    nextAnchor = clamp(addDays(b, 1, tz));
  } else {
    const span = SPANS[range.period] || 30;
    b = clamp(range.anchor ?? last);
    a = clamp(addDays(b, -(span - 1), tz));
    canPrev = a > first;
    canNext = b < last;
    prevAnchor = clamp(Math.max(addDays(b, -span, tz), addDays(first, span - 1, tz)));
    nextAnchor = clamp(addDays(b, span, tz));
  }

  const days: number[] = [];
  for (let d = a; d <= b; d = nextDay(d, tz)) days.push(d);
  return { days, from: a, to: nextDay(b, tz), canPrev, canNext, prevAnchor, nextAnchor };
}

function emptyFigures(): Figures {
  return { kwh: null, daysWithData: 0, peak: null, peakTs: 0, loadFactor: null, nightShare: null, received: 0, expected: 0, flagged: 0 };
}

function isNight(hour: number): boolean {
  return hour >= NIGHT_FROM_HOUR || hour < NIGHT_TO_HOUR;
}

/** Sum of the daily values of the meters on the given days: the total, and how many meter-days had no value. */
function dailySum(meters: ElectricityMeter[], days: number[]): { kwh: number | null; missing: number } {
  let kwh: number | null = null;
  let missing = 0;
  for (const m of meters) {
    for (const d of days) {
      const v = m.daily.get(d);
      if (v !== undefined) kwh = (kwh ?? 0) + v;
      else if (!m.firstDay || d >= m.firstDay) missing++;
    }
  }
  return { kwh, missing };
}

export function computeView(groups: HotelGroup[], days: number[], focusDay: number | null, tz: string): ElectricityView {
  const from = days[0];
  const to = nextDay(days[days.length - 1], tz);
  const n = Math.round((to - from) / SLOT_MS);
  const nDays = days.length;
  const meters = groups.flatMap(g => g.meters);

  const dayOffset = days.map(d => Math.round((d - from) / SLOT_MS));
  const weekday = days.map(d => weekdayOf(d, tz));
  const dayOf = new Int32Array(n);
  const hour = new Uint8Array(n);
  for (let d = 0; d < nDays; d++) {
    const end = d + 1 < nDays ? dayOffset[d + 1] : n;
    for (let i = dayOffset[d]; i < end; i++) dayOf[i] = d;
  }
  for (let i = 0; i < n; i++) {
    const ts = from + i * SLOT_MS;
    hour[i] = i === 0 || ts % HOUR_MS === 0 ? hourOfDay(ts, tz) : hour[i - 1];
  }

  // 15-minute figures per meter, per hotel and for all selected hotels together
  const combined: (number | null)[] = new Array(n).fill(null);
  const hotelKw: (number | null)[][] = groups.map(() => new Array(n).fill(null));
  const dayHour: (number | null)[] = new Array(nDays * 24).fill(null);
  const hourPresent = new Uint8Array(nDays * 24);
  for (let i = 0; i < n; i++) hourPresent[dayOf[i] * 24 + hour[i]] = 1;
  // A sum over several meters is only known where every meter that should report has a value.
  const slotHave = new Uint16Array(n);
  const slotWant = new Uint16Array(n);
  const hotelHave = groups.map(() => new Uint16Array(n));
  const hotelWant = groups.map(() => new Uint16Array(n));
  const cellHave = new Uint16Array(nDays * 24);
  const cellWant = new Uint16Array(nDays * 24);
  const total = emptyFigures();
  let energy = 0;
  let night = 0;
  const rows: MeterRow[] = [];

  groups.forEach((g, gi) => {
    for (const m of g.meters) {
      const row: MeterRow = { ...emptyFigures(), meter: m, hotelIndex: g.index };
      const hourSum = new Float64Array(nDays * 24);
      const hourCount = new Uint16Array(nDays * 24);
      let sum = 0;
      let nightSum = 0;
      for (let i = 0; i < n; i++) {
        const ts = from + i * SLOT_MS;
        if (!m.firstDay || ts >= m.firstDay) {
          row.expected++;
          slotWant[i]++;
          hotelWant[gi][i]++;
        }
        const v = m.power.get(ts);
        if (v === undefined) continue;
        row.received++;
        slotHave[i]++;
        hotelHave[gi][i]++;
        sum += v;
        if (isNight(hour[i])) nightSum += v;
        if (row.peak === null || v > row.peak) {
          row.peak = v;
          row.peakTs = ts;
        }
        hotelKw[gi][i] = (hotelKw[gi][i] ?? 0) + v;
        combined[i] = (combined[i] ?? 0) + v;
        const cell = dayOf[i] * 24 + hour[i];
        hourSum[cell] += v;
        hourCount[cell]++;
      }
      for (let c = 0; c < hourSum.length; c++) {
        if (!m.firstDay || days[Math.floor(c / 24)] >= m.firstDay) cellWant[c]++;
        if (!hourCount[c]) continue;
        cellHave[c]++;
        dayHour[c] = (dayHour[c] ?? 0) + hourSum[c] / hourCount[c];
      }
      for (const ts of m.flags.keys()) if (ts >= from && ts < to) row.flagged++;
      const own = dailySum([m], days);
      row.kwh = own.kwh;
      row.daysWithData = days.filter(d => m.daily.has(d)).length;
      row.loadFactor = row.received && row.peak ? sum / row.received / row.peak : null;
      row.nightShare = sum > 0 ? nightSum / sum : null;
      rows.push(row);

      total.received += row.received;
      total.expected += row.expected;
      total.flagged += row.flagged;
      energy += sum;
      night += nightSum;
    }
  });

  for (let i = 0; i < n; i++) {
    if (slotHave[i] < slotWant[i]) combined[i] = null;
    hotelKw.forEach((kw, gi) => {
      if (hotelHave[gi][i] < hotelWant[gi][i]) kw[i] = null;
    });
  }
  for (let c = 0; c < dayHour.length; c++) if (cellHave[c] < cellWant[c]) dayHour[c] = null;

  let points = 0;
  let combinedSum = 0;
  for (let i = 0; i < n; i++) {
    const v = combined[i];
    if (v === null) continue;
    points++;
    combinedSum += v;
    if (total.peak === null || v > total.peak) {
      total.peak = v;
      total.peakTs = from + i * SLOT_MS;
    }
  }
  total.loadFactor = points && total.peak ? combinedSum / points / total.peak : null;
  total.nightShare = energy > 0 ? night / energy : null;

  // daily consumption
  const window = dailySum(meters, days);
  total.kwh = window.kwh;
  let topDay: { day: number; kwh: number } | null = null;
  for (const d of days) {
    const day = dailySum(meters, [d]);
    if (day.kwh === null) continue;
    total.daysWithData++;
    if (!topDay || day.kwh > topDay.kwh) topDay = { day: d, kwh: day.kwh };
  }

  const before: number[] = [];
  for (let d = addDays(from, -nDays, tz); d < from; d = nextDay(d, tz)) before.push(d);
  const previous = dailySum(meters, before);
  const onRecord = meters.every(m => !m.firstDay || m.firstDay <= before[0]);
  const deltaPct = window.kwh !== null && previous.kwh && onRecord && !window.missing && !previous.missing
    ? (window.kwh - previous.kwh) / previous.kwh * 100
    : null;

  const monthly = nDays > MONTHLY_BARS_DAYS;
  const spans: { from: number; to: number; days: number[] }[] = [];
  for (const d of days) {
    const last = spans[spans.length - 1];
    if (monthly && last && dayKey(last.from, tz).slice(0, 7) === dayKey(d, tz).slice(0, 7)) {
      last.to = d;
      last.days.push(d);
    } else {
      spans.push({ from: d, to: d, days: [d] });
    }
  }
  const buckets: Bucket[] = spans.map(s => {
    const values = groups.map(g => dailySum(g.meters, s.days).kwh);
    const all = dailySum(meters, s.days);
    return { from: s.from, to: s.to, monthly, values, total: all.kwh, missing: all.missing };
  });

  const shares = groups.map(g => {
    const kwh = dailySum(g.meters, days).kwh ?? 0;
    return { hotel: g.hotel, hotelIndex: g.index, kwh, share: window.kwh ? kwh / window.kwh : 0 };
  });

  // outages: runs of consecutive flagged intervals of one meter
  const events: OutageEvent[] = [];
  for (const g of groups) {
    for (const m of g.meters) {
      const flagged = Array.from(m.flags.keys()).filter(ts => ts >= from && ts < to).sort((a, b) => a - b);
      let run: OutageEvent | null = null;
      for (const ts of flagged) {
        if (!run || ts !== run.end) {
          run = { start: ts, end: ts, hotel: g.hotel, hotelIndex: g.index, serial: m.serial, minutes: 0, low: null, codes: [] };
          events.push(run);
        }
        run.end = ts + SLOT_MS;
        run.minutes += SLOT_MS / 60000;
        const v = m.power.get(ts);
        if (v !== undefined && (run.low === null || v < run.low)) run.low = v;
        const code = m.flags.get(ts)!;
        if (!run.codes.includes(code)) run.codes.push(code);
      }
    }
  }
  events.sort((a, b) => b.start - a.start);
  events.forEach(e => e.codes.sort((a, b) => b - a));

  // load curve: one day at 15 minutes, a period as hourly or daily averages
  const focus = focusDay !== null && nDays > 1 && days.includes(focusDay) ? focusDay : null;
  const focusIndex = focus === null ? -1 : days.indexOf(focus);
  const first = focusIndex < 0 ? 0 : dayOffset[focusIndex];
  const end = focusIndex < 0 || focusIndex + 1 >= nDays ? n : dayOffset[focusIndex + 1];
  const step: Curve['step'] = focusIndex >= 0 || nDays === 1 ? 'slot' : nDays <= DETAIL_DAYS ? 'hour' : 'day';
  const edges: number[] = [];
  if (step === 'day') edges.push(...dayOffset);
  else for (let i = first; i < end; i += step === 'slot' ? 1 : 4) edges.push(i);
  edges.push(end);

  const curve: Curve = {
    step,
    from: from + first * SLOT_MS,
    to: from + end * SLOT_MS,
    ts: edges.slice(0, -1).map(i => from + i * SLOT_MS),
    series: groups.map(g => ({ hotel: g.hotel, hotelIndex: g.index, values: [] })),
    total: [],
    flagged: [],
    bands: [],
  };
  for (let j = 0; j + 1 < edges.length; j++) {
    let together: number | null = null;
    const names: string[] = [];
    groups.forEach((g, gi) => {
      let sum = 0;
      let count = 0;
      for (let i = edges[j]; i < edges[j + 1]; i++) {
        const v = hotelKw[gi][i];
        if (v === null) continue;
        sum += v;
        count++;
      }
      curve.series[gi].values.push(count ? sum / count : null);
      if (count) together = (together ?? 0) + sum / count;
      const a = from + edges[j] * SLOT_MS;
      const b = from + edges[j + 1] * SLOT_MS;
      if (events.some(e => e.hotelIndex === g.index && e.start < b && e.end > a)) names.push(g.hotel);
    });
    curve.total.push(together);
    curve.flagged.push(names);
  }
  for (const e of events) {
    const a = Math.max(e.start, curve.from);
    const b = Math.min(e.end, curve.to);
    if (b > a) curve.bands.push({ left: (a - curve.from) / (curve.to - curve.from), width: (b - a) / (curve.to - curve.from) });
  }

  // heat map: hour of day by day, or by week for a long period
  const weekly = nDays > DETAIL_DAYS;
  const columns: { from: number; to: number; days: number[] }[] = [];
  days.forEach((d, i) => {
    const last = columns[columns.length - 1];
    if (weekly && last && weekday[i] !== 0) {
      last.to = d;
      last.days.push(i);
    } else {
      columns.push({ from: d, to: d, days: [i] });
    }
  });
  const cells: (number | null)[] = [];
  const skipped: boolean[] = [];
  let heatMax = 0;
  for (const col of columns) {
    for (let h = 0; h < 24; h++) {
      skipped.push(col.days.every(i => !hourPresent[i * 24 + h]));
      const values = col.days.map(i => dayHour[i * 24 + h]).filter((v): v is number => v !== null);
      const v = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      if (v !== null && v > heatMax) heatMax = v;
      cells.push(v);
    }
  }

  const average = (pick: (weekend: boolean) => boolean): (number | null)[] => {
    const out: (number | null)[] = [];
    for (let h = 0; h < 24; h++) {
      const values = days
        .map((_d, i) => (pick(weekday[i] >= 5) ? dayHour[i * 24 + h] : null))
        .filter((v): v is number => v !== null);
      out.push(values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    }
    return out;
  };

  return {
    from,
    to,
    days,
    kwh: window.kwh,
    missing: window.missing,
    deltaPct,
    avgDay: window.kwh !== null && total.daysWithData ? window.kwh / total.daysWithData : null,
    topDay,
    total,
    buckets,
    shares,
    curve,
    heat: { weekly, columns: columns.map(c => ({ from: c.from, to: c.to })), cells, skipped, max: heatMax },
    typical: { weekday: average(w => !w), weekend: average(w => w), all: average(() => true) },
    rows,
    events,
    months: monthTable(groups, tz),
    focus,
  };
}

/** Calendar-month totals over everything on record; the columns are the latest months, the totals cover all of it. */
export function monthTable(groups: HotelGroup[], tz: string): MonthTable {
  const keyOf = new Map<number, string>();
  const dayCount = new Map<string, Set<number>>();
  const allDays = new Set<number>();
  for (const g of groups) {
    for (const m of g.meters) {
      for (const d of m.daily.keys()) {
        let key = keyOf.get(d);
        if (!key) {
          key = dayKey(d, tz).slice(0, 7);
          keyOf.set(d, key);
        }
        if (!dayCount.has(key)) dayCount.set(key, new Set());
        dayCount.get(key)!.add(d);
        allDays.add(d);
      }
    }
  }
  const keys = Array.from(dayCount.keys()).sort().slice(-MONTHS_SHOWN);
  const months = keys.map(key => {
    const [y, mo] = key.split('-').map(Number);
    return { key, days: dayCount.get(key)!.size, daysInMonth: new Date(Date.UTC(y, mo, 0)).getUTCDate() };
  });
  const totals: (number | null)[] = keys.map(() => null);
  let grand = 0;
  const rows = groups.map(g => {
    const values: (number | null)[] = keys.map(() => null);
    let total = 0;
    for (const m of g.meters) {
      for (const [d, v] of m.daily) {
        total += v;
        const col = keys.indexOf(keyOf.get(d)!);
        if (col < 0) continue;
        values[col] = (values[col] ?? 0) + v;
        totals[col] = (totals[col] ?? 0) + v;
      }
    }
    grand += total;
    return { hotel: g.hotel, hotelIndex: g.index, values, total };
  });
  return { months, rows, totals, grand, days: allDays.size };
}

export function niceTop(v: number): number {
  if (!(v > 0)) return 1;
  const raw = v / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p * 4;
}
