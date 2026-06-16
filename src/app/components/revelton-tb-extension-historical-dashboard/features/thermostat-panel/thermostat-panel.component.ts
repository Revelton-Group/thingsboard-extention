import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ThermostatStats } from '../../core/models/sensor-stats.models';
import { ChartSeries } from '../../core/models/sensor-chart.models';

/**
 * ThermostatPanelComponent
 *
 * SRP: Displays thermostat statistics and temperature chart only.
 * Dumb component — receives data via @Input, emits nothing, performs no fetches.
 * OnPush: Only re-renders when inputs change by reference.
 */
@Component({
  selector: 'revelton-thermostat-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="panel thermostat-panel">
      <div class="panel-header">
        <div class="title-area">
          <mat-icon>thermostat</mat-icon>
          <div class="titles">
            <h3>Thermostat</h3>
            <p>TRV / Heating Control</p>
          </div>
        </div>
        <div class="status-badge" [class.heating]="stats.runningState === 'heating'">
          {{ stats.mode | titlecase }}
        </div>
      </div>

      <div class="main-value blue-text">
        {{ stats.currentTemp }}<small>°C</small>
      </div>

      <div class="stats-row">
        <div class="stat-col">
          <span class="label">SETPOINT</span>
          <span class="value">{{ stats.setpoint }}°C</span>
        </div>
        <div class="stat-col">
          <span class="label">MIN</span>
          <span class="value">{{ stats.min }}°C</span>
        </div>
        <div class="stat-col">
          <span class="label">MAX</span>
          <span class="value">{{ stats.max }}°C</span>
        </div>
        <div class="stat-col">
          <span class="label">AVG</span>
          <span class="value">{{ stats.avg }}°C</span>
        </div>
      </div>

      <div class="heat-status-row">
        <span class="label">HEATING STATE</span>
        <span class="value" [class.active]="stats.runningState === 'heating'">
          {{ stats.runningState | titlecase }}
        </span>
      </div>

      <div class="chart-container">
        <revelton-historical-chart
          [data]="chartData"
          [colors]="['#3b82f6', '#f97316']"
          type="line"
          [dualAxis]="false">
        </revelton-historical-chart>
      </div>
    </div>
  `,
})
export class ThermostatPanelComponent {
  @Input() stats: ThermostatStats;
  @Input() chartData: ChartSeries[] = [];
}
