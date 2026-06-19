import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { OccupancyStats } from '../../core/models/sensor-stats.models';
import { ChartSeries } from '../../core/models/sensor-chart.models';
import { TranslationService } from '../../../revelton-tb-extension-dashboard/core/services/translation.service';

@Component({
  selector: 'revelton-occupancy-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="panel occupancy-panel" [class.compact]="compact">
      <div class="panel-header">
        <div class="title-area">
          <mat-icon>person</mat-icon>
          <h3>{{ t.histRoomOccupancy || 'Room Occupancy' }}</h3>
        </div>
        <div class="status-badge-modern" [class.occupied]="stats.current === 'Occupied' || stats.current === t.occupied">
           {{ stats.current }}
        </div>
      </div>

      <div class="stats-row-grid">
        <div class="stat-col">
          <span class="label">OCC. RATE</span>
          <span class="value">{{ stats.avg }}%</span>
        </div>
        <div class="stat-col">
          <span class="label">CHECK-IN</span>
          <span class="value">{{ stats.checkedIn }}</span>
        </div>
      </div>

      <div class="sparkline-wrapper">
        <revelton-historical-chart
          [data]="chartData"
          [colors]="['#A855F7']"
          [sparkline]="false"
          [area]="true">
        </revelton-historical-chart>
      </div>

      <div class="stay-log" *ngIf="!compact">
        <h4>STAY LOG</h4>
        <div class="log-table">
          <div class="log-header-row">
            <span>DATE RANGE</span>
            <span>DURATION</span>
          </div>
          <div class="log-body">
             <div class="log-row" *ngIf="stats.avg > 0">
               <span class="date">May 01 - May 06</span>
               <span class="duration purple-text">12h 45m</span>
             </div>
             <div class="log-row empty" *ngIf="stats.avg === 0">
               <span class="empty-msg">No recent activity</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .occupancy-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .status-badge-modern {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 800;
      background: var(--bg, rgba(255, 255, 255, 0.05));
      color: var(--text-secondary, rgba(255, 255, 255, 0.5));
      text-transform: uppercase;
      transition: all 0.3s ease;
      &.occupied { background: rgba(168, 85, 247, 0.1); color: #A855F7; }
    }
    .stats-row-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      .stat-col {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .label { font-size: 8px; font-weight: 800; color: var(--text-muted, #6B7280); letter-spacing: 0.5px; }
        .value { font-size: 14px; font-weight: 800; color: var(--text, #fff); }
      }
    }
    .sparkline-wrapper {
      width: 100%;
      height: 80px;
      margin-top: 4px;
      ::ng-deep revelton-historical-chart { height: 100%; display: block; }
    }
    .stay-log {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      h4 { font-size: 9px; font-weight: 800; color: var(--text-muted, #6B7280); margin: 0 0 12px; letter-spacing: 1px; }
      .log-table {
        display: flex;
        flex-direction: column;
        .log-header-row {
          display: flex;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
          span { font-size: 8px; font-weight: 800; color: var(--text-muted, #6B7280); letter-spacing: 0.5px; }
        }
        .log-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.03));
          .date { font-size: 11px; font-weight: 700; color: var(--text, #fff); }
          .duration { font-size: 11px; font-weight: 700; }
          .purple-text { color: var(--purple); }
          &.empty { justify-content: center; .empty-msg { font-size: 10px; color: var(--text-muted, #6B7280); font-style: italic; } }
        }
      }
    }
 
    /* Compact mode overrides */
    .occupancy-panel.compact {
      gap: 8px;
      .panel-header { margin-bottom: 4px; }
      .sparkline-wrapper { height: 50px; }
      .stats-row-grid { gap: 6px; }
      .stat-col .value { font-size: 12px; }
    }
  `]
})
export class OccupancyPanelComponent {
  @Input() stats: OccupancyStats;
  @Input() chartData: ChartSeries[] = [];
  @Input() compact = false;
  
  constructor(private translationService: TranslationService) {}
  get t() { return this.translationService.t; }
}
