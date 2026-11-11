import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnInit, OnDestroy, Output, ChangeDetectorRef } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { ThemeService } from '../../services/theme.service';

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

          <div class="view-menu" *ngIf="views.length > 1">
            <button class="view-btn" type="button" aria-haspopup="menu"
                    [attr.aria-expanded]="menuOpen"
                    (click)="toggleMenu($event)">
              <mat-icon>{{ currentView?.icon }}</mat-icon>
              {{ currentView?.label }}
              <mat-icon>expand_more</mat-icon>
            </button>
            <div class="view-list" role="menu" *ngIf="menuOpen">
              <button type="button" role="menuitemradio"
                      *ngFor="let v of views"
                      [class.on]="v.id === view"
                      [attr.aria-checked]="v.id === view"
                      (click)="pickView(v.id)">
                <mat-icon>{{ v.icon }}</mat-icon>
                <span>{{ v.label }}</span>
                <mat-icon class="check" *ngIf="v.id === view">check</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <div class="top-right">
          <div class="live-indicator" *ngIf="live">
            <span class="dot"></span>
            LIVE
          </div>

          <button class="theme-toggle" type="button"
                  (click)="toggleTheme($event)"
                  [attr.aria-label]="'Switch to ' + (isDark ? 'light' : 'dark') + ' mode'"
                  [attr.title]="isDark ? 'Light mode' : 'Dark mode'">
            <mat-icon>{{ isDark ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

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

    .view-menu {
      position: relative;
      margin-left: 6px;
    }

    .view-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 8px 0 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: transparent;
      color: var(--ink);
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .view-btn:hover {
      border-color: var(--baseline);
      background: var(--accent-wash);
    }
    .view-btn:focus-visible,
    .view-list button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .view-btn mat-icon,
    .view-list mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .view-btn mat-icon:first-child,
    .view-list mat-icon:first-child {
      color: var(--accent);
    }

    .view-list {
      position: absolute;
      top: 36px;
      left: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 200px;
      padding: 6px;
      background: var(--surface);
      border: 1px solid var(--baseline);
      border-radius: 10px;
      box-shadow: var(--shadow);
    }
    .view-list button {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 10px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--ink);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
    }
    .view-list button:hover { background: var(--accent-wash); }
    .view-list button.on { font-weight: 700; }
    .view-list span { flex: 1; }
    .view-list .check { color: var(--muted); }

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
  @Input() views: { id: string; label: string; icon: string }[] = [];
  @Input() view = '';
  @Input() live = true;
  @Output() viewChange = new EventEmitter<string>();

  menuOpen = false;

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

  get currentView(): { id: string; label: string; icon: string } | undefined {
    return this.views.find(v => v.id === this.view);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  pickView(id: string): void {
    this.menuOpen = false;
    if (id !== this.view) this.viewChange.emit(id);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen = false;
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
