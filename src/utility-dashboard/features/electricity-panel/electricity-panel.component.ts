import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectricityService, ElectricityState } from '../../domain/services/electricity.service';
import {
  Curve, ElectricityView, Figures, HotelGroup, METER_TIMEZONE, PeriodId, RangeState, ResolvedRange,
  computeView, dataExtent, dayKey, dayStartOf, groupByHotel, niceTop, resolveRange,
} from '../../domain/electricity/electricity.core';

interface Tick { label: string; bottom: number; }
interface XTick { label: string; left: number; shift: string; }
interface Kpi { label: string; value: string; unit: string; sub: string; }
interface Segment { left: number; width: number; bottom: number; height: number; color: string; top: boolean; dim: boolean; }
interface BarHit { left: number; width: number; tip: string; aria: string; from: number; to: number; monthly: boolean; empty: boolean; }
interface TableRow {
  hotel: string; color: string; serial: string; kwh: string; share: string; perDay: string; peak: string; peakAt: string;
  loadFactor: string; night: string; received: string; outages: string;
}
interface PanelView {
  periodLabel: string;
  many: boolean;
  hotels: { label: string; dots: string[]; options: { hotel: string; detail: string; on: boolean; color: string }[] };
  range: { stepping: boolean; canPrev: boolean; canNext: boolean; custom: boolean; from: string; to: string; min: string; max: string };
  kpis: Kpi[];
  bars: { title: string; hint: string; ticks: Tick[]; segments: Segment[]; hits: BarHit[]; labels: string[] };
  shares: { hotel: string; color: string; kwh: string; share: string; width: number }[];
  curve: {
    sub: string; focused: boolean; ticks: Tick[]; xTicks: XTick[]; bands: { left: number; width: number }[];
    lines: { name: string; color: string; d: string; values: (number | null)[] }[]; showTogether: boolean; hasData: boolean;
  };
  heat: { sub: string; columns: number; cells: { bg: string | null; tip: string }[]; labels: string[]; maxLabel: string };
  typical: { ticks: Tick[]; weekday: string; weekend: string; weekdayPeak: string; weekendPeak: string; base: string };
  rows: TableRow[];
  total: TableRow;
  months: { columns: string; cells: { text: string; sub: string; kind: string }[] };
  events: { when: string; hotel: string; color: string; duration: string; low: string; codes: string }[];
  quality: string;
}

const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const TOGETHER_COLOR = 'var(--ink)';
const RAMP_STEPS = 14;
const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'day', label: 'Day' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' },
  { id: 'year', label: 'Year' }, { id: 'custom', label: 'Custom' },
];
const DASH = '—';

@Component({
  selector: 'revelton-electricity-panel',
  templateUrl: './electricity-panel.component.html',
  styleUrls: ['./electricity-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ElectricityPanelComponent implements OnInit, OnDestroy {
  readonly periods = PERIODS;
  readonly hours = Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? `${this.pad(h)}:00` : ''));
  readonly ramp = Array.from({ length: RAMP_STEPS }, (_, i) => this.rampColor(i));
  readonly typicalTicks: XTick[] = [0, 6, 12, 18, 23].map(h => ({
    label: `${this.pad(h)}:00`, left: h / 23 * 100, shift: h === 0 ? '0' : h === 23 ? '-100%' : '-50%',
  }));

  state: ElectricityState = { status: 'none', meters: [], loading: false, failed: false, revision: 0 };
  view: PanelView | null = null;
  empty = false;
  detailReady = false;

  range: RangeState = { period: '30d', anchor: null, from: null, to: null };
  mode: 'hotel' | 'total' = 'hotel';
  hotelsOpen = false;
  hover: number | null = null;

  private selected: Set<string> | null = null;
  private focus: number | null = null;
  private groups: HotelGroup[] = [];
  private resolved: ResolvedRange | null = null;
  private computed: ElectricityView | null = null;
  private computedKey = '';
  private sub = new Subscription();
  private formats = new Map<string, Intl.DateTimeFormat>();

  constructor(private electricity: ElectricityService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.sub.add(this.electricity.state$.subscribe(state => {
      this.state = state;
      this.rebuild();
      this.cdr.markForCheck();
    }));
    this.electricity.setActive(true);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.electricity.setActive(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.hotelsOpen = false;
  }

  @HostListener('document:mousedown', ['$event'])
  onOutside(event: Event): void {
    if (this.hotelsOpen && !(event.target as Element | null)?.closest?.('.el-hotels')) this.hotelsOpen = false;
  }

  retry(): void {
    this.electricity.retry();
  }

  toggleHotel(hotel: string, event: Event): void {
    const next = new Set(this.groups.filter(g => this.isOn(g.hotel)).map(g => g.hotel));
    if (next.has(hotel)) next.delete(hotel);
    else next.add(hotel);
    if (next.size) this.select(next.size === this.groups.length ? null : next);
    else (event.target as HTMLInputElement).checked = true;
  }

  onlyHotel(hotel: string): void {
    this.select(new Set([hotel]));
  }

  allHotels(): void {
    this.select(null);
  }

  pickPeriod(period: PeriodId): void {
    if (period === 'custom' && this.resolved) {
      const days = this.resolved.days;
      this.setRange({ period, anchor: null, from: days[0], to: days[days.length - 1] });
    } else {
      this.setRange({ period, anchor: null, from: null, to: null });
    }
  }

  step(direction: -1 | 1): void {
    const r = this.resolved;
    if (!r || !(direction < 0 ? r.canPrev : r.canNext)) return;
    this.setRange({ ...this.range, anchor: direction < 0 ? r.prevAnchor : r.nextAnchor });
  }

  setCustom(edge: 'from' | 'to', event: Event): void {
    const day = dayStartOf((event.target as HTMLInputElement).value, METER_TIMEZONE);
    const r = this.resolved;
    if (day === null || !r) return;
    const first = r.days[0];
    const last = r.days[r.days.length - 1];
    this.setRange(edge === 'from'
      ? { period: 'custom', anchor: null, from: day, to: Math.max(day, last) }
      : { period: 'custom', anchor: null, from: Math.min(day, first), to: day });
  }

  pickBar(hit: BarHit): void {
    if (hit.monthly) this.setRange({ period: 'custom', anchor: null, from: hit.from, to: hit.to });
    else if (this.resolved && this.resolved.days.length > 1 && !hit.empty) this.setFocus(this.focus === hit.from ? null : hit.from);
  }

  clearFocus(): void {
    this.setFocus(null);
  }

  setMode(mode: 'hotel' | 'total'): void {
    this.mode = mode;
    this.hover = null;
    this.rebuild();
  }

  onCurveMove(event: MouseEvent): void {
    const n = this.computed?.curve.ts.length || 0;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!n || !box.width) return;
    this.hover = Math.round(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * (n - 1));
  }

  get tip(): { title: string; rows: { name: string; color: string; value: string }[]; flag: string; left: number; shift: string } | null {
    const curve = this.computed?.curve;
    const lines = this.view?.curve.lines;
    if (this.hover === null || !curve || !lines || this.hover >= curve.ts.length) return null;
    const j = this.hover;
    const left = curve.ts.length > 1 ? j / (curve.ts.length - 1) * 100 : 50;
    const value = (v: number | null) => (v === null ? 'no data' : `${this.fmt(v, 2)} kW`);
    const rows = lines.map(l => ({ name: l.name, color: l.color, value: value(l.values[j]) }));
    if (this.view!.curve.showTogether) rows.push({ name: 'Together', color: 'var(--surface)', value: value(curve.total[j]) });
    return {
      title: this.curvePointLabel(curve, j),
      rows,
      flag: curve.flagged[j].length ? `Power outage reported: ${curve.flagged[j].join(', ')}` : '',
      left,
      shift: left > 55 ? 'calc(-100% - 14px)' : '14px',
    };
  }

  trackIndex(i: number): number { return i; }

  private isOn(hotel: string): boolean {
    return !this.selected || this.selected.has(hotel);
  }

  private selectedGroups(): HotelGroup[] {
    const on = this.groups.filter(g => this.isOn(g.hotel));
    return on.length ? on : this.groups;
  }

  private select(selected: Set<string> | null): void {
    this.selected = selected;
    this.hover = null;
    this.rebuild();
  }

  private setRange(range: RangeState): void {
    this.range = range;
    this.focus = null;
    this.hover = null;
    this.rebuild();
  }

  private setFocus(day: number | null): void {
    this.focus = day;
    this.hover = null;
    this.rebuild();
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }

  private fmt(v: number, digits: number): string {
    return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  private kwh(v: number | null): string {
    return v === null ? DASH : this.fmt(v, v >= 1000 ? 0 : 1);
  }

  private pct(v: number | null): string {
    return v === null ? DASH : `${this.fmt(v * 100, 1)} %`;
  }

  private colorOf(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length];
  }

  private rampColor(step: number): string {
    return `color-mix(in oklab, var(--accent) ${Math.round(12 + 88 * step / (RAMP_STEPS - 1))}%, var(--surface))`;
  }

  private date(ts: number, style: 'long' | 'clock' | 'month'): string {
    let format = this.formats.get(style);
    if (!format) {
      const options: Intl.DateTimeFormatOptions = style === 'long' ? { weekday: 'short', day: 'numeric', month: 'short' }
        : style === 'clock' ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
        : { month: 'short' };
      format = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: METER_TIMEZONE });
      this.formats.set(style, format);
    }
    return format.format(ts).replace(',', '');
  }

  private year(ts: number): string {
    return dayKey(ts, METER_TIMEZONE).slice(0, 4);
  }

  private short(ts: number): string {
    const [, m, d] = dayKey(ts, METER_TIMEZONE).split('-');
    return `${d}.${m}`;
  }

  private when(ts: number): string {
    return `${this.date(ts, 'long')}, ${this.date(ts, 'clock')}`;
  }

  private span(from: number, to: number): string {
    return from === to ? `${this.date(from, 'long')} ${this.year(from)}` : `${this.date(from, 'long')} – ${this.date(to, 'long')} ${this.year(to)}`;
  }

  private hourSpan(h: number): string {
    return `${this.pad(h)}:00–${this.pad(h + 1)}:00`;
  }

  private ticks(top: number): Tick[] {
    const step = top / 4;
    const digits = step >= 1 ? (Math.round(step) === step ? 0 : 1) : 2;
    return [0, 1, 2, 3, 4].map(i => ({ label: this.fmt(step * i, digits), bottom: i * 25 }));
  }

  private path(values: (number | null)[], top: number): string {
    let d = '';
    let pen = false;
    values.forEach((v, j) => {
      if (v === null) {
        pen = false;
        return;
      }
      const x = values.length > 1 ? j / (values.length - 1) * 1000 : 500;
      d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${(300 - v / top * 300).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  private curvePointLabel(curve: Curve, j: number): string {
    return curve.step === 'day' ? `${this.date(curve.ts[j], 'long')} ${this.year(curve.ts[j])}` : this.when(curve.ts[j]);
  }

  private rebuild(): void {
    this.groups = groupByHotel(this.state.meters);
    const extent = this.state.status === 'ready' ? dataExtent(this.state.meters, METER_TIMEZONE) : null;
    this.empty = this.state.status === 'ready' && !extent;
    if (!extent) {
      this.view = null;
      this.computed = null;
      this.resolved = null;
      return;
    }
    const groups = this.selectedGroups();
    const resolved = resolveRange(this.range, extent.first, extent.last, METER_TIMEZONE);
    this.resolved = resolved;
    this.detailReady = this.electricity.isLoaded(resolved.from, resolved.to);

    const key = [groups.map(g => g.index).join(','), resolved.from, resolved.to, this.focus, this.state.revision, this.detailReady].join('|');
    if (key !== this.computedKey || !this.computed) {
      this.computed = computeView(groups, resolved.days, this.focus, METER_TIMEZONE);
      this.computedKey = key;
    }
    this.view = this.present(this.computed, groups, resolved, extent);
    this.electricity.ensureRange(resolved.from, resolved.to);
  }

  private present(v: ElectricityView, groups: HotelGroup[], r: ResolvedRange, extent: { first: number; last: number }): PanelView {
    const nDays = v.days.length;
    const lastDay = v.days[nDays - 1];
    const many = groups.length > 1;
    const detail = this.detailReady;
    const num = (value: number | null, digits: number) => (value === null || !detail ? DASH : this.fmt(value, digits));

    const allOn = groups.length === this.groups.length;
    const hotels = {
      label: allOn ? 'All hotels' : groups.length === 1 ? groups[0].hotel : `${groups.length} of ${this.groups.length} hotels`,
      dots: groups.map(g => this.colorOf(g.index)),
      options: this.groups.map(g => ({
        hotel: g.hotel,
        detail: g.meters.length === 1 ? (g.meters[0].serial ? `No. ${g.meters[0].serial}` : '') : `${g.meters.length} meters`,
        on: this.isOn(g.hotel),
        color: this.colorOf(g.index),
      })),
    };

    const t = v.total;
    const consumptionSub = v.deltaPct !== null
      ? `${v.deltaPct >= 0 ? '+' : '−'}${this.fmt(Math.abs(v.deltaPct), 1)} % vs the ${nDays === 1 ? 'day' : `${nDays} days`} before`
      : v.missing ? `${v.missing} daily ${v.missing === 1 ? 'total is' : 'totals are'} missing`
      : 'No complete earlier period to compare with';
    const kpis: Kpi[] = [
      { label: 'Consumption', value: this.kwh(v.kwh), unit: 'kWh', sub: consumptionSub },
      { label: 'Average per day', value: this.kwh(v.avgDay), unit: 'kWh',
        sub: v.topDay ? `Highest day: ${this.date(v.topDay.day, 'long')}, ${this.kwh(v.topDay.kwh)} kWh` : 'No daily total in this period' },
      { label: 'Peak demand', value: num(t.peak, 1), unit: 'kW',
        sub: !detail ? this.detailNote : t.peak === null ? 'No data' : `${this.when(t.peakTs)}${many ? ', hotels together' : ''}` },
      { label: 'Load factor', value: num(t.loadFactor === null ? null : t.loadFactor * 100, 1), unit: '%', sub: 'Average power divided by peak power' },
      { label: 'Night share', value: num(t.nightShare === null ? null : t.nightShare * 100, 1), unit: '%', sub: 'Used between 22:00 and 06:00' },
      { label: 'Data received', value: num(t.expected ? Math.min(100, t.received / t.expected * 100) : null, 1), unit: '%',
        sub: !detail ? this.detailNote : t.flagged ? `${t.flagged} intervals with a reported outage` : 'No outage reported' },
    ];

    // stacked consumption bars
    const monthly = v.buckets.length > 0 && v.buckets[0].monthly;
    const top = niceTop(Math.max(0, ...v.buckets.map(b => b.total ?? 0)));
    const slot = 100 / v.buckets.length;
    const barWidth = Math.min(slot * 0.72, 7);
    const every = Math.ceil(v.buckets.length / 16);
    const segments: Segment[] = [];
    const hits: BarHit[] = [];
    const labels: string[] = [];
    v.buckets.forEach((b, k) => {
      const name = monthly ? `${this.date(b.from, 'month')} ${this.year(b.from)}` : `${this.date(b.from, 'long')} ${this.year(b.from)}`;
      const lines = [b.total === null ? `${name}: no data` : `${name}: ${this.kwh(b.total)} kWh`];
      const lastWithValue = b.values.reduce((last, value, j) => (value === null ? last : j), -1);
      let sum = 0;
      b.values.forEach((value, j) => {
        if (value === null) return;
        segments.push({
          left: k * slot + (slot - barWidth) / 2, width: barWidth, bottom: sum / top * 100, height: value / top * 100,
          color: this.colorOf(groups[j].index), top: j === lastWithValue, dim: v.focus !== null && v.focus !== b.from,
        });
        sum += value;
        if (many) lines.push(`${groups[j].hotel}: ${this.kwh(value)} kWh`);
      });
      if (b.total !== null && b.missing) lines.push(`${b.missing} daily ${b.missing === 1 ? 'total is' : 'totals are'} missing`);
      hits.push({
        left: k * slot, width: slot, tip: lines.join('\n'), from: b.from, to: b.to, monthly, empty: b.total === null,
        aria: b.total === null ? `${name}, no data` : `${name}, ${this.kwh(b.total)} kilowatt hours`,
      });
      labels.push(k % every === 0 ? (monthly ? this.date(b.from, 'month') : this.short(b.from)) : '');
    });

    const maxShare = Math.max(0, ...v.shares.map(s => s.kwh));
    const shares = v.shares.map(s => ({
      hotel: s.hotel, color: this.colorOf(s.hotelIndex), kwh: this.kwh(s.kwh), share: this.pct(s.share),
      width: maxShare > 0 ? s.kwh / maxShare * 100 : 0,
    }));

    // load curve
    const c = v.curve;
    const byHotel = many && this.mode === 'hotel';
    const lines = (byHotel
      ? c.series.map(s => ({ name: s.hotel, color: this.colorOf(s.hotelIndex), values: s.values }))
      : [{ name: many ? 'Selected hotels together' : groups[0].hotel, color: many ? TOGETHER_COLOR : this.colorOf(groups[0].index), values: c.total }]);
    const curveTop = niceTop(Math.max(0, ...lines.flatMap(l => l.values.map(x => x ?? 0))));
    const n = c.ts.length;
    const at = (j: number) => (n > 1 ? j / (n - 1) * 100 : 50);
    const xTicks: XTick[] = [];
    if (c.step === 'slot') {
      for (let j = 0; j < n; j += 12) xTicks.push({ label: this.date(c.ts[j], 'clock'), left: at(j), shift: j === 0 ? '0' : '-50%' });
    } else {
      const stride = Math.max(1, Math.ceil(nDays / 10));
      for (let k = 0; k < nDays; k += stride) {
        const j = c.step === 'day' ? k : c.ts.findIndex(ts => ts >= v.days[k]);
        if (j >= 0) xTicks.push({ label: this.short(v.days[k]), left: at(j), shift: k === 0 ? '0' : '-50%' });
      }
    }
    const curveSub = c.step === 'slot' ? `${this.span(c.ts[0] ?? v.from, c.ts[0] ?? v.from)}, every 15 minutes, kW`
      : `${this.span(v.from, lastDay)}, ${c.step === 'hour' ? 'hourly' : 'daily'} averages, kW`;

    // heat map
    const h = v.heat;
    const heatEvery = Math.ceil(h.columns.length / 16);
    const cells = h.cells.map((value, i) => {
      const col = h.columns[Math.floor(i / 24)];
      const label = `${h.weekly && col.from !== col.to ? `${this.short(col.from)} – ${this.short(col.to)}` : this.date(col.from, 'long')}, ${this.hourSpan(i % 24)}`;
      if (h.skipped[i]) return { bg: 'transparent', tip: `${label}: skipped by the clock change` };
      if (value === null) return { bg: null, tip: `${label}: no data` };
      const stepIndex = h.max > 0 ? Math.min(RAMP_STEPS - 1, Math.round(value / h.max * (RAMP_STEPS - 1))) : 0;
      return { bg: this.ramp[stepIndex], tip: `${label}: ${this.fmt(value, 1)} kW` };
    });

    // typical day
    const ty = v.typical;
    const typicalTop = niceTop(Math.max(0, ...ty.weekday.map(x => x ?? 0), ...ty.weekend.map(x => x ?? 0)));
    const best = (values: (number | null)[], low: boolean): string => {
      let hit = -1;
      values.forEach((value, hour) => {
        if (value !== null && (hit < 0 || (low ? value < values[hit]! : value > values[hit]!))) hit = hour;
      });
      return hit < 0 ? 'no data' : `${this.hourSpan(hit)}, ${this.fmt(values[hit]!, 1)} kW`;
    };

    const tableRow = (f: Figures, hotel: string, color: string, serial: string, share: string): TableRow => ({
      hotel, color, serial, share,
      kwh: f.kwh === null ? DASH : this.fmt(f.kwh, 1),
      perDay: f.kwh === null || !f.daysWithData ? DASH : this.fmt(f.kwh / f.daysWithData, 1),
      peak: num(f.peak, 2),
      peakAt: detail && f.peak !== null ? this.when(f.peakTs) : '',
      loadFactor: detail ? this.pct(f.loadFactor) : DASH,
      night: detail ? this.pct(f.nightShare) : DASH,
      received: detail ? this.pct(f.expected ? Math.min(1, f.received / f.expected) : null) : DASH,
      outages: detail ? String(f.flagged) : DASH,
    });
    const rows = v.rows.map(row => tableRow(
      row, row.meter.hotel, this.colorOf(row.hotelIndex), row.meter.serial,
      this.pct(v.kwh && row.kwh !== null ? row.kwh / v.kwh : null)));

    // monthly totals as one flat grid
    const mt = v.months;
    const monthCells: { text: string; sub: string; kind: string }[] = [{ text: 'Hotel', sub: '', kind: 'head left' }];
    for (const m of mt.months) {
      const [year, month] = m.key.split('-').map(Number);
      monthCells.push({
        text: `${this.date(Date.UTC(year, month - 1, 15), 'month')} ${year}`,
        sub: m.days === m.daysInMonth ? 'full month' : `${m.days} of ${m.daysInMonth} days`, kind: 'head',
      });
    }
    monthCells.push({ text: 'All on record', sub: `${mt.days} days`, kind: 'head' });
    for (const row of mt.rows) {
      monthCells.push({ text: row.hotel, sub: '', kind: 'body left' });
      row.values.forEach(value => monthCells.push({ text: value === null ? DASH : this.fmt(value, 1), sub: '', kind: 'body' }));
      monthCells.push({ text: this.fmt(row.total, 1), sub: '', kind: 'body strong' });
    }
    if (mt.rows.length > 1) {
      monthCells.push({ text: 'Selected hotels together', sub: '', kind: 'foot left' });
      mt.totals.forEach(value => monthCells.push({ text: value === null ? DASH : this.fmt(value, 1), sub: '', kind: 'foot' }));
      monthCells.push({ text: this.fmt(mt.grand, 1), sub: '', kind: 'foot' });
    }

    const events = v.events.map(e => {
      const sameDay = dayKey(e.end - 1, METER_TIMEZONE) === dayKey(e.start, METER_TIMEZONE);
      const hoursPart = e.minutes >= 60 ? `${Math.floor(e.minutes / 60)} h ` : '';
      return {
        when: `${this.when(e.start)}–${sameDay ? this.date(e.end, 'clock').replace(/^00:00$/, '24:00') : this.when(e.end)}`,
        hotel: e.hotel,
        color: this.colorOf(e.hotelIndex),
        duration: `${hoursPart}${e.minutes % 60 ? `${e.minutes % 60} min` : ''}`.trim(),
        low: e.low === null ? '' : this.fmt(e.low, 2),
        codes: e.codes.join(', '),
      };
    });

    return {
      periodLabel: nDays === 1 ? this.span(v.from, v.from) : `${this.span(v.from, lastDay)} · ${nDays} days`,
      many,
      hotels,
      range: {
        stepping: this.range.period !== 'custom', canPrev: r.canPrev, canNext: r.canNext, custom: this.range.period === 'custom',
        from: dayKey(v.from, METER_TIMEZONE), to: dayKey(lastDay, METER_TIMEZONE),
        min: dayKey(extent.first, METER_TIMEZONE), max: dayKey(extent.last, METER_TIMEZONE),
      },
      kpis,
      bars: {
        title: monthly ? 'Consumption per month' : 'Consumption per day',
        hint: monthly ? 'kWh per month. Click a month to open it.'
          : nDays === 1 ? 'kWh on the selected day' : 'kWh per day. Click a day to open its 15-minute curve below.',
        ticks: this.ticks(top), segments, hits, labels,
      },
      shares,
      curve: {
        sub: curveSub, focused: v.focus !== null, ticks: this.ticks(curveTop), xTicks, bands: c.bands.map(b => ({ left: b.left * 100, width: Math.max(b.width * 100, 0.4) })),
        lines: lines.map(l => ({ ...l, d: this.path(l.values, curveTop) })), showTogether: byHotel,
        hasData: lines.some(l => l.values.some(x => x !== null)),
      },
      heat: {
        sub: `Average kW for every hour of ${h.weekly ? 'every week' : 'every day'}${many ? ', selected hotels together' : ''}`,
        columns: h.columns.length, cells,
        labels: h.columns.map((col, i) => (i % heatEvery === 0 ? this.short(col.from) : '')),
        maxLabel: `${this.fmt(h.max, 1)} kW`,
      },
      typical: {
        ticks: this.ticks(typicalTop), weekday: this.path(ty.weekday, typicalTop), weekend: this.path(ty.weekend, typicalTop),
        weekdayPeak: best(ty.weekday, false), weekendPeak: best(ty.weekend, false), base: best(ty.all, true),
      },
      rows,
      total: tableRow(t, 'Selected hotels together', '', '', v.kwh === null ? DASH : '100 %'),
      months: { columns: `minmax(130px, 1.5fr) repeat(${mt.months.length + 1}, minmax(96px, 1fr))`, cells: monthCells },
      events,
      quality: detail ? `${this.fmt(t.received, 0)} of ${this.fmt(t.expected, 0)} intervals received` : '',
    };
  }

  get detailNote(): string {
    return this.state.failed ? 'Some meter data could not be loaded.' : 'Loading 15-minute data…';
  }
}
