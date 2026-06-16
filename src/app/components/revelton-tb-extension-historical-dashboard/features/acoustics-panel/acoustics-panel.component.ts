import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Returns the noise status label — pure, no side effects */
export function noiseStatusLabel(current: number): 'Loud' | 'Moderate' | 'Quiet' {
  if (current > 60) return 'Loud';
  if (current > 40) return 'Moderate';
  return 'Quiet';
}

@Component({
  selector: 'revelton-acoustics-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="ac-card">
      <!-- Header Area -->
      <div class="ac-header">
        <div class="header-left">
          <div class="ac-icon-wrap">
            <mat-icon class="ac-icon">volume_up</mat-icon>
          </div>
          <div class="ac-titles">
            <div class="ac-title">Acoustics</div>
            <div class="ac-subtitle">NOISE LEVELS</div>
          </div>
        </div>
        
        <div class="header-right">
          <div class="ac-db-header">
            <span class="val">{{ stats.current }}</span>
            <span class="unit">dB</span>
          </div>
          <div class="ac-status" [style.color]="statusColor">
            <span class="ac-status-dot"></span>
            {{ statusLabel }}
          </div>
        </div>
      </div>

      <!-- Main Body -->
      <div class="ac-body-row">
        <div class="ac-chart-container">
          <revelton-historical-chart
            [data]="chartData"
            [colors]="['#22c55e']"
            yAxisPosition="right"
            [showSplitLine]="false"
            [showYAxisLabels]="false"
            [yAxisMin]="0"
            [yAxisMax]="80"
            [yAxisInterval]="40"
            type="bar">
          </revelton-historical-chart>
        </div>

        <div class="ac-meter-v-scale">
          <div class="meter-track">
            <div class="indicator-dot" [style.bottom.%]="noisePercent"></div>
          </div>
          <div class="meter-labels">
            <span>80+</span>
            <span>40</span>
            <span>0</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ac-card {
      width: 100%;
      height: 100%;
      padding: 16px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e4e4e7;
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.03), 0 4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;

      &:hover {
        border-color: rgba(34, 197, 94, 0.4);
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
      }
    }

    .ac-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        .ac-icon-wrap {
          width: 36px; height: 36px;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          mat-icon { color: #22c55e; font-size: 18px; }
        }
        .ac-titles {
          .ac-title { font-size: 14px; font-weight: 700; color: #fff; line-height: 1.2; }
          .ac-subtitle { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.3); letter-spacing: 0.5px; }
        }
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
        .ac-db-header {
          display: flex;
          align-items: baseline;
          gap: 2px;
          .val { font-size: 22px; font-weight: 700; color: #22c55e; line-height: 1; }
          .unit { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); }
        }
        .ac-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          .ac-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
        }
      }
    }

    .ac-body-row {
      display: flex;
      flex: 1;
      gap: 6px;
      min-height: 0;
    }

    .ac-chart-container {
      flex: 1;
      min-height: 0;
      margin-right: -2px;
      ::ng-deep revelton-historical-chart { height: 100%; display: block; }
    }

    .ac-meter-v-scale {
      display: flex;
      gap: 6px;
      width: 44px;
      padding: 0 0 2px 0; /* Slightly raised to match chart baseline */
      .meter-track {
        width: 6px;
        height: 100%;
        background: linear-gradient(to top, #22C55E, #EAB308, #EF4444);
        border-radius: 3px;
        position: relative;
        .indicator-dot {
          position: absolute;
          left: 50%;
          transform: translate(-50%, 50%);
          width: 12px;
          height: 12px;
          background: #22c55e;
          border: 1.5px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 15px #22c55e;
          transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      }
      .meter-labels {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 700;
        color: rgba(255,255,255,0.3);
        padding: 4px 0;
        font-variant-numeric: tabular-nums;
      }
    }
  `]
})
export class AcousticsPanelComponent {
  @Input() stats: any = {};
  @Input() chartData: any[] = [];
  @Input() t: any = {};

  get statusLabel(): 'Loud' | 'Moderate' | 'Quiet' {
    return noiseStatusLabel(this.stats?.current ?? 0);
  }

  get statusColor(): string {
    const status = this.statusLabel;
    if (status === 'Loud') return '#fb923c'; // orange-400
    if (status === 'Moderate') return '#facc15'; // yellow-400
    return '#22c55e'; // lime-400
  }

  get noisePercent(): number {
    const val = this.stats?.current ?? 0;
    return Math.min(100, (val / 80) * 100);
  }
}
