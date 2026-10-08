import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ThermostatDevice } from '../../../core/models/room-card.models';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-thermostat-card',
  templateUrl: './thermostat-card.component.html',
  styleUrls: ['./thermostat-card.component.scss'],
  standalone: false
})
export class ThermostatCardComponent {
  @Input() trv!: ThermostatDevice;
  @Input() index = 1;
  /** The per-card settings panel is kept for the room-level settings; its button is off for now */
  @Input() settingsButton = false;

  @Output() modeChange = new EventEmitter<string>();
  @Output() tempChange = new EventEmitter<number>();
  @Output() settingChange = new EventEmitter<{ key: string; value: boolean | number }>();
  @Output() linkedChange = new EventEmitter<{ linked: boolean; copy: boolean }>();

  settingsOpen = false;
  /** Re-linking from this thermostat: ask whether its settings should be copied to the others */
  copyPrompt = false;

  constructor(private cdr: ChangeDetectorRef, private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  getLinkQualityText(lqi: number | null): string {
    if (lqi == null) return '--';
    if (lqi >= 150) return this.t.excellent;
    if (lqi >= 100) return this.t.good;
    if (lqi >= 50) return this.t.fair;
    return this.t.poor;
  }

  getTrvColor(): string {
    if (!this.trv) return '#8E8E93';
    const mode = this.trv.runningState || this.trv.systemMode;
    if (mode === 'off' || mode === 'fan') return '#8E8E93';
    if (mode === 'heat' || mode === 'heating') return '#FF9500';
    if (mode === 'cool' || mode === 'cooling' || mode === 'idle') return '#06B6D4';
    return '#34C759';
  }

  /** Valve opening drawn as an arc around the room temperature (r = 42) */
  get ringDash(): string {
    const circumference = 2 * Math.PI * 42;
    const heating = ['heat', 'heating'].includes(String(this.trv?.runningState || '').toLowerCase());
    const pct = heating && this.trv?.valveOpening != null ? Math.min(100, Math.max(0, Number(this.trv.valveOpening))) : 0;
    return `${((circumference * pct) / 100).toFixed(1)} ${circumference.toFixed(1)}`;
  }

  get runLabel(): string {
    const state = this.trv?.runningState;
    return state && state !== 'unknown' ? this.getRunningStateLabel(state) : '--';
  }

  getRunningStateLabel(state: string): string {
    if (!state) return '';
    const s = state.toLowerCase();
    if (s === 'heat' || s === 'heating') return this.t.heating;
    if (s === 'cool' || s === 'cooling') return this.t.cooling;
    if (s === 'idle') return this.t.idle;
    if (s === 'off') return this.t.off;
    if (s === 'auto') return this.t.auto || 'Auto';
    return state;
  }

  // ── Battery helpers ──

  getBatteryLabel(trv: any): string {
    if (trv.batteryLow === true) return 'Low';
    if (trv.battery != null && !isNaN(trv.battery)) return trv.battery + '%';
    if (trv.batteryLow === false && (trv.battery == null || isNaN(trv.battery))) return 'Good';
    return '--';
  }

  getBatteryBg(trvOrBattery: any): string {
    const bat = typeof trvOrBattery === 'object' && trvOrBattery !== null ? trvOrBattery.battery : trvOrBattery;
    const batLow = typeof trvOrBattery === 'object' && trvOrBattery !== null ? trvOrBattery.batteryLow : null;

    if (batLow === true) return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (batLow === false && (bat == null || isNaN(bat))) return 'var(--ok-soft, rgba(52,211,153,.13))';
    if (bat == null || isNaN(bat)) return 'var(--panel2, #1a2230)';
    if (bat <= 20) return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (bat <= 50) return 'var(--warn-soft, rgba(245,181,74,.13))';
    return 'var(--ok-soft, rgba(52,211,153,.13))';
  }

  getBatteryColor(trvOrBattery: any): string {
    const bat = typeof trvOrBattery === 'object' && trvOrBattery !== null ? trvOrBattery.battery : trvOrBattery;
    const batLow = typeof trvOrBattery === 'object' && trvOrBattery !== null ? trvOrBattery.batteryLow : null;

    if (batLow === true) return 'var(--alert, #f87171)';
    if (batLow === false && (bat == null || isNaN(bat))) return 'var(--ok, #34d399)';
    if (bat == null || isNaN(bat)) return 'var(--t3, #5c6675)';
    if (bat <= 20) return 'var(--alert, #f87171)';
    if (bat <= 50) return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  getBatteryIcon(trvOrBattery: any): string {
    const bat = typeof trvOrBattery === 'object' && trvOrBattery !== null ? trvOrBattery.battery : trvOrBattery;
    const batLow = typeof trvOrBattery === 'object' && trvOrBattery !== null ? trvOrBattery.batteryLow : null;

    if (batLow === true) return 'battery_alert';
    if (batLow === false && (bat == null || isNaN(bat))) return 'battery_std';
    if (bat == null || isNaN(bat)) return 'battery_unknown';
    if (bat <= 10) return 'battery_alert';
    if (bat <= 25) return 'battery_2_bar';
    if (bat <= 50) return 'battery_4_bar';
    if (bat <= 75) return 'battery_5_bar';
    return 'battery_full';
  }

  // ── Signal helpers ──

  getSignalBg(lqi: number | null): string {
    if (lqi == null) return 'var(--panel2, #1a2230)';
    if (lqi < 50) return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (lqi < 100) return 'var(--warn-soft, rgba(245,181,74,.13))';
    return 'var(--ok-soft, rgba(52,211,153,.13))';
  }

  getSignalColor(lqi: number | null): string {
    if (lqi == null) return 'var(--t3, #5c6675)';
    if (lqi < 50) return 'var(--alert, #f87171)';
    if (lqi < 100) return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  // ── +/- Stepper ──

  /** +/- stay inside the target range configured on the device (WT101 accepts whole degrees only) */
  get tempMin(): number {
    return this.setting('wt_temp_range_min')?.value ?? 5;
  }

  get tempMax(): number {
    return this.setting('wt_temp_range_max')?.value ?? 35;
  }

  incrementTemp(): void {
    if (!this.trv || this.trv.systemMode === 'off') return;
    const cur = Number(this.trv.targetTemp ?? 20);
    const next = Math.min(this.tempMax, Math.round(cur + 1));
    this.trv.targetTemp = next;
    this.cdr.detectChanges();
    this.tempChange.emit(next);
  }

  decrementTemp(): void {
    if (!this.trv || this.trv.systemMode === 'off') return;
    const cur = Number(this.trv.targetTemp ?? 20);
    const next = Math.max(this.tempMin, Math.round(cur - 1));
    this.trv.targetTemp = next;
    this.cdr.detectChanges();
    this.tempChange.emit(next);
  }

  // ── Mode (WT101: temperature control auto / manual, or disabled) ──

  get modeOptions(): { id: string; label: string; icon: string }[] {
    return [
      { id: 'auto', label: this.t.auto, icon: 'autorenew' },
      { id: 'manual', label: this.t.manual, icon: 'tune' },
      { id: 'off', label: this.t.off, icon: 'power_settings_new' },
    ];
  }

  selectMode(id: string): void {
    if (!this.trv || this.trv.systemMode === id) return;
    this.modeChange.emit(id);
  }

  syncIcon(sync: string | null | undefined): string {
    return sync === 'confirmed' ? 'check_circle' : sync === 'pending' ? 'sync' : 'warning';
  }

  // ── Settings (child lock, target range, open window detection, freeze protection) ──

  get toggleSettings(): { key: string; label: string; icon: string }[] {
    return [
      { key: 'wt_child_lock', label: this.t.childLock, icon: 'lock' },
      { key: 'wt_open_window_detection', label: this.t.openWindowDetect, icon: 'window' },
      { key: 'wt_freeze_protection', label: this.t.freezeProtection, icon: 'ac_unit' },
    ];
  }

  setting(key: string): { value: any; sync: string | null } | undefined {
    return this.trv?.settings?.[key];
  }

  /** Worst status among the settings, for the dot on the gear */
  get settingsSync(): string | null {
    const all = Object.values(this.trv?.settings || {}).map(s => s.sync);
    return all.includes('failed') ? 'failed' : all.includes('pending') ? 'pending' : null;
  }

  toggleLinked(): void {
    if (this.trv?.linked) {
      this.linkedChange.emit({ linked: false, copy: false });
    } else {
      this.copyPrompt = true;
    }
  }

  answerCopy(copy: boolean): void {
    this.copyPrompt = false;
    this.linkedChange.emit({ linked: true, copy });
  }

  toggleSetting(key: string): void {
    this.settingChange.emit({ key, value: this.setting(key)?.value !== true });
  }

  /** WT101 limits: min 5–15 °C, max 16–35 °C; an unset range is shown as the full 5–35 */
  stepRange(bound: 'min' | 'max', delta: number): void {
    const key = bound === 'min' ? 'wt_temp_range_min' : 'wt_temp_range_max';
    const cur = bound === 'min' ? this.tempMin : this.tempMax;
    const [lo, hi] = bound === 'min' ? [5, 15] : [16, 35];
    const next = Math.min(hi, Math.max(lo, cur + delta));
    if (next === cur) return;
    this.settingChange.emit({ key, value: next });
  }

  trackByKey(index: number, item: { key: string }): string {
    return item.key;
  }

  trackById(index: number, item: any): string {
    return item.id;
  }
}
