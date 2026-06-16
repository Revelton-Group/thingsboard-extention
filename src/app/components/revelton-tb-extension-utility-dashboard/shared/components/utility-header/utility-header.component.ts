import { ChangeDetectionStrategy, Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'revelton-utility-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <header class="utility-header">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="top-left">
          <div class="logo-box">
            <mat-icon>bolt</mat-icon>
          </div>
          <span class="logo-title">Revelton</span>
          <span class="slash">/</span>
          <span class="logo-subtitle">Infrastructure Monitor</span>
        </div>

        <div class="top-right">
          <div class="live-indicator">
            <span class="dot"></span>
            LIVE
          </div>
          <mat-icon class="wifi-icon">wifi</mat-icon>
          <div class="clock-display">
            {{ currentTime | date:'HH:mm:ss' }} <span class="clock-separator">|</span> {{ currentTime | date:'dd MMM yyyy' }}
          </div>
        </div>
      </div>

    </header>
  `,
  styles: [`
    :host { display: block; }

    .utility-header {
      display: flex;
      flex-direction: column;
      background: #0D0F14; /* Deep dark background matching the design */
      border-bottom: 1px solid #1a1d27;
      flex-shrink: 0;
    }

    /* Top Bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 24px;
      border-bottom: 1px solid #1a1d27;
      background: #0D0F14;
    }

    .top-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-box {
      background: #0f172a;
      color: #3b82f6;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-box mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .logo-title {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
    }

    .slash {
      color: #334155;
      font-weight: 400;
    }

    .logo-subtitle {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
    }

    .location-pill {
      margin-left: 12px;
      background: rgba(14, 165, 233, 0.1);
      color: #38bdf8;
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid rgba(14, 165, 233, 0.2);
      font-size: 11px;
      font-weight: 500;
    }

    .top-right {
      display: flex;
      align-items: center;
      gap: 16px;
      color: #64748b;
      font-size: 12px;
      font-family: monospace; /* Monospaced for clock */
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #10b981;
      font-weight: 600;
      font-family: sans-serif;
      letter-spacing: 0.5px;
    }

    .live-indicator .dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 6px #10b981;
    }

    .wifi-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #64748b;
    }

    .clock-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .clock-separator {
      color: #334155;
    }

    /* Main Title Area */
    .main-title-area {
      padding: 32px 24px;
      background: #0D0F14;
    }

    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.5px;
    }

    .subtitle {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
  `],
})
export class UtilityHeaderComponent implements OnInit, OnDestroy {
  @Input() propertyName = '';
  
  currentTime = new Date();
  private timerSub?: Subscription;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.timerSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
  }
}
