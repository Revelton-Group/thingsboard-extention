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
      </div>

      <div class="occupancy-main">
        <div class="donut-wrapper-large" [class.compact]="compact">
           <div class="donut-chart" [style.--percent]="stats.avg" [style.--color]="'var(--purple)'">
              <div class="donut-inner">
                <div class="donut-content">
                  <span class="val">{{ stats.avg }}%</span>
                  <span class="label">OCCUPIED</span>
                </div>
              </div>
           </div>
        </div>

        <div class="stats-side">
          <div class="stat-box">
            <span class="label">OCC. RATE</span>
            <span class="value">{{ stats.avg }}%</span>
          </div>
          <div class="stat-box">
            <span class="label">CHECK-IN</span>
            <span class="value">{{ stats.checkedIn }}</span>
          </div>
        </div>
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
    .occupancy-main {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 8px;
    }
    .donut-wrapper-large {
      width: 100px;
      height: 100px;
    }
    .donut-chart {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(var(--color) calc(var(--percent) * 1%), rgba(255, 255, 255, 0.05) 0);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      .donut-inner {
        width: 80%;
        height: 80%;
        background: var(--bg-panel);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        .donut-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          .val { font-size: 16px; font-weight: 800; color: #fff; }
          .label { font-size: 7px; font-weight: 800; color: #6B7280; letter-spacing: 0.5px; }
        }
      }
    }
    .stats-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      .stat-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .label { font-size: 8px; font-weight: 800; color: #6B7280; letter-spacing: 0.5px; }
        .value { font-size: 14px; font-weight: 800; color: #fff; }
      }
    }
    .stay-log {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      h4 { font-size: 9px; font-weight: 800; color: #6B7280; margin: 0 0 12px; letter-spacing: 1px; }
      .log-table {
        display: flex;
        flex-direction: column;
        .log-header-row {
          display: flex;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          span { font-size: 8px; font-weight: 800; color: #6B7280; letter-spacing: 0.5px; }
        }
        .log-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          .date { font-size: 11px; font-weight: 700; color: #fff; }
          .duration { font-size: 11px; font-weight: 700; }
          .purple-text { color: var(--purple); }
          &.empty { justify-content: center; .empty-msg { font-size: 10px; color: #6B7280; font-style: italic; } }
        }
      }
    }

    /* Compact mode overrides */
    .occupancy-panel.compact {
      gap: 8px;
      .panel-header { margin-bottom: 4px; }
      .occupancy-main { gap: 12px; margin-bottom: 0; }
      .stats-side { gap: 6px; }
      .stat-box .value { font-size: 12px; }
    }
    .donut-wrapper-large.compact {
      width: 60px;
      height: 60px;
      .donut-inner .donut-content .val { font-size: 12px; }
      .donut-inner .donut-content .label { font-size: 6px; }
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
