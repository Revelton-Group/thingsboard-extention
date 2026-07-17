import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChargerCardViewModel } from '../../core/models';

@Component({
  selector: 'revelton-ev-charger-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <!-- Section Header (Clickable Accordion) -->
    <div class="section-header" role="button" tabindex="0"
         (click)="toggleExpand()"
         (keydown.enter)="toggleExpand()"
         (keydown.space)="toggleExpand()">
      <div class="header-title">
        <div class="header-icon-wrapper">
          <mat-icon>bolt</mat-icon>
        </div>
        <h2>EV Charging</h2>
        <span class="device-badge">{{ chargers?.length || 0 }} devices</span>
      </div>
      <button mat-icon-button class="expand-btn">
        <mat-icon>{{ isExpanded ? 'expand_less' : 'expand_more' }}</mat-icon>
      </button>
    </div>

    <!-- Collapsible Content -->
    <div class="collapsible-content" *ngIf="isExpanded">

      <div class="charger-summary">
        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">Active power</span>
            <mat-icon class="card-icon">show_chart</mat-icon>
          </div>
          <div class="card-value">{{ totalPower | number:'1.1-1' }} <small>kW</small></div>
          <div class="card-subtitle">All chargers combined</div>
        </div>

        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">Lifetime energy</span>
            <mat-icon class="card-icon">battery_charging_full</mat-icon>
          </div>
          <div class="card-value">{{ totalEnergy | number:'1.1-1' }} <small>kWh</small></div>
          <div class="card-subtitle">Delivered, all chargers</div>
        </div>

        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">Sockets in use</span>
            <mat-icon class="card-icon">bolt</mat-icon>
          </div>
          <div class="card-value">{{ activeSockets }} <span class="dim-slash">/ {{ totalSockets }}</span></div>
          <div class="card-subtitle">Charging right now</div>
        </div>

        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">Active faults</span>
            <mat-icon class="card-icon" [class.is-critical]="activeFaults > 0">warning_amber</mat-icon>
          </div>
          <div class="card-value" [class.is-critical]="activeFaults > 0">{{ activeFaults }}</div>
          <div class="card-subtitle">{{ activeFaults > 0 ? 'Requires attention' : 'All sockets healthy' }}</div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="charger-grid" *ngIf="chargers?.length">
        <revelton-charger-status-card
          *ngFor="let charger of chargers; trackBy: trackById"
          [charger]="charger">
        </revelton-charger-status-card>
      </div>

      <div class="empty-state" *ngIf="!chargers?.length">
        <mat-icon>ev_station</mat-icon>
        <p>No EV chargers found for this property.</p>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.2s ease;
    }
    .section-header:hover { border-color: var(--baseline); }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-wrapper {
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-icon-wrapper mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .header-title h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    .device-badge {
      background: var(--accent-wash);
      color: var(--accent);
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }

    .expand-btn {
      color: var(--muted);
      width: 32px;
      height: 32px;
      line-height: 32px;
      pointer-events: none; /* Let the row handle the click */
    }

    /* Summary Cards — values wear ink; color is reserved for state */
    .charger-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .charger-summary { grid-template-columns: repeat(2, 1fr); }
    }

    .summary-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--muted);
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .card-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--muted);
    }
    .card-icon.is-critical { color: var(--critical); }

    .card-value {
      font-size: 26px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 4px;
      line-height: 1;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .card-value small {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-2);
    }
    .card-value .dim-slash {
      font-size: 26px;
      color: var(--muted);
    }
    .card-value.is-critical { color: var(--critical); }

    .card-subtitle {
      font-size: 12px;
      color: var(--muted);
    }

    /* Grid */
    .charger-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }
    @media (max-width: 470px) {
      .charger-grid { grid-template-columns: 1fr; }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 48px;
      color: var(--muted);
    }
  `]
})
export class EvChargerPanelComponent {
  @Input() chargers: ChargerCardViewModel[] = [];
  @Input() activeSockets = 0;
  @Input() totalSockets = 0;
  @Input() totalPower = 0;
  @Input() totalEnergy = 0;
  @Input() activeSessions = 0;
  @Input() activeFaults = 0;

  isExpanded = true;

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  trackById(_index: number, charger: ChargerCardViewModel): string {
    return charger.deviceId;
  }
}
