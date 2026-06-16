import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChargerCardViewModel } from '../../core/models';

@Component({
  selector: 'revelton-ev-charger-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <!-- Section Header (Clickable Accordion) -->
    <div class="section-header" (click)="toggleExpand()">
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
        <!-- TOTAL kWh TODAY -->
        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">TOTAL kWh TODAY</span>
            <div class="icon-wrapper icon-blue">
              <mat-icon>show_chart</mat-icon>
            </div>
          </div>
          <div class="card-value">{{ totalEnergy | number:'1.1-1' }} <small>kWh</small></div>
          <div class="card-subtitle">All systems combined</div>
        </div>

        <!-- ACTIVE CHARGERS -->
        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">ACTIVE CHARGERS</span>
            <div class="icon-wrapper icon-green">
              <mat-icon>bolt</mat-icon>
            </div>
          </div>
          <div class="card-value">{{ activeCount }} <span class="dim-slash">/ {{ totalCount }}</span></div>
          <div class="card-subtitle">Charging right now</div>
        </div>

        <!-- REVENUE TODAY -->
        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">REVENUE TODAY</span>
            <div class="icon-wrapper icon-yellow">
              <mat-icon>euro</mat-icon>
            </div>
          </div>
          <div class="card-value">€{{ totalRevenue | number:'1.2-2' }}</div>
          <div class="card-subtitle">EV charging sessions</div>
        </div>

        <!-- ACTIVE FAULTS -->
        <div class="summary-card">
          <div class="card-top">
            <span class="card-title">ACTIVE FAULTS</span>
            <div class="icon-wrapper icon-red">
              <mat-icon>warning_amber</mat-icon>
            </div>
          </div>
          <div class="card-value">{{ activeFaults }}</div>
          <div class="card-subtitle">Requires attention</div>
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
      background: #111319;
      border: 1px solid #1f222e;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s ease;
    }
    .section-header:hover {
      background: #141720;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-wrapper {
      color: #3b82f6;
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
      font-weight: 600;
      color: #f8fafc;
    }

    .device-badge {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .expand-btn {
      color: #64748b;
      width: 32px;
      height: 32px;
      line-height: 32px;
      pointer-events: none; /* Let the row handle the click */
    }

    /* Collapsible Content wrapper */
    .collapsible-content {
      /* Animation could be added here if desired */
    }

    /* Summary Cards */
    .charger-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: #111319;
      border: 1px solid #1f222e;
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.8px;
    }

    .icon-wrapper {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-wrapper mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .icon-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .icon-green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .icon-yellow { background: rgba(234, 179, 8, 0.1); color: #eab308; }
    .icon-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .card-value {
      font-size: 28px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 4px;
      line-height: 1;
    }
    .card-value small {
      font-size: 14px;
      font-weight: 500;
      color: #94a3b8;
    }
    .card-value .dim-slash {
      font-size: 28px;
      color: #475569;
    }

    .card-subtitle {
      font-size: 12px;
      color: #64748b;
    }

    /* Grid */
    .charger-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 48px;
      color: #64748b;
    }
  `]
})
export class EvChargerPanelComponent {
  @Input() chargers: ChargerCardViewModel[] = [];
  @Input() activeCount = 0;
  @Input() totalCount = 0;
  @Input() totalPower = 0;
  @Input() totalEnergy = 0;
  @Input() totalRevenue = 0;
  @Input() activeFaults = 0;

  isExpanded = true;

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  trackById(_index: number, charger: ChargerCardViewModel): string {
    return charger.deviceId;
  }
}
