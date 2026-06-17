import { Component, Input } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-air-quality-sensor',
  templateUrl: './air-quality-sensor.component.html',
  styleUrls: ['./air-quality-sensor.component.scss'],
  standalone: false
})
export class AirQualitySensorComponent {
  @Input() sensor!: any;

  constructor(private translationService: TranslationService) {}

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

  getLinkQualityClass(lqi: number | null): string {
    if (lqi == null) return 'meta-item-gray';
    if (lqi >= 100) return 'meta-item-green';
    if (lqi >= 50) return 'meta-item-orange';
    return 'meta-item-gray';
  }

  getTVOCColor(val: any): string {
    const v = Number(val);
    if (isNaN(v)) return '#34C759';
    if (v < 0.3) return '#007AFF';
    if (v < 1.0) return '#34C759';
    if (v < 3.0) return '#FF9500';
    return '#FF3B30';
  }

  getPM25Color(val: any): string {
    const v = Number(val);
    if (isNaN(v)) return '#34C759';
    if (v < 12) return '#007AFF';
    if (v < 35) return '#34C759';
    if (v < 55) return '#FF9500';
    return '#FF3B30';
  }

  getPM10Color(val: any): string {
    const v = Number(val);
    if (isNaN(v)) return '#34C759';
    if (v < 54) return '#007AFF';
    if (v < 154) return '#34C759';
    if (v < 254) return '#FF9500';
    return '#FF3B30';
  }

  getTVOCPerc(val: any): number {
    const v = Number(val);
    if (isNaN(v)) return 0;
    return Math.min(100, Math.round((v / 3.0) * 100));
  }

  getPM25Perc(val: any): number {
    const v = Number(val);
    if (isNaN(v)) return 0;
    return Math.min(100, Math.round((v / 55.0) * 100));
  }

  getPM10Perc(val: any): number {
    const v = Number(val);
    if (isNaN(v)) return 0;
    return Math.min(100, Math.round((v / 254.0) * 100));
  }

  isMotionActive(): boolean {
    if (!this.sensor || !this.sensor.pir) return false;
    const pir = String(this.sensor.pir).toLowerCase();
    return pir === 'trigger' || pir === 'triger' || pir === 'triggered' || pir === 'occupied' || pir === '1' || pir === 'true';
  }

  getMotionLabel(): string {
    if (!this.sensor || !this.sensor.pir) return '--';
    const pir = String(this.sensor.pir).toLowerCase();
    if (pir === '--' || pir === '') return '--';
    return this.isMotionActive() ? this.t.occupied : this.t.idle;
  }
}
