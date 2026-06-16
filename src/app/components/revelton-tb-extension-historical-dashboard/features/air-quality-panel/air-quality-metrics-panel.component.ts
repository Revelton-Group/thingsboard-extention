import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ChartSeries, AirQualityChartData } from '../../core/models/sensor-chart.models';

interface MetricTab {
  key: string;
  label: string;
  unit: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'revelton-air-quality-metrics-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="panel aq-metrics-panel">
      <div class="panel-header">
        <div class="title-area">
          <mat-icon>air</mat-icon>
          <div class="titles">
            <h3>Pollutants & Pressure</h3>
            <p>Click a metric to view its history</p>
          </div>
        </div>
      </div>

      <!-- Metric selector buttons -->
      <div class="metric-tabs">
        <button
          *ngFor="let tab of allTabs"
          class="metric-tab"
          [class.active]="selectedKey === tab.key"
          [style.--tab-color]="tab.color"
          (click)="selectTab(tab.key)">
          <mat-icon>{{ tab.icon }}</mat-icon>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Current value display -->
      <div class="metric-current">
        <div class="metric-current-label">
          <span class="live-dot"></span> {{ activeTab?.label }}
        </div>
        <div class="metric-value-wrapper">
          <span class="metric-value" [style.color]="activeTab?.color">
            {{ currentValue }}
          </span>
          <span class="metric-unit">{{ activeTab?.unit }}</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-container">
        <revelton-historical-chart
          [data]="activeChartData"
          [colors]="[activeTab?.color || '#8b5cf6']"
          type="line">
        </revelton-historical-chart>
      </div>
    </div>
  `,
})
export class AirQualityMetricsPanelComponent {
  @Input() aqChart: AirQualityChartData;

  selectedKey = 'co2';

  readonly allTabs: MetricTab[] = [
    { key: 'co2',   label: 'CO₂',      unit: 'ppm',     color: '#8b5cf6', icon: 'co2'         },
    { key: 'pm25',  label: 'PM2.5',    unit: 'µg/m³',   color: '#f59e0b', icon: 'grain'       },
    { key: 'tvoc',  label: 'TVOC',     unit: 'ppb',     color: '#10b981', icon: 'science'     },
    { key: 'iaq',   label: 'AQI',      unit: '',        color: '#eab308', icon: 'air'         },
    { key: 'pressure', label: 'Pressure', unit: 'hPa',  color: '#0ea5e9', icon: 'speed'       },
  ];

  get activeTab(): MetricTab {
    return this.allTabs.find(t => t.key === this.selectedKey) ?? this.allTabs[0];
  }

  get currentValue(): string | number {
    const chart = this.getChartForKey(this.selectedKey);
    const vals = chart?.[0]?.values;
    if (!vals?.length) return '--';
    return vals[vals.length - 1][1] ?? '--';
  }

  get activeChartData(): ChartSeries[] {
    return this.getChartForKey(this.selectedKey) ?? [];
  }

  selectTab(key: string): void {
    this.selectedKey = key;
  }

  private getChartForKey(key: string): ChartSeries[] | null {
    if (!this.aqChart) return null;
    const map: Record<string, ChartSeries[] | undefined> = {
      co2:  this.aqChart.co2,
      pm25: this.aqChart.pm25,
      tvoc: this.aqChart.tvoc,
      iaq:  this.aqChart.iaq,
      pressure: this.aqChart.pressure,
    };
    return map[key] ?? null;
  }
}
