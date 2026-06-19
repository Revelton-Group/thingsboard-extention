import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { WaterLeakStats } from '../../core/models/sensor-stats.models';
import { ChartSeries } from '../../core/models/sensor-chart.models';
import { TranslationService } from '../../../revelton-tb-extension-dashboard/core/services/translation.service';

@Component({
  selector: 'revelton-water-leak-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="panel water-leak-panel" [class.compact]="compact">
      <div class="panel-header">
        <div class="title-area">
          <mat-icon>water_drop</mat-icon>
          <h3>{{ t.histWaterLeak || 'Water Leak' }}</h3>
        </div>
        <div class="status-badge-modern" [class.leak]="stats.current !== 'No Leak' && stats.current !== t.noLeak">
           {{ stats.current }}
        </div>
      </div>

      <div class="stats-row-grid">
        <div class="stat-col">
          <span class="label">TOTAL EVENTS</span>
          <span class="value">{{ stats.events }}</span>
        </div>
        <div class="stat-col">
          <span class="label">LAST EVENT</span>
          <span class="value">{{ stats.events > 0 ? 'Detected' : 'Never' }}</span>
        </div>
      </div>

      <div class="events-log-modern" *ngIf="!compact">
        <h4>RECENT ACTIVITY</h4>
        <div class="log-body">
          <div class="empty-state-minimal" *ngIf="stats.events === 0">
            <mat-icon>verified_user</mat-icon>
            <p>System secure — No leaks</p>
          </div>
          <div class="leak-event-row" *ngIf="stats.events > 0">
             <div class="icon-group">
               <mat-icon>warning</mat-icon>
             </div>
             <div class="event-details">
                <span class="title">Leak Detected</span>
                <span class="meta">May 04, 14:22</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Compact: small status icon only -->
      <div class="compact-status" *ngIf="compact">
        <mat-icon>{{ stats.events > 0 ? 'warning' : 'check_circle' }}</mat-icon>
        <span>{{ stats.events > 0 ? 'Leaks recorded' : 'No leaks detected' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .water-leak-panel {
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
      background: rgba(34, 197, 94, 0.1);
      color: #22C55E;
      &.leak { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
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
    .events-log-modern {
      flex: 1;
      display: flex;
      flex-direction: column;
      h4 { font-size: 9px; font-weight: 800; color: var(--text-muted, #6B7280); margin: 0 0 12px; letter-spacing: 1px; }
      .log-body {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .empty-state-minimal {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px 0;
        gap: 8px;
        mat-icon { font-size: 32px; width: 32px; height: 32px; color: #22C55E; opacity: 0.5; }
        p { font-size: 11px; color: var(--text-muted, #6B7280); margin: 0; }
      }
      .leak-event-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: rgba(239, 68, 68, 0.05);
        border-radius: 8px;
        .icon-group {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          mat-icon { font-size: 18px; width: 18px; height: 18px; color: #EF4444; }
        }
        .event-details {
          display: flex;
          flex-direction: column;
          .title { font-size: 12px; font-weight: 700; color: #EF4444; }
          .meta { font-size: 10px; color: var(--text-secondary, #6B7280); }
        }
      }
    }
 
    /* Compact mode overrides */
    .water-leak-panel.compact {
      gap: 8px;
      .panel-header { margin-bottom: 4px; }
      .compact-status {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: #22C55E; }
        &.leak mat-icon { color: #EF4444; }
        span { font-size: 10px; font-weight: 600; color: var(--text-secondary, #6B7280); }
      }
    }
  `]
})
export class WaterLeakPanelComponent {
  @Input() stats: WaterLeakStats;
  @Input() chartData: ChartSeries[] = [];
  @Input() compact = false;
  
  constructor(private translationService: TranslationService) {}
  get t() { return this.translationService.t; }
}
