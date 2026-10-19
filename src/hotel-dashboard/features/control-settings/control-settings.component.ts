import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslationService, TranslationSet } from '../../core/services/translation.service';
import { ControlSettingsService, ControlSettingsState } from '../../core/settings/control-settings.service';
import { effective, validate } from '../../core/settings/control-settings.core';
import {
  FIELD_BY_KEY, KEY_PAIRS, SETTINGS_SECTIONS, SectionId, SettingSection, SettingValue,
} from '../../core/settings/control-settings.schema';

interface AdvancedGroup {
  titleKey: keyof TranslationSet;
  rows: { key: string; hintKey?: keyof TranslationSet }[];
}

interface OfflineRow {
  key: string;
  rateKey: keyof TranslationSet;
}

interface SwitchRow {
  key: string;
  hintKey?: keyof TranslationSet;
}

@Component({
  selector: 'tb-control-settings',
  templateUrl: './control-settings.component.html',
  styleUrls: ['./control-settings.component.scss'],
  standalone: false,
})
export class ControlSettingsComponent implements OnInit, OnDestroy {
  @Input() open = false;
  @Input() hotelName = '';
  @Output() closed = new EventEmitter<void>();

  readonly sections = SETTINGS_SECTIONS;
  readonly F = FIELD_BY_KEY;

  readonly modes: { id: string; labelKey: keyof TranslationSet; helpKey: keyof TranslationSet }[] = [
    { id: 'off', labelKey: 'csModeOff', helpKey: 'csModeOffShort' },
    { id: 'safe', labelKey: 'csModeSafe', helpKey: 'csModeSafeShort' },
    { id: 'live', labelKey: 'csModeLive', helpKey: 'csModeLiveShort' },
  ];

  readonly temps: { key: string; icon: string; hintKey: keyof TranslationSet }[] = [
    { key: 'heat_comfort_temp', icon: 'wb_sunny', hintKey: 'csComfortHint' },
    { key: 'heat_eco_temp', icon: 'eco', hintKey: 'csEcoHint' },
    { key: 'heat_boost_temp', icon: 'bolt', hintKey: 'csBoostHint' },
  ];

  readonly advanced: AdvancedGroup[] = [
    { titleKey: 'csAdvBoost', rows: [
      { key: 'heat_boost_delta', hintKey: 'csAdvBoostDeltaHint' },
      { key: 'heat_boost_exit_margin' },
      { key: 'heat_boost_max_min' },
    ] },
    { titleKey: 'csAdvPreheat', rows: [
      { key: 'heat_turnover_gap_min', hintKey: 'csAdvTurnoverHint' },
      { key: 'heat_preheat_rate_warm' },
      { key: 'heat_preheat_rate_mild' },
      { key: 'heat_preheat_rate_cold' },
      { key: 'heat_preheat_min' },
      { key: 'heat_preheat_max_min', hintKey: 'csAdvPreheatMaxHint' },
    ] },
    { titleKey: 'csAdvAdjust', rows: [
      { key: 'heat_adjust_max', hintKey: 'csAdvAdjustMaxHint' },
      { key: 'heat_adjust_every_min' },
      { key: 'heat_room_sensor_stale_min' },
      { key: 'heat_lookahead_min', hintKey: 'csAdvLookaheadHint' },
    ] },
    { titleKey: 'csAdvSeason', rows: [
      { key: 'heat_season_outdoor_temp', hintKey: 'csAdvSeasonHint' },
      { key: 'heat_season_start' },
      { key: 'heat_season_end' },
      { key: 'heat_latitude' },
      { key: 'heat_longitude' },
    ] },
  ];

  readonly offlineRows: OfflineRow[] = [
    { key: 'offline_am308_min', rateKey: 'csOffRate8' },
    { key: 'offline_ws302_min', rateKey: 'csOffRate8' },
    { key: 'offline_wt101_min', rateKey: 'csOffRate10' },
    { key: 'offline_ws523_min', rateKey: 'csOffRate12' },
    { key: 'offline_vs370_min', rateKey: 'csOffRateDaily' },
    { key: 'offline_ws301_min', rateKey: 'csOffRateDaily' },
    { key: 'offline_ws303_min', rateKey: 'csOffRateDaily' },
  ];

  readonly telegramRows: SwitchRow[] = [
    { key: 'telegram_alert_water', hintKey: 'csTgWaterHint' },
    { key: 'telegram_alert_noise', hintKey: 'csTgDelayHint' },
    { key: 'telegram_alert_temp' },
    { key: 'telegram_alert_humidity' },
    { key: 'telegram_alert_co2', hintKey: 'csTgDelayHint' },
    { key: 'telegram_alert_battery', hintKey: 'csTgBatteryHint' },
    { key: 'telegram_alert_socket', hintKey: 'csTgWaterHint' },
    { key: 'telegram_alert_window', hintKey: 'csTgWindowHint' },
    { key: 'telegram_alert_offline', hintKey: 'csTgOfflineHint' },
  ];

  activeId: SectionId = 'heating';
  draft: Record<string, unknown> = {};
  errors: Record<string, string> = {};
  showAdvanced = false;
  bulkState: 'idle' | 'sent' | 'failed' = 'idle';
  toast = '';
  state: ControlSettingsState = { status: 'idle', hotel: {}, saving: false };

  private subs = new Subscription();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private bulkTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private settings: ControlSettingsService,
    private translation: TranslationService,
    private cd: ChangeDetectorRef,
  ) {}

  get t(): TranslationSet { return this.translation.t; }
  get section(): SettingSection { return this.sections.find(s => s.id === this.activeId)!; }
  get changeCount(): number { return Object.keys(this.draft).length; }
  get editable(): boolean { return this.state.status === 'ready'; }
  get hasErrors(): boolean { return Object.keys(this.errors).length > 0; }
  get hasBridge(): boolean { return this.settings.hasBridge; }
  get noWindowLimit(): boolean { return this.cur('window_open_max_min') === null; }

  ngOnInit(): void {
    this.subs.add(this.settings.state$.subscribe(s => {
      this.state = s;
      this.cd.markForCheck();
    }));
    this.subs.add(this.translation.activeLangCode$.subscribe(() => this.cd.markForCheck()));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  text(key: keyof TranslationSet): string { return this.t[key] as string; }
  label(key: string): string { return this.text(this.F[key].labelKey); }
  errText(code: string): string { return this.text(('csErr_' + code) as keyof TranslationSet) || code; }
  unit(key: string): string { return this.F[key].unit || ''; }

  cur(key: string): SettingValue {
    if (key in this.draft) return this.draft[key] as SettingValue;
    return effective(this.F[key], this.state.hotel).value;
  }

  isOn(key: string): boolean { return this.cur(key) !== false; }
  isChanged(key: string): boolean { return key in this.draft; }

  sectionDirty(id: SectionId): boolean {
    const s = this.sections.find(x => x.id === id)!;
    return s.fields.some(f => f.key in this.draft);
  }

  setNum(key: string, raw: string): void {
    this.apply(key, raw === '' ? null : Number(raw));
  }

  setValue(key: string, value: unknown): void {
    this.apply(key, value);
  }

  stepTemp(key: string, dir: number): void {
    const f = this.F[key];
    const base = Number(this.cur(key) ?? f.def ?? 20);
    const next = Math.round((base + dir * (f.step ?? 0.5)) * 2) / 2;
    this.apply(key, Math.min(f.max ?? 30, Math.max(f.min ?? 5, next)));
  }

  pick(sectionId: SectionId): void {
    this.activeId = sectionId;
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  cancel(): void {
    this.draft = {};
    this.errors = {};
  }

  close(): void {
    this.closed.emit();
  }

  async save(): Promise<void> {
    if (!this.editable || this.hasErrors || !this.changeCount) return;
    const res = await this.settings.save(this.draft);
    if (res.ok) {
      this.draft = {};
      this.errors = {};
      this.flash(this.text('csSaved'));
    } else if (res.errors['_']) {
      this.flash(this.text('csSaveFailed'));
    } else {
      this.errors = res.errors;
    }
    this.cd.markForCheck();
  }

  async bulk(mode: 'auto' | 'manual'): Promise<void> {
    this.bulkState = 'sent';
    const ok = await this.settings.bulkThermostats(mode);
    this.bulkState = ok ? 'sent' : 'failed';
    if (this.bulkTimer) clearTimeout(this.bulkTimer);
    this.bulkTimer = setTimeout(() => {
      this.bulkState = 'idle';
      this.cd.markForCheck();
    }, 3000);
    this.cd.markForCheck();
  }

  trackKey(_i: number, item: { key: string }): string { return item.key; }
  trackId(_i: number, item: { id: string }): string { return item.id; }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.bulkTimer) clearTimeout(this.bulkTimer);
  }

  private apply(key: string, value: unknown): void {
    const base = effective(this.F[key], this.state.hotel).value;
    const stored = this.state.hotel[key];
    const unchanged = value === base && (value !== null || stored === undefined || stored === null);
    if (unchanged) delete this.draft[key]; else this.draft[key] = value;
    this.revalidate();
  }

  private revalidate(): void {
    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.draft)) {
      if (value === null) continue;
      const err = validate(this.F[key], value);
      if (err) errors[key] = err;
    }
    for (const [lo, hi] of KEY_PAIRS) {
      if (!(lo in this.draft) && !(hi in this.draft)) continue;
      const l = this.cur(lo);
      const h = this.cur(hi);
      if (typeof l === 'number' && typeof h === 'number' && l >= h) {
        errors[lo] = 'order';
        errors[hi] = 'order';
      }
    }
    this.errors = errors;
  }

  private flash(message: string): void {
    this.toast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.cd.markForCheck();
    }, 3200);
  }
}
