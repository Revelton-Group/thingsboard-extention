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
          <div class="ac-icon-wrap" [style.background]="activeIconBg">
            <mat-icon class="ac-icon" [style.color]="activeColor">volume_up</mat-icon>
          </div>
          <div class="ac-titles">
            <div class="ac-title">Acoustics</div>
            <div class="ac-subtitle">NOISE LEVELS</div>
          </div>
        </div>

        <!-- Center Tabs -->
        <div class="ac-tabs-center" (click)="$event.stopPropagation()">
          <button class="laeq-btn" [class.active]="activeTab === 'laeq'" (click)="selectTab('laeq')">LAeq</button>
          <button class="lai-btn" [class.active]="activeTab === 'lai'" (click)="selectTab('lai')">LAI</button>
          <button class="laimax-btn" [class.active]="activeTab === 'laimax'" (click)="selectTab('laimax')">LAImax</button>
        </div>
        
        <div class="header-right">
          <div class="ac-db-header">
            <span class="val" [style.color]="activeColor">{{ activeValue }}</span>
            <span class="unit">dB</span>
          </div>
          <div class="ac-status" [style.color]="activeStatusColor">
            <span class="ac-status-dot"></span>
            {{ activeStatusLabel }}
          </div>
        </div>
      </div>

      <!-- Info Row -->
      <div class="ac-info-desc">
        <mat-icon class="info-icon" [style.color]="activeColor">info</mat-icon>
        <span>{{ activeDesc }}</span>
      </div>

      <!-- Horizontal Scale Bar -->
      <div class="ac-meter-h-scale">
        <div class="meter-track">
          <div class="indicator-dot" 
               [style.left.%]="activeNoisePercent"
               [style.background]="activeColor"
               [style.box-shadow]="'0 0 15px ' + activeColor"></div>
        </div>
        <div class="meter-labels">
          <span>0</span>
          <span>40</span>
          <span>80+</span>
        </div>
      </div>

      <!-- Main Body -->
      <div class="ac-body-row">
        <div class="ac-chart-container">
          <revelton-historical-chart
            [data]="activeChartData"
            [colors]="[activeColor]"
            yAxisPosition="right"
            [showSplitLine]="false"
            [showYAxisLabels]="false"
            [yAxisMin]="0"
            [yAxisMax]="80"
            [yAxisInterval]="40"
            [showLegend]="false"
            type="bar">
          </revelton-historical-chart>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .ac-card {
      width: 100%;
      height: 100%;
      padding: 16px;
      border-radius: 20px;
      background: var(--panel, rgba(255, 255, 255, 0.03));
      backdrop-filter: blur(10px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #e4e4e7);
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
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.3s ease;
          mat-icon { font-size: 18px; transition: color 0.3s ease; }
        }
        .ac-titles {
          .ac-title { font-size: 14px; font-weight: 700; color: var(--text, #fff); line-height: 1.2; }
          .ac-subtitle { font-size: 9px; font-weight: 700; color: var(--text-muted, rgba(255,255,255,0.3)); letter-spacing: 0.5px; }
        }
      }
 
      .ac-tabs-center {
        display: flex;
        gap: 4px;
        button {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
          border-radius: 8px;
          font-size: 9px;
          font-weight: 800;
          color: var(--text-secondary, rgba(255, 255, 255, 0.4));
          cursor: pointer;
          padding: 4px 8px;
          text-transform: uppercase;
          transition: all 0.2s ease;
          outline: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
 
          &:hover { background: rgba(255, 255, 255, 0.08); color: var(--text, #fff); }
          &.active { 
            color: #fff;
            &.laeq-btn { background: #22c55e; border-color: #22c55e; }
            &.lai-btn { background: #eab308; border-color: #eab308; }
            &.laimax-btn { background: #ef4444; border-color: #ef4444; }
            &:hover {
              color: #fff;
              &.laeq-btn { background: #22c55e; border-color: #22c55e; }
              &.lai-btn { background: #eab308; border-color: #eab308; }
              &.laimax-btn { background: #ef4444; border-color: #ef4444; }
            }
          }
          &:focus { outline: none; }
          &:active { transform: scale(0.95); }
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
          .val { font-size: 22px; font-weight: 700; transition: color 0.3s ease; line-height: 1; }
          .unit { font-size: 11px; font-weight: 600; color: var(--text-muted, rgba(255,255,255,0.5)); }
        }
        .ac-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          transition: color 0.3s ease;
          .ac-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
        }
      }
    }
 
    .ac-info-desc {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--bg, rgba(255, 255, 255, 0.02));
      border-radius: 8px;
      font-size: 11px;
      color: var(--text-secondary, rgba(255, 255, 255, 0.5));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.04));
      margin-top: -4px;
      
      .info-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        transition: color 0.3s ease;
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
      min-height: 100px;
      margin-right: -2px;
      ::ng-deep revelton-historical-chart { height: 100%; display: block; }
    }

    @media (max-width: 1200px) {
      .ac-chart-container {
        min-height: 150px;
        height: 150px;
        flex: none;
      }
    }

    .ac-meter-h-scale {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 12px 0 6px 0;
      padding: 0 4px;
      
      .meter-track {
        height: 6px;
        width: 100%;
        background: linear-gradient(to right, #22C55E, #EAB308, #EF4444);
        border-radius: 3px;
        position: relative;
        
        .indicator-dot {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          border: 1.5px solid #fff;
          border-radius: 50%;
          transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease;
        }
      }
      
      .meter-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary, rgba(255,255,255,0.3));
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
    }

    :host-context([data-mode="light"]) {
      .ac-info-desc {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #64748b;
      }
      .ac-tabs-center button {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #64748b;
        &:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        &.active {
          color: #fff;
          &.laeq-btn { background: #22c55e; border-color: #22c55e; }
          &.lai-btn { background: #eab308; border-color: #eab308; }
          &.laimax-btn { background: #ef4444; border-color: #ef4444; }
          &:hover {
            background-color: inherit;
            border-color: inherit;
            color: #fff;
          }
        }
      }
    }
  `]
})
export class AcousticsPanelComponent {
  @Input() stats: any = {};
  @Input() chartData: any = [];
  @Input() t: any = {};

  activeTab = 'laeq';

  selectTab(tab: string) {
    this.activeTab = tab;
  }

  get activeChartData(): any[] {
    if (!this.chartData) return [];
    if (this.chartData && !Array.isArray(this.chartData)) {
      return this.chartData[this.activeTab] || [];
    }
    return this.chartData;
  }

  get activeColor(): string {
    if (this.activeTab === 'laimax') return '#ef4444'; // red
    if (this.activeTab === 'lai') return '#eab308'; // yellow
    return '#22c55e'; // green
  }

  get activeIconBg(): string {
    if (this.activeTab === 'laimax') return 'rgba(239, 68, 68, 0.1)';
    if (this.activeTab === 'lai') return 'rgba(234, 179, 8, 0.1)';
    return 'rgba(34, 197, 94, 0.1)';
  }

  get activeValue(): number {
    if (this.stats && typeof this.stats === 'object') {
      const statsObj = this.stats[this.activeTab] || this.stats;
      return statsObj?.current ?? 0;
    }
    return 0;
  }

  get activeStatusLabel(): 'Loud' | 'Moderate' | 'Quiet' {
    return noiseStatusLabel(this.activeValue);
  }

  get activeStatusColor(): string {
    const status = this.activeStatusLabel;
    if (status === 'Loud') return '#fb923c'; // orange-400
    if (status === 'Moderate') return '#facc15'; // yellow-400
    return '#22c55e'; // lime-400
  }

  get activeNoisePercent(): number {
    return Math.min(100, (this.activeValue / 80) * 100);
  }

  get activeDesc(): string {
    if (this.activeTab === 'laimax') {
      return 'Maximum Impulse Sound Level — peak noise level recorded during sudden acoustic spikes.';
    }
    if (this.activeTab === 'lai') {
      return 'Impulse Sound Level — tracks sudden, rapid noise changes (such as doors shutting or objects dropping).';
    }
    return 'Equivalent Continuous Sound Level — average energy-equivalent noise level over the selected period.';
  }



  // Backwards compatibility properties
  get statusLabel(): 'Loud' | 'Moderate' | 'Quiet' {
    return this.activeStatusLabel;
  }

  get statusColor(): string {
    return this.activeStatusColor;
  }

  get noisePercent(): number {
    return this.activeNoisePercent;
  }
}
