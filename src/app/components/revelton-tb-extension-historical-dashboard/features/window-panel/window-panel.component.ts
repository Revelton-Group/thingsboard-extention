import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { WindowStats } from '../../core/models/sensor-stats.models';
import { TimeRangeKey } from '../../core/models/time-range.models';
import { TIME_RANGE_OPTIONS } from '../../core/constants/time-range.constants';
import { TranslationService } from '../../../revelton-tb-extension-dashboard/core/services/translation.service';

/**
 * WindowPanelComponent
 *
 * SRP: Renders window/door sensor events, timeline, and event log.
 * Business logic (start label) resolved from constants, not inline ternaries.
 */
@Component({
  selector: 'revelton-window-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="panel window-panel" [class.compact]="compact">
      <div class="panel-header">
        <div class="title-area">
          <mat-icon>window</mat-icon>
          <div class="titles">
            <h3>{{ t.histWindows || 'Windows: Sensor History' }}</h3>
          </div>
        </div>
      </div>

      <div class="stats-row-grid">
        <div class="stat-col">
          <span class="label">{{ t.histEvents || 'EVENTS' }}</span>
          <span class="value">{{ stats.eventCount }}</span>
        </div>
        <div class="stat-col">
          <span class="label">{{ t.histTotalOpen || 'TOTAL OPEN' }}</span>
          <span class="value">{{ stats.avgOpen }}%</span>
        </div>
        <div class="stat-col">
          <span class="label">{{ t.histAvgDuration || 'AVG DURATION' }}</span>
          <span class="value">{{ stats.avgDuration }}</span>
        </div>
      </div>

      <div class="timeline-visual">
        <div class="timeline-track">
          <ng-container *ngFor="let device of stats.devices">
             <div class="marker"
                *ngFor="let marker of device.markers"
                [style.left]="marker.left"
                [style.width]="marker.width"
                [style.background-color]="'#F97316'">
             </div>
          </ng-container>
        </div>
        <div class="timeline-meta">
          <span>{{ startLabel }}</span>
          <span>Now</span>
        </div>
      </div>

      <div class="events-log-modern">
        <div class="log-header" *ngIf="!compact">
          <h4>{{ t.histRecentEvents || 'RECENT EVENTS' }}</h4>
        </div>
        <div class="events-scroll" *ngIf="!compact">
          <div class="event-row" *ngFor="let event of stats.events">
            <div class="event-info">
              <span class="name">{{ event.name }}</span>
              <span class="time">{{ event.time | date:'HH:mm' }}</span>
            </div>
            <div class="event-status-badge" [class.open]="event.isOngoing">
              {{ event.isOngoing ? (t.histCurrentlyOpen || 'Currently Open') : 'Closed' }}
            </div>
          </div>
        </div>

        <!-- Compact: single most recent event only -->
        <div class="compact-event" *ngIf="compact && stats.events?.length">
          <span class="dot" [class.open]="stats.events[0].isOngoing"></span>
          <span class="compact-event-time">{{ stats.events[0].time | date:'HH:mm' }}</span>
          <span class="compact-event-status" [class.open]="stats.events[0].isOngoing">
            {{ stats.events[0].isOngoing ? (t.open || 'Open') : (t.closed || 'Closed') }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .window-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .stats-row-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      .stat-col {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .label { font-size: 8px; font-weight: 800; color: #6B7280; letter-spacing: 0.5px; }
        .value { font-size: 14px; font-weight: 800; color: #fff; }
      }
    }
    .timeline-visual {
      display: flex;
      flex-direction: column;
      gap: 8px;
      .timeline-track {
        height: 8px;
        background: #22C55E;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        .marker {
          position: absolute;
          height: 100%;
          background: #F97316;
        }
      }
      .timeline-meta {
        display: flex;
        justify-content: space-between;
        span { font-size: 9px; font-weight: 700; color: #6B7280; }
      }
    }
    .events-log-modern {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      h4 { font-size: 9px; font-weight: 800; color: #6B7280; margin: 0 0 12px; letter-spacing: 1px; }
      .events-scroll {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .event-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255,255,255,0.02);
        border-radius: 8px;
        .event-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          .name { font-size: 11px; font-weight: 700; color: #fff; }
          .time { font-size: 10px; color: #6B7280; }
        }
        .event-status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 800;
          background: rgba(255,255,255,0.05);
          color: #6B7280;
          &.open { background: rgba(249, 115, 22, 0.1); color: #F97316; }
        }
      }
    }

    /* Compact mode overrides */
    .window-panel.compact {
      gap: 8px;
      .panel-header { margin-bottom: 4px; }
      .timeline-visual { gap: 4px; }
      .timeline-visual .timeline-track { height: 4px; }
      .events-log-modern {
        flex: 0;
        h4 { margin-bottom: 4px; }
      }
      .compact-event {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        background: rgba(255,255,255,0.02);
        border-radius: 6px;
        font-size: 10px;
        .dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #22C55E; flex-shrink: 0;
          &.open { background: #F97316; }
        }
        .compact-event-time { color: #6B7280; font-weight: 600; }
        .compact-event-status {
          font-weight: 700; color: #22C55E; margin-left: auto;
          &.open { color: #F97316; }
        }
      }
    }
  `]
})
export class WindowPanelComponent {
  @Input() stats: WindowStats;
  @Input() selectedTimeRange: TimeRangeKey = '24h';
  @Input() locationName: string = '';
  @Input() compact = false;

  constructor(private translationService: TranslationService) {}
  
  get t() { return this.translationService.t; }

  get startLabel(): string {
    return TIME_RANGE_OPTIONS[this.selectedTimeRange]?.startLabel ?? '24h ago';
  }

  formatDuration(ms: number): string {
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes === 0) return '< 1m';
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return `${hours}h ${minutes}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
}
