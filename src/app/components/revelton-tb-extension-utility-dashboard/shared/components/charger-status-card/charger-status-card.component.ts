import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChargerCardViewModel, ChargerStationViewModel } from '../../../core/models';
import { MatDialog } from '@angular/material/dialog';
import { EvStationHistoryModalComponent } from '../ev-station-history-modal/ev-station-history-modal.component';

@Component({
  selector: 'revelton-charger-status-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="charger-card" [ngClass]="getCardTopBorderClass()">
      <div class="card-header">
        <div class="header-titles">
          <div class="device-code">{{ charger.deviceCode }}</div>
          <div class="device-name">{{ charger.deviceName }}</div>
        </div>
        <div class="badge-tln">
          <mat-icon>place</mat-icon>
          Tallin
        </div>
      </div>

      <div class="stations-container">
        <!-- Station A -->
        <div class="station-col" (click)="openStationHistory(charger.stationA)">
          <div class="station-title">Station A</div>
          
          <div class="status-section">
            <div class="status-icon" [ngClass]="charger.stationA.status">
              <mat-icon *ngIf="charger.stationA.status === 'charging'">bolt</mat-icon>
              <mat-icon *ngIf="charger.stationA.status === 'idle'">check</mat-icon>
              <mat-icon *ngIf="charger.stationA.status === 'error'">warning_amber</mat-icon>
              <mat-icon *ngIf="charger.stationA.status === 'unavailable'">signal_cellular_off</mat-icon>
            </div>
            <div class="status-text" [ngClass]="charger.stationA.status">{{ charger.stationA.statusLabel }}</div>
            <div class="status-sub" *ngIf="charger.stationA.status === 'charging'">
              <mat-icon>schedule</mat-icon> Since {{ charger.stationA.chargingSince }}
            </div>
            <div class="status-sub error" *ngIf="charger.stationA.status === 'error'">
              {{ charger.stationA.statusReason }}
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-label">POWER</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationA.powerKw !== null">{{ charger.stationA.powerKw | number:'1.1-1' }} <small>kW</small></ng-container>
                <ng-container *ngIf="charger.stationA.powerKw === null">-</ng-container>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">DELIVERED</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationA.deliveredKwh !== null">{{ charger.stationA.deliveredKwh | number:'1.1-1' }} <small>kWh</small></ng-container>
                <ng-container *ngIf="charger.stationA.deliveredKwh === null">-</ng-container>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">BATTERY</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationA.batteryPct !== null">{{ charger.stationA.batteryPct }}%</ng-container>
                <ng-container *ngIf="charger.stationA.batteryPct === null">-</ng-container>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">SESSION €</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationA.sessionEuro !== null">€{{ charger.stationA.sessionEuro | number:'1.2-2' }}</ng-container>
                <ng-container *ngIf="charger.stationA.sessionEuro === null">-</ng-container>
              </div>
            </div>
          </div>

          <div class="station-footer">
            <div class="heartbeat">
              <mat-icon>favorite</mat-icon> Heartbeat: {{ charger.heartbeatAgo }}
            </div>
            <div class="action-buttons">
              <button class="btn-outline"><mat-icon>refresh</mat-icon> Reboot</button>
              <button class="btn-outline"><mat-icon>lock_open</mat-icon> Unlock</button>
            </div>
          </div>
        </div>

        <div class="station-divider"></div>

        <!-- Station B -->
        <div class="station-col" (click)="openStationHistory(charger.stationB)">
          <div class="station-title">Station B</div>
          
          <div class="status-section">
            <div class="status-icon" [ngClass]="charger.stationB.status">
              <mat-icon *ngIf="charger.stationB.status === 'charging'">bolt</mat-icon>
              <mat-icon *ngIf="charger.stationB.status === 'idle'">check</mat-icon>
              <mat-icon *ngIf="charger.stationB.status === 'error'">warning_amber</mat-icon>
              <mat-icon *ngIf="charger.stationB.status === 'unavailable'">signal_cellular_off</mat-icon>
            </div>
            <div class="status-text" [ngClass]="charger.stationB.status">{{ charger.stationB.statusLabel }}</div>
            <div class="status-sub" *ngIf="charger.stationB.status === 'charging'">
              <mat-icon>schedule</mat-icon> Since {{ charger.stationB.chargingSince }}
            </div>
            <div class="status-sub error" *ngIf="charger.stationB.status === 'error'">
              {{ charger.stationB.statusReason }}
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-label">POWER</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationB.powerKw !== null">{{ charger.stationB.powerKw | number:'1.1-1' }} <small>kW</small></ng-container>
                <ng-container *ngIf="charger.stationB.powerKw === null">-</ng-container>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">DELIVERED</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationB.deliveredKwh !== null">{{ charger.stationB.deliveredKwh | number:'1.1-1' }} <small>kWh</small></ng-container>
                <ng-container *ngIf="charger.stationB.deliveredKwh === null">-</ng-container>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">BATTERY</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationB.batteryPct !== null">{{ charger.stationB.batteryPct }}%</ng-container>
                <ng-container *ngIf="charger.stationB.batteryPct === null">-</ng-container>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">SESSION €</div>
              <div class="metric-value">
                <ng-container *ngIf="charger.stationB.sessionEuro !== null">€{{ charger.stationB.sessionEuro | number:'1.2-2' }}</ng-container>
                <ng-container *ngIf="charger.stationB.sessionEuro === null">-</ng-container>
              </div>
            </div>
          </div>

          <div class="station-footer">
            <div class="heartbeat">
              <mat-icon>favorite</mat-icon> Heartbeat: {{ charger.heartbeatAgo }}
            </div>
            <div class="action-buttons">
              <button class="btn-outline"><mat-icon>refresh</mat-icon> Reboot</button>
              <button class="btn-outline"><mat-icon>lock_open</mat-icon> Unlock</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .charger-card {
      background: #111319;
      border: 1px solid #1f222e;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-top: 3px solid #1f222e; /* default top border */
    }

    .charger-card.top-blue { border-top-color: #3b82f6; }
    .charger-card.top-red { border-top-color: #ef4444; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      border-bottom: 1px solid #1f222e;
    }

    .header-titles .device-code {
      font-size: 16px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 2px;
    }
    .header-titles .device-name {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }

    .badge-tln {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .badge-tln mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .stations-container {
      display: flex;
      flex-direction: row;
    }

    .station-divider {
      width: 1px;
      background: #1f222e;
    }

    .station-col {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 6px;
      position: relative;
    }
    .station-col:hover {
      background: rgba(59, 130, 246, 0.04);
      box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.3);
    }

    .station-title {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 16px;
    }

    /* Status Section */
    .status-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
      min-height: 100px;
      justify-content: center;
    }

    .status-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      border: 1px solid transparent;
    }
    .status-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .status-icon.idle {
      border-color: #10b981;
      color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }
    .status-icon.charging {
      border-color: #3b82f6;
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
    }
    .status-icon.error {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }

    .status-text {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .status-text.idle { color: #10b981; }
    .status-text.charging { color: #3b82f6; }
    .status-text.error { color: #ef4444; }

    .status-sub {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #64748b;
    }
    .status-sub mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .status-sub.error {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 10px;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
    }
    .metric-value small {
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
    }

    /* Footer */
    .station-footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .heartbeat {
      font-size: 11px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .heartbeat mat-icon { font-size: 10px; width: 10px; height: 10px; }

    .action-buttons {
      display: flex;
      gap: 8px;
    }
    .btn-outline {
      flex: 1;
      background: transparent;
      border: 1px solid #1f222e;
      color: #94a3b8;
      border-radius: 6px;
      padding: 6px 0;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-outline mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .btn-outline:hover {
      background: #1f222e;
      color: #f8fafc;
    }
  `]
})
export class ChargerStatusCardComponent {
  @Input() charger!: ChargerCardViewModel;

  constructor(private dialog: MatDialog) {}

  openStationHistory(station: ChargerStationViewModel): void {
    this.dialog.open(EvStationHistoryModalComponent, {
      panelClass: 'custom-dialog-container',
      data: {
        station,
        deviceName: this.charger.deviceName,
        deviceId: this.charger.deviceId
      }
    });
  }

  getCardTopBorderClass(): string {
    if (this.charger?.stationA?.status === 'error' || this.charger?.stationB?.status === 'error') {
      return 'top-red';
    }
    if (this.charger?.stationA?.status === 'charging' || this.charger?.stationB?.status === 'charging') {
      return 'top-blue';
    }
    return '';
  }
}
