import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { HOTEL_TIMEZONE } from '../../core/models/dashboard.config';
import { TranslationService, TranslationSet } from '../../core/services/translation.service';
import {
  DAY_MS, HOUR_MS, MAX_RANGE_DAYS, UtilityMeter, UtilitySummary, UsualStatus,
  buildRangeSeries, buildSeries, dayKey, dayStartOf, hourOfDay, humanizeType, isMeterOffline, mergeHours, nextDay, niceCeil, staleAfter,
  startOfDay, utilityDef, utilityModelShort,
} from '../../core/utilities/utilities.core';
import { UtilitiesService, UtilitiesState } from '../../core/utilities/utilities.service';

interface CardView { typeId: string; name: string; meters: string; icon: string; unit: string; reading: string; pct: number | null; ringPct: number; ringColor: string; today: string; status: string; statusColor: string; on: boolean; }
interface AttentionView { typeId: string; title: string; detail: string; icon: string; alert: boolean; }
interface BarView { h: number; label: string; value: string; tick: string; }
interface StatView { label: string; value: string; unit: string; }
interface MeterLineView { id: string; name: string; model: string; offline: boolean; status: string; reading: string; seen: string; }

type LabelStyle = 'hour' | 'day' | 'dayHour' | 'date';

const PERIODS = [1, 7, 30];
const RANGE_LOOKBACK_DAYS = 365;
const LABEL_FORMATS: Record<LabelStyle, Intl.DateTimeFormatOptions> = {
  hour: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  day: { day: 'numeric', month: 'short' },
  dayHour: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  date: { day: 'numeric', month: 'short', year: 'numeric' },
};

@Component({
  selector: 'tb-utilities-panel',
  templateUrl: './utilities-panel.component.html',
  styleUrls: ['./utilities-panel.component.scss'],
  standalone: false,
})
export class UtilitiesPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() open = false;
  @Input() hotelName = '';
  @Input() occupiedRooms = 0;
  @Output() closed = new EventEmitter<void>();

  readonly periods = PERIODS;
  state: UtilitiesState = { status: 'none', meters: [], summaries: [], issueCount: 0, historyLoading: false, historyFrom: 0 };
  period = 7;
  range: { from: number; to: number } | null = null;
  rangeOpen = false;
  rangeStart = '';
  rangeEnd = '';
  rangeMin = '';
  rangeMax = '';
  rangeLoading = false;
  typeId: string | null = null;
  meterId: string | null = null;
  hover: number | null = null;

  cards: CardView[] = [];
  attention: AttentionView[] = [];
  bars: BarView[] = [];
  stats: StatView[] = [];
  meterLines: MeterLineView[] = [];
  meterTabs: { id: string | null; label: string }[] = [];
  yLabels: string[] = [];
  selectedName = '';
  selectedUnit = '';
  totalText = '';
  deltaUp = false;
  deltaText = '';
  hasSeries = false;
  liveCount = 0;
  meterCount = 0;

  private subs = new Subscription();
  private labelFormats = new Map<string, Intl.DateTimeFormat>();

  constructor(
    private utilities: UtilitiesService,
    private translation: TranslationService,
    private cd: ChangeDetectorRef,
  ) {}

  get t(): TranslationSet { return this.translation.t; }
  get allReporting(): boolean { return this.liveCount === this.meterCount; }
  get tip(): BarView | null { return this.hover !== null ? this.bars[this.hover] ?? null : null; }
  get rangeValid(): boolean { return this.pickedRange() !== null; }
  get rangeHint(): string { return this.t.utRangeLimit.replace('{n}', String(MAX_RANGE_DAYS)); }
  get tipLeft(): number { return Math.min(88, Math.max(12, ((this.hover! + 0.5) / this.bars.length) * 100)); }

  ngOnInit(): void {
    this.subs.add(this.utilities.state$.subscribe(s => {
      this.state = s;
      this.rebuild();
      this.cd.markForCheck();
    }));
    this.subs.add(this.translation.activeLangCode$.subscribe(() => {
      this.rebuild();
      this.cd.markForCheck();
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) this.utilities.setPanelOpen(this.open);
    this.rebuild();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.rangeOpen) this.rangeOpen = false;
    else if (this.open) this.close();
  }

  @HostListener('document:mousedown', ['$event'])
  onOutside(event: Event): void {
    if (this.rangeOpen && !(event.target as Element | null)?.closest?.('.ut-range')) this.rangeOpen = false;
  }

  close(): void {
    this.hover = null;
    this.rangeOpen = false;
    this.closed.emit();
  }

  onScrim(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  retry(): void {
    this.utilities.retry();
  }

  pickPeriod(period: number): void {
    this.period = period;
    this.range = null;
    this.rangeOpen = false;
    this.hover = null;
    this.rebuild();
  }

  toggleRange(): void {
    this.rangeOpen = !this.rangeOpen;
    if (!this.rangeOpen) return;
    const noon = startOfDay(Date.now(), HOTEL_TIMEZONE) + 12 * HOUR_MS;
    this.rangeMax = dayKey(noon, HOTEL_TIMEZONE);
    this.rangeMin = dayKey(noon - RANGE_LOOKBACK_DAYS * DAY_MS, HOTEL_TIMEZONE);
    if (!this.rangeStart || !this.rangeEnd) {
      this.rangeStart = dayKey(noon - 6 * DAY_MS, HOTEL_TIMEZONE);
      this.rangeEnd = this.rangeMax;
    }
  }

  applyRange(): void {
    const picked = this.pickedRange();
    if (!picked) return;
    this.range = picked;
    this.rangeOpen = false;
    this.hover = null;
    this.utilities.ensureSince(2 * picked.from - picked.to);
    this.rebuild();
  }

  private pickedRange(): { from: number; to: number } | null {
    const from = dayStartOf(this.rangeStart, HOTEL_TIMEZONE);
    const last = dayStartOf(this.rangeEnd, HOTEL_TIMEZONE);
    const min = dayStartOf(this.rangeMin, HOTEL_TIMEZONE);
    const max = dayStartOf(this.rangeMax, HOTEL_TIMEZONE);
    if (from === null || last === null || min === null || max === null || from > last || from < min || last > max) return null;
    const to = nextDay(last, HOTEL_TIMEZONE);
    return to - from <= MAX_RANGE_DAYS * DAY_MS + HOUR_MS ? { from, to } : null;
  }

  pickType(typeId: string): void {
    this.typeId = typeId;
    this.meterId = null;
    this.hover = null;
    this.rebuild();
  }

  pickMeter(id: string | null): void {
    this.meterId = id;
    this.hover = null;
    this.rebuild();
  }

  periodShort(period: number): string {
    return this.text(`utPeriod${period}`);
  }

  get periodLong(): string {
    if (!this.range) return this.text(`utPeriodLong${this.period}`);
    const first = this.timeLabel(this.range.from, 'date');
    const last = this.timeLabel(this.range.to - 1, 'date');
    return first === last ? first : `${first} – ${last}`;
  }

  trackId(_i: number, item: { id: string | null }): string | null { return item.id; }
  trackType(_i: number, item: { typeId: string }): string { return item.typeId; }
  trackIndex(i: number): number { return i; }

  private text(key: string): string {
    return this.t[key as keyof TranslationSet] as string;
  }

  private typeName(typeId: string): string {
    const key = utilityDef(typeId).nameKey;
    return key ? this.text(key) : humanizeType(typeId);
  }

  private unit(unit: string): string {
    if (!unit) return '';
    return this.text(`utUnit${unit.charAt(0).toUpperCase()}${unit.slice(1)}`);
  }

  private get lang(): string {
    return this.translation.activeLangCode === 'RU' ? 'ru-RU' : 'en-GB';
  }

  private fmt(v: number | null): string {
    if (v === null) return '—';
    const a = Math.abs(v);
    const digits = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    return v.toLocaleString(this.lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  /** Meter counter as on the device: m³ with litres (3 decimals), kWh with 1 decimal. */
  private fmtReading(v: number, unit: string): string {
    const digits = unit === 'm3' ? 3 : 1;
    return v.toLocaleString(this.lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  private ago(ts: number, now: number): string {
    if (!ts) return this.t.utNeverReported;
    const minutes = Math.max(0, Math.round((now - ts) / 60000));
    if (minutes < 60) return `${minutes}${this.t.utMinAgo}`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}${this.t.utHourAgo}`;
    return `${Math.round(hours / 24)}${this.t.utDayAgo}`;
  }

  private statusView(status: UsualStatus): { text: string; color: string } {
    switch (status) {
      case 'high': return { text: this.t.utHigh, color: 'var(--alert)' };
      case 'above': return { text: this.t.utAbove, color: 'var(--warn)' };
      case 'below': return { text: this.t.utBelow, color: 'var(--accent)' };
      case 'usual': return { text: this.t.utUsual, color: 'var(--ok)' };
      default: return { text: this.t.utNoBaseline, color: 'var(--t3)' };
    }
  }

  private timeLabel(ts: number, style: LabelStyle): string {
    const key = `${this.lang}|${style}`;
    let format = this.labelFormats.get(key);
    if (!format) {
      format = new Intl.DateTimeFormat(this.lang, { ...LABEL_FORMATS[style], timeZone: HOTEL_TIMEZONE });
      this.labelFormats.set(key, format);
    }
    return format.format(ts);
  }

  private rebuild(): void {
    if (!this.open) return;
    const now = Date.now();
    const summaries = this.state.summaries;
    if (!summaries.some(s => s.typeId === this.typeId)) {
      this.typeId = summaries[0]?.typeId ?? null;
      this.meterId = null;
    }
    this.meterCount = this.state.meters.length;
    this.liveCount = this.state.meters.filter(m => !isMeterOffline(m, now)).length;
    this.cards = summaries.map(s => this.card(s));
    this.attention = summaries.flatMap(s => this.attentionOf(s, now));

    const selected = summaries.find(s => s.typeId === this.typeId);
    if (selected) this.buildSelected(selected, now);
    else {
      this.bars = [];
      this.stats = [];
      this.meterLines = [];
      this.meterTabs = [];
      this.hasSeries = false;
    }
  }

  private card(s: UtilitySummary): CardView {
    const def = utilityDef(s.typeId);
    const st = this.statusView(s.status);
    const ringColor = s.pct !== null && s.pct > 105 ? st.color : 'var(--accent)';
    const totals = s.meters.map(m => m.total).filter((v): v is number => v !== null);
    return {
      typeId: s.typeId,
      name: this.typeName(s.typeId),
      meters: [...new Set(s.meters.map(m => utilityModelShort(m.model) || m.name))].join(', '),
      icon: def.icon,
      unit: this.unit(def.unit),
      reading: totals.length ? this.fmtReading(totals.reduce((a, b) => a + b, 0), def.unit) : '—',
      pct: s.pct,
      ringPct: s.pct === null ? 0 : Math.min(100, s.pct),
      ringColor,
      today: this.fmt(s.today),
      status: st.text,
      statusColor: st.color,
      on: s.typeId === this.typeId,
    };
  }

  private attentionOf(s: UtilitySummary, now: number): AttentionView[] {
    const name = this.typeName(s.typeId);
    return s.issues.map(issue => {
      if (issue.kind === 'leak') {
        return { typeId: s.typeId, alert: true, icon: 'warning', title: `${name}: ${this.t.utLeakTitle}`, detail: this.t.utLeakDetail };
      }
      if (issue.kind === 'high') {
        return { typeId: s.typeId, alert: false, icon: 'warning', title: `${name}: ${this.t.utHighTitle}`, detail: this.t.utHighDetail.replace('{n}', String(issue.pct)) };
      }
      const meter = s.meters.find(m => m.id === issue.meterId)!;
      return {
        typeId: s.typeId,
        alert: false,
        icon: 'wifi_off',
        title: `${name}: ${meter.name} ${this.t.utOfflineTitle}`,
        detail: meter.lastTs ? `${this.t.utLastReading} ${this.ago(meter.lastTs, now)}` : this.t.utNeverReported,
      };
    });
  }

  private buildSelected(s: UtilitySummary, now: number): void {
    const def = utilityDef(s.typeId);
    const unit = this.unit(def.unit);
    const rateUnit = this.unit(def.rateUnit);
    const multi = s.meters.length > 1;
    const picked: UtilityMeter | undefined = multi ? s.meters.find(m => m.id === this.meterId) : undefined;
    if (!picked) this.meterId = null;
    const scope = picked ? [picked] : s.meters;
    const hours = mergeHours(scope.map(m => m.hours));
    const range = this.range;
    const series = range
      ? buildRangeSeries(hours, range.from, range.to, now, HOTEL_TIMEZONE)
      : buildSeries(hours, this.period, now, HOTEL_TIMEZONE);
    const days = range ? Math.max(1, Math.round((range.to - range.from) / DAY_MS)) : this.period;
    this.rangeLoading = !!range && (!this.state.historyFrom || this.state.historyFrom > range.from);

    this.selectedName = this.typeName(s.typeId) + (picked ? `, ${picked.name}` : '');
    this.selectedUnit = unit;
    this.totalText = this.rangeLoading ? '—' : this.fmt(series.total);
    this.hasSeries = series.hasData;
    if (!this.rangeLoading && series.prevTotal && series.prevTotal > 0) {
      const delta = Math.round((series.total / series.prevTotal - 1) * 100);
      this.deltaUp = delta >= 0;
      this.deltaText = `${Math.abs(delta)}${this.t.utVsPrevious}`;
    } else {
      this.deltaText = '';
    }

    const max = Math.max(0, ...series.buckets.map(b => b.value));
    const yMax = niceCeil(max);
    const n = series.buckets.length;
    const step = series.hourly ? (n > 25 ? 12 : 6) : n <= 10 ? 1 : Math.ceil(n / 7);
    const manyDays = series.hourly && n > 25;
    const style: LabelStyle = manyDays ? 'dayHour' : series.hourly ? 'hour' : 'day';
    this.bars = series.buckets.map((b, i) => {
      const label = this.timeLabel(b.ts, style);
      const shown = (range ? i : n - 1 - i) % step === 0;
      const tick = manyDays ? this.timeLabel(b.ts, hourOfDay(b.ts, HOTEL_TIMEZONE) === 0 ? 'day' : 'hour') : label;
      return { h: (b.value / yMax) * 100, label, value: this.fmt(b.value), tick: shown ? tick : '' };
    });
    this.yLabels = [this.fmt(yMax), this.fmt(yMax / 2), '0'];
    this.meterTabs = multi
      ? [{ id: null, label: this.t.utAll }, ...s.meters.map(m => ({ id: m.id as string | null, label: m.name }))]
      : [];

    const peak = series.buckets.reduce((a, b) => (b.value > a.value ? b : a), series.buckets[0]);
    this.stats = [
      { label: this.t.utNow, value: this.fmt(this.currentRate(scope, hours, now)), unit: rateUnit },
      ...(this.occupiedRooms > 0
        ? [{ label: this.t.utPerRoom, value: this.fmt(series.total / this.occupiedRooms / days), unit }]
        : []),
      { label: this.t.utNight, value: series.nightShare === null ? '—' : `${Math.round(series.nightShare * 100)}%`, unit: this.t.utOfTotal },
      { label: `${this.t.utPeak}, ${this.timeLabel(peak.ts, style)}`, value: this.fmt(peak.value), unit },
    ];

    this.meterLines = s.meters.map(m => {
      const offline = isMeterOffline(m, now);
      return {
        id: m.id,
        name: m.name,
        model: m.model,
        offline,
        status: offline ? this.t.utNoData : this.t.utOnline,
        reading: m.total === null ? '—' : `${this.fmtReading(m.total, def.unit)} ${unit}`.trim(),
        seen: this.ago(m.lastTs, now),
      };
    });
  }

  private currentRate(scope: UtilityMeter[], hours: { ts: number; use: number }[], now: number): number | null {
    const live = scope.filter(m => !isMeterOffline(m, now));
    if (!live.length) return null;
    if (live.every(m => m.rate !== null)) return live.reduce((a, m) => a + (m.rate as number), 0);
    const last = hours[hours.length - 1];
    const fresh = Math.max(...live.map(m => staleAfter(m)));
    return last && now - (last.ts + HOUR_MS) <= fresh ? last.use : null;
  }
}
