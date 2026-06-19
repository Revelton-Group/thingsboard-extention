import { Component, Input } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-occupancy-sensor',
  templateUrl: './occupancy-sensor.component.html',
  styleUrls: ['./occupancy-sensor.component.scss'],
  standalone: false
})
export class OccupancySensorComponent {
  @Input() sensor!: any;

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  get isOccupied(): boolean {
    if (!this.sensor?.occupancy) return false;
    const v = String(this.sensor.occupancy).toLowerCase();
    return v === 'occupied' || v === 'true' || v === '1';
  }

  get occupancyLabel(): string {
    return this.isOccupied ? (this.t.occupied || 'Occupied') : (this.t.vacant || 'Vacant');
  }

  get occupancyColor(): string {
    return this.isOccupied ? '#3B82F6' : '#34C759';
  }

  get illuminanceLabel(): string {
    if (!this.sensor?.illuminance) return '--';
    const v = String(this.sensor.illuminance).toLowerCase();
    if (v === 'bright') return 'Bright';
    if (v === 'dim') return 'Dim';
    return String(this.sensor.illuminance);
  }

  get illuminanceIcon(): string {
    if (!this.sensor?.illuminance) return 'light_mode';
    const v = String(this.sensor.illuminance).toLowerCase();
    return v === 'bright' ? 'wb_sunny' : 'nights_stay';
  }

  get illuminanceColor(): string {
    if (!this.sensor?.illuminance) return '#8E8E93';
    const v = String(this.sensor.illuminance).toLowerCase();
    return v === 'bright' ? '#F59E0B' : '#818CF8';
  }

  getLinkQualityText(lqi: number | null): string {
    if (lqi == null) return '--';
    if (lqi >= 150) return this.t.excellent || 'Excellent';
    if (lqi >= 100) return this.t.good || 'Good';
    if (lqi >= 50) return this.t.fair || 'Fair';
    return this.t.poor || 'Poor';
  }

  getLinkQualityClass(lqi: number | null): string {
    if (lqi == null) return 'meta-item-gray';
    if (lqi >= 100) return 'meta-item-green';
    if (lqi >= 50) return 'meta-item-orange';
    return 'meta-item-gray';
  }
}
