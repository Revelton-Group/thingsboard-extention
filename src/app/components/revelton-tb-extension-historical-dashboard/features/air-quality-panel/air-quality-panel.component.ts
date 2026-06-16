import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { AirQualityStats } from '../../core/models/sensor-stats.models';
import { AirQualityChartData } from '../../core/models/sensor-chart.models';

/**
 * AirQualityPanelComponent
 *
 * SRP: Renders the full air quality monitor section with combined + sparkline charts.
 * Dumb component — all display, zero logic.
 */
@Component({
  selector: 'revelton-air-quality-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="panel air-quality-panel span-2">
      <div class="panel-header">
        <div class="title-area">
          <mat-icon>air</mat-icon>
          <div class="titles">
            <h3>Air Quality Monitor</h3>
            <p>Live sensor readings — temperature, humidity & pollutants</p>
          </div>
        </div>
        <div class="aq-header-stats">
          <div class="aq-header-stat temp">
            <span class="live-dot"></span>
            <div class="stat-icon"><mat-icon>thermostat</mat-icon></div>
            <div class="stat-body">
              <span class="stat-label">TEMP</span>
              <span class="stat-val">{{ stats.temp }}<small>°C</small></span>
            </div>
          </div>
          <div class="aq-header-stat hum">
            <span class="live-dot"></span>
            <div class="stat-icon"><mat-icon>water_drop</mat-icon></div>
            <div class="stat-body">
              <span class="stat-label">HUMIDITY</span>
              <span class="stat-val">{{ stats.humidity }}<small>%</small></span>
            </div>
          </div>
          <div class="aq-header-stat co2" *ngIf="stats.co2">
            <span class="live-dot"></span>
            <div class="stat-icon"><mat-icon>co2</mat-icon></div>
            <div class="stat-body">
              <span class="stat-label">CO₂</span>
              <span class="stat-val">{{ stats.co2 }}<small>ppm</small></span>
            </div>
          </div>
          <div class="aq-header-stat iaq" *ngIf="stats.iaq">
            <span class="live-dot"></span>
            <div class="stat-icon"><mat-icon>air</mat-icon></div>
            <div class="stat-body">
              <span class="stat-label">AQI</span>
              <span class="stat-val" [class]="getAqiClass(stats.iaq)">{{ stats.iaq }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="air-quality-layout">
        <!-- Combined Temp/Hum dual-axis chart - full height -->
        <div class="aq-combined-card">
          <div class="aq-combined-chart">
            <revelton-historical-chart
              [data]="chart.combined"
              [colors]="['#f97316', '#3b82f6']"
              type="line"
              [sparkline]="false"
              [dualAxis]="true">
            </revelton-historical-chart>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AirQualityPanelComponent {
  @Input() stats: AirQualityStats;
  @Input() chart: AirQualityChartData;

  getAqiClass(iaq: number): string {
    if (!iaq) return '';
    if (iaq <= 50)  return 'aqi-good';
    if (iaq <= 100) return 'aqi-moderate';
    if (iaq <= 150) return 'aqi-poor';
    return 'aqi-bad';
  }
}
