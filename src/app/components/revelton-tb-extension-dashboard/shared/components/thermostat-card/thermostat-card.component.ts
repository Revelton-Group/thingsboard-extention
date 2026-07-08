import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ThermostatDevice, TrvMode, TrvPreset } from '../../../core/models/room-card.models';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-thermostat-card',
  templateUrl: './thermostat-card.component.html',
  styleUrls: ['./thermostat-card.component.scss'],
  standalone: false
})
export class ThermostatCardComponent {
  @Input() trv!: ThermostatDevice;
  @Input() modes: TrvMode[] = [];
  @Input() presets: TrvPreset[] = [];
  @Input() index: number = 1;

  @Output() modeChange = new EventEmitter<string>();
  @Output() presetChange = new EventEmitter<string>();
  @Output() tempChange = new EventEmitter<number>();

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

  getRunningStateLabel(state: string): string {
    if (!state) return '';
    const s = state.toLowerCase();
    if (s === 'heat' || s === 'heating') return this.t.heating;
    if (s === 'cool' || s === 'cooling') return this.t.cooling;
    if (s === 'idle') return this.t.idle;
    if (s === 'off') return this.t.off;
    return state;
  }

  // ── Battery helpers ──

  getBatteryLabel(trv: any): string {
    if (trv.batteryLow === true) return 'Low';
    if (trv.battery != null) return trv.battery + '%';
    if (trv.batteryLow === false && trv.battery == null) return 'Good';
    return '--';
  }

  getBatteryBg(battery: number | null): string {
    if (battery == null) return 'var(--panel2, #1a2230)';
    if (battery <= 20) return 'var(--alert-soft, rgba(248,113,113,.13))';
    if (battery <= 50) return 'var(--warn-soft, rgba(245,181,74,.13))';
    return 'var(--ok-soft, rgba(52,211,153,.13))';
  }

  getBatteryColor(battery: number | null): string {
    if (battery == null) return 'var(--t3, #5c6675)';
    if (battery <= 20) return 'var(--alert, #f87171)';
    if (battery <= 50) return 'var(--warn, #f5b54a)';
    return 'var(--ok, #34d399)';
  }

  getBatteryIcon(battery: number | null): string {
    if (battery == null) return 'battery_unknown';
    if (battery <= 10) return 'battery_alert';
    if (battery <= 25) return 'battery_2_bar';
    if (battery <= 50) return 'battery_4_bar';
    if (battery <= 75) return 'battery_5_bar';
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

  incrementTemp(): void {
    if (!this.trv || this.trv.systemMode === 'off') return;
    const cur = this.trv.targetTemp ?? 20;
    const next = Math.min(30, +(cur + 1).toFixed(1));
    this.trv.targetTemp = next;
    this.cdr.detectChanges();
    this.tempChange.emit(next);
  }

  decrementTemp(): void {
    if (!this.trv || this.trv.systemMode === 'off') return;
    const cur = this.trv.targetTemp ?? 20;
    const next = Math.max(5, +(cur - 1).toFixed(1));
    this.trv.targetTemp = next;
    this.cdr.detectChanges();
    this.tempChange.emit(next);
  }

  // ── Select handlers ──

  onModeSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modeChange.emit(value);
  }

  onPresetSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.presetChange.emit(value);
  }
}
