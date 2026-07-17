import { ChangeDetectionStrategy, Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { ThemeService, ThemeMode } from '../../../../revelton-tb-extension-dashboard/core/services/theme.service';

@Component({
  selector: 'revelton-utility-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <header class="utility-header">
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

          <button class="theme-toggle" type="button"
                  (click)="toggleTheme($event)"
                  [attr.aria-label]="'Switch to ' + (isDark ? 'light' : 'dark') + ' mode'"
                  [attr.title]="isDark ? 'Light mode' : 'Dark mode'">
            <mat-icon>{{ isDark ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

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
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 24px;
    }

    .top-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-box {
      background: var(--accent-wash);
      color: var(--accent);
      border-radius: 6px;
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
      font-weight: 700;
      color: var(--ink);
    }

    .slash {
      color: var(--baseline);
      font-weight: 400;
    }

    .logo-subtitle {
      font-size: 13px;
      font-weight: 500;
      color: var(--muted);
    }

    .top-right {
      display: flex;
      align-items: center;
      gap: 16px;
      color: var(--muted);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--good-text);
      font-weight: 600;
      letter-spacing: 0.5px;
      font-size: 11px;
    }

    .live-indicator .dot {
      width: 6px;
      height: 6px;
      background: var(--good);
      border-radius: 50%;
    }

    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      padding: 0;
      transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    }
    .theme-toggle:hover {
      color: var(--ink);
      border-color: var(--baseline);
      background: var(--accent-wash);
    }
    .theme-toggle:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .theme-toggle mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .wifi-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--muted);
    }

    .clock-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .clock-separator {
      color: var(--baseline);
    }
  `],
})
export class UtilityHeaderComponent implements OnInit, OnDestroy {
  @Input() propertyName = '';

  currentTime = new Date();
  isDark = true;

  private timerSub?: Subscription;
  private themeSub?: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
  ) {}

  ngOnInit() {
    this.timerSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    });

    this.isDark = this.themeService.activeMode === 'dark';
    this.themeSub = this.themeService.mode$.subscribe(mode => {
      this.isDark = mode === 'dark';
      this.cdr.markForCheck();
    });
  }

  toggleTheme(event: Event): void {
    event.stopPropagation();
    this.themeService.toggleMode();
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }
}
