import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ThermostatDevice, TrvMode, TrvPreset } from '../../../core/models/room-card.models';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-thermostat-card',
  templateUrl: './thermostat-card.component.html',
  styleUrls: ['./thermostat-card.component.scss'],
  standalone: false
})
export class ThermostatCardComponent implements OnDestroy {
  @Input() trv!: ThermostatDevice;
  @Input() modes: TrvMode[] = [];
  @Input() presets: TrvPreset[] = [];

  @Output() modeChange = new EventEmitter<string>();
  @Output() presetChange = new EventEmitter<string>();
  @Output() tempChange = new EventEmitter<number>();

  isModeMenuOpen = false;
  isPresetMenuOpen = false;

  private sliderActive = false;
  private sliderTrackEl: HTMLElement | null = null;
  private boundMouseMove: any;
  private boundMouseUp: any;

  constructor(private cdr: ChangeDetectorRef, private translationService: TranslationService) {
    this.boundMouseMove = this.onSliderMove.bind(this);
    this.boundMouseUp = this.onSliderEnd.bind(this);
  }

  get t() {
    return this.translationService.t;
  }

  ngOnDestroy(): void {
    this.cleanupSliderEvents();
  }

  private cleanupSliderEvents() {
    this.sliderActive = false;
    this.sliderTrackEl = null;
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('touchmove', this.boundMouseMove);
    document.removeEventListener('touchend', this.boundMouseUp);
  }

  getLinkQualityText(lqi: number | null): string {
    if (lqi == null) return '--';
    if (lqi >= 150) return this.t.excellent;
    if (lqi >= 100) return this.t.good;
    if (lqi >= 50) return this.t.fair;
    return this.t.poor;
  }

  getLinkQualityClass(lqi: number | null): string {
    if (lqi == null) return 'meta-item-gray';
    if (lqi >= 100) return 'meta-item-green';
    if (lqi >= 50) return 'meta-item-orange';
    return 'meta-item-gray';
  }

  getTrvColor(): string {
    if (!this.trv) return '#8E8E93';
    const mode = this.trv.runningState || this.trv.systemMode;
    if (mode === 'off' || mode === 'fan') return '#8E8E93';
    if (mode === 'heat' || mode === 'heating') return '#FF9500';
    if (mode === 'cool' || mode === 'cooling' || mode === 'idle') return '#06B6D4';
    return '#34C759'; // auto/default
  }

  getSliderPercent(): number {
    if (!this.trv || this.trv.targetTemp == null || isNaN(this.trv.targetTemp)) return 50; 
    return Math.max(0, Math.min(100, ((this.trv.targetTemp - 15) / (25 - 15)) * 100));
  }

  getModeIcon(mode: string): string {
    const m = this.modes.find(x => x.id === mode);
    return m ? m.icon : 'power_settings_new';
  }

  getModeLabel(mode: string): string {
    if (mode === 'auto') return this.t.auto;
    if (mode === 'heat') return this.t.heat;
    if (mode === 'off') return this.t.off;
    const m = this.modes.find(x => x.id === mode);
    return m ? m.label : this.t.off;
  }

  getModeColor(mode: string): string {
    const m = this.modes.find(x => x.id === mode);
    return m ? m.color : '#8E8E93';
  }

  getPresetIcon(preset: string): string {
    const p = this.presets.find(x => x.id === preset);
    return p ? p.icon : 'pan_tool';
  }

  getPresetLabel(preset: string): string {
    if (preset === 'eco') return this.t.eco;
    if (preset === 'comfort') return this.t.comfort;
    if (preset === 'manual') return this.t.manual;
    const p = this.presets.find(x => x.id === preset);
    return p ? p.label : this.t.manual;
  }

  getPresetColor(preset: string): string {
    const p = this.presets.find(x => x.id === preset);
    return p ? p.color : '#8E8E93';
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

  toggleMode(event: Event) {
    event.stopPropagation();
    this.isModeMenuOpen = !this.isModeMenuOpen;
    if (this.isModeMenuOpen) this.isPresetMenuOpen = false;
  }

  togglePreset(event: Event) {
    event.stopPropagation();
    this.isPresetMenuOpen = !this.isPresetMenuOpen;
    if (this.isPresetMenuOpen) this.isModeMenuOpen = false;
  }

  selectMode(modeId: string): void {
    this.isModeMenuOpen = false;
    this.modeChange.emit(modeId);
  }

  selectPreset(presetId: string): void {
    this.isPresetMenuOpen = false;
    this.presetChange.emit(presetId);
  }

  // Slider interaction
  onSliderClick(event: MouseEvent): void {
    if (!this.trv) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const newTemp = Math.round(15 + pct * 10);
    this.trv.targetTemp = newTemp;
    this.cdr.detectChanges();
    this.tempChange.emit(newTemp);
  }

  onSliderStart(event: MouseEvent | TouchEvent, trackEl: HTMLElement): void {
    if (!this.trv) return;
    event.preventDefault();
    this.sliderActive = true;
    this.sliderTrackEl = trackEl;
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('touchmove', this.boundMouseMove, { passive: false });
    document.addEventListener('touchend', this.boundMouseUp);
  }

  onSliderMove(event: MouseEvent | TouchEvent): void {
    if (!this.sliderActive || !this.sliderTrackEl || !this.trv) return;
    event.preventDefault();
    const clientX = event instanceof MouseEvent ? event.clientX : (event as TouchEvent).touches[0].clientX;
    const rect = this.sliderTrackEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    this.trv.targetTemp = Math.round(15 + pct * 10);
    this.cdr.detectChanges();
  }

  onSliderEnd(): void {
    if (this.sliderActive && this.trv) {
      if (this.trv.targetTemp != null) {
        this.tempChange.emit(this.trv.targetTemp);
      }
    }
    this.cleanupSliderEvents();
  }
}
