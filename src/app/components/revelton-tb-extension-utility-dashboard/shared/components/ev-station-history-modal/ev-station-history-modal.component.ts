import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChargerStationViewModel } from '../../../core/models';

export interface StationHistoryModalData {
  station: ChargerStationViewModel;
  deviceName: string;
  deviceId: string;
}

@Component({
  selector: 'revelton-ev-station-history-modal',
  standalone: false,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-wrapper">
      <div class="modal-header">
        <div class="header-content">
          <div class="device-code-top">{{ data.station.name === 'Station A' ? 'CC-TLN-01-A' : 'CC-TLN-01-B' }}</div>
          <div class="modal-title">
            {{ data.station.name }} — {{ data.deviceName }}
          </div>
          <div class="modal-subtitle">{{ data.deviceName }} · Parking Level B1</div>
        </div>

        <div class="header-actions">
          <div class="time-range-pill">
            <button [class.active]="activeRange === '6H'" (click)="activeRange = '6H'">6H</button>
            <button [class.active]="activeRange === '12H'" (click)="activeRange = '12H'">12H</button>
            <button [class.active]="activeRange === '24H'" (click)="activeRange = '24H'">24H</button>
          </div>
          
          <button class="close-box" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div class="chart-wrapper">
          <revelton-historical-chart
            title="Power (kW)"
            icon="show_chart"
            [data]="powerData"
            [colors]="['#38bdf8']"
            type="line"
            [area]="false"
            [showSplitLine]="true"
            yAxisPosition="left"
            [showLegend]="false">
          </revelton-historical-chart>
        </div>
        <div class="chart-wrapper">
          <revelton-historical-chart
            title="Energy Delivered (kWh)"
            icon="bar_chart"
            [data]="energyData"
            [colors]="['#818cf8']"
            type="bar"
            [showSplitLine]="true"
            yAxisPosition="left"
            [showLegend]="false">
          </revelton-historical-chart>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="stat-item">
          <div class="stat-label">Current Status</div>
          <div class="stat-value" [ngClass]="data.station.status">
            {{ data.station.statusLabel }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Delivered (Session)</div>
          <div class="stat-value">
            {{ data.station.deliveredKwh !== null ? (data.station.deliveredKwh | number:'1.1-1') + ' kWh' : '-' }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Global Dialog Overrides to fix white corners */
    .custom-dialog-container {
      background: transparent !important;
      box-shadow: none !important;
    }
    
    .custom-dialog-container .mat-mdc-dialog-container,
    .custom-dialog-container .mat-dialog-container {
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 12px !important;
      overflow: hidden !important;
    }

    .custom-dialog-container .mat-mdc-dialog-surface,
    .custom-dialog-container .mat-dialog-surface {
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 12px !important;
    }

    .modal-wrapper {
      background: #11141A;
      color: #f8fafc;
      width: 850px;
      max-width: 95vw;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      font-family: 'Inter', Roboto, sans-serif;
    }
    .modal-header {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .header-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .device-code-top {
      font-size: 11px;
      color: #64748b;
      letter-spacing: 0.5px;
      font-family: monospace;
    }
    .modal-title {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
    .modal-subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .time-range-pill {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      display: flex;
      padding: 3px;
    }
    .time-range-pill button {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .time-range-pill button.active {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .close-box {
      width: 38px;
      height: 38px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .close-box:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }
    .close-box mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .modal-body {
      padding: 20px;
      height: 580px;
      box-sizing: border-box;
      background: #0B0C10;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }
    .chart-wrapper {
      width: 100%;
      min-height: 240px;
      flex: 1;
    }
    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      gap: 24px;
      background: #11141A;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
    }
    .stat-value.charging { color: #3b82f6; }
    .stat-value.idle { color: #10b981; }
    .stat-value.error { color: #ef4444; }
    .stat-value.unavailable { color: #64748b; }
  `]
})
export class EvStationHistoryModalComponent implements OnInit {
  
  public activeRange: string = '24H';
  powerData: any[] = [];
  energyData: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<EvStationHistoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StationHistoryModalData
  ) {}

  ngOnInit(): void {
    this.generateMockData();
  }

  close(): void {
    this.dialogRef.close();
  }

  private generateMockData() {
    const now = new Date().getTime();
    const values = [];
    
    // Generate 24 hours of data points (one every 30 mins)
    for (let i = 48; i >= 0; i--) {
      const ts = now - (i * 30 * 60 * 1000);
      
      // Simulate charging sessions
      let power = 0;
      const hourOfDay = new Date(ts).getHours();
      
      // High probability of charging in evening and morning
      if ((hourOfDay >= 18 && hourOfDay <= 23) || (hourOfDay >= 7 && hourOfDay <= 9)) {
        power = 11.0 + (Math.random() * 0.5 - 0.25); // ~11kW
      } else if (Math.random() > 0.8) {
        // Random daytime charging
        power = 7.4 + (Math.random() * 0.5 - 0.25); // ~7.4kW
      }
      
      // If the current status is active, ensure the latest points are active
      if (this.data.station.status === 'charging' && i < 4) {
        power = this.data.station.powerKw || 11.2;
      }
      // If error or idle, ensure latest points are 0
      if ((this.data.station.status === 'idle' || this.data.station.status === 'error') && i < 2) {
        power = 0;
      }

      // Smooth slightly (no negative)
      power = Math.max(0, power);
      
      values.push([ts, Math.round(power * 10) / 10]);
    }

    this.powerData = [{
      name: 'Power (kW)',
      values: values
    }];

    // Generate bar chart data for energy (24 bars)
    const energyValues = [];
    for (let i = 23; i >= 0; i--) {
      const ts = now - (i * 60 * 60 * 1000);
      let energy = 0;
      const hourOfDay = new Date(ts).getHours();
      
      if ((hourOfDay >= 18 && hourOfDay <= 23) || (hourOfDay >= 7 && hourOfDay <= 9)) {
        energy = 15 + Math.random() * 10;
      } else if (Math.random() > 0.6) {
        energy = 5 + Math.random() * 10;
      } else {
        energy = Math.random() * 3;
      }
      
      energyValues.push([ts, Math.round(energy * 10) / 10]);
    }

    this.energyData = [{
      name: 'Energy (kWh)',
      values: energyValues
    }];
  }
}
