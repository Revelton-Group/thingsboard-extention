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
}
