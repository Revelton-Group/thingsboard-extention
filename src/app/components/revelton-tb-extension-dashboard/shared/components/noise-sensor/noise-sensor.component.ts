import { Component, Input } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-noise-sensor',
  templateUrl: './noise-sensor.component.html',
  styleUrls: ['./noise-sensor.component.scss'],
  standalone: false
})
export class NoiseSensorComponent {
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
}
