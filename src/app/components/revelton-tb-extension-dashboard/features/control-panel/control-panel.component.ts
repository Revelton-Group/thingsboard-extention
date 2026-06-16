import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ControlPanelService } from './services/control-panel.service';
import { TranslationService } from '../../core/services/translation.service';
import {
  ControlPanelSection,
  ControlPanelSectionId,
  ControlPanelConfig,
  DEFAULT_CONTROL_PANEL_CONFIG,
  WEEKDAYS,
  Weekday,
  MEWS_SYNC_OPTIONS,
  TelegramAlertLevel,
} from './models/control-panel.models';

@Component({
  selector: 'tb-control-panel',
  template: `
    <!-- Backdrop -->
    <div class="cp-backdrop" *ngIf="isOpen" (click)="close()"></div>

    <!-- Sliding panel -->
    <div class="cp-panel" [class.cp-panel--open]="isOpen">

      <!-- Header -->
      <div class="cp-header">
        <div class="cp-header-title">
          <i class="material-icons">settings</i>
          <span>{{ t.cpTitle }}</span>
        </div>
        <button class="cp-close-btn" (click)="close()">
          <i class="material-icons">close</i>
        </button>
      </div>

      <!-- Body -->
      <div class="cp-body">

        <!-- Sidebar -->
        <nav class="cp-sidebar">
          <button
            class="cp-nav-item"
            *ngFor="let s of sections"
            [class.cp-nav-item--active]="activeSection === s.id"
            (click)="navigateTo(s.id)"
          >
            <i class="material-icons">{{ s.icon }}</i>
            <span>{{ getSidebarLabel(s.id) }}</span>
          </button>
        </nav>

        <!-- Content -->
        <div class="cp-content">

          <!-- ── THERMOSTAT AUTOMATION ── -->
          <ng-container *ngIf="activeSection === 'thermostat'">
            <div class="cp-section">
              <div class="cp-section-header">
                <i class="material-icons">thermostat</i>
                <div>
                  <h2>{{ t.cpThermostatAuto }}</h2>
                  <p class="cp-section-subtitle">{{ t.cpThermostatDesc }}</p>
                </div>
                <label class="cp-toggle">
                  <input type="checkbox" [(ngModel)]="config.thermostat.enabled">
                  <span class="cp-toggle-track"></span>
                </label>
              </div>

              <div class="cp-card" [class.cp-disabled]="!config.thermostat.enabled">

                <!-- Days -->
                <div class="cp-field">
                  <label class="cp-label">{{ t.cpActiveDays }}</label>
                  <div class="cp-day-picker">
                    <button
                      class="cp-day-btn"
                      *ngFor="let day of weekdays"
                      [class.cp-day-btn--active]="isDaySelected(day)"
                      [disabled]="!config.thermostat.enabled"
                      (click)="toggleDay(day)"
                    >{{ getWeekdayName(day) }}</button>
                  </div>
                </div>

                <!-- Time range -->
                <div class="cp-row">
                  <div class="cp-field">
                    <label class="cp-label">{{ t.cpStartTime }}</label>
                    <input class="cp-input" type="time" [(ngModel)]="config.thermostat.startTime" [disabled]="!config.thermostat.enabled">
                  </div>
                  <div class="cp-field">
                    <label class="cp-label">{{ t.cpEndTime }}</label>
                    <input class="cp-input" type="time" [(ngModel)]="config.thermostat.endTime" [disabled]="!config.thermostat.enabled">
                  </div>
                </div>

                <!-- Exercise temperature -->
                <div class="cp-field">
                  <label class="cp-label">{{ t.cpExerciseTemp }}</label>
                  <div class="cp-slider-row">
                    <input class="cp-slider" type="range" min="20" max="40" step="1"
                      [(ngModel)]="config.thermostat.exerciseTemp"
                      [disabled]="!config.thermostat.enabled">
                    <span class="cp-slider-value">{{ config.thermostat.exerciseTemp }}°C</span>
                  </div>
                  <p class="cp-hint">{{ t.cpExerciseHint }}</p>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ── WINDOW ALERT ── -->
          <ng-container *ngIf="activeSection === 'window'">
            <div class="cp-section">
              <div class="cp-section-header">
                <i class="material-icons">window</i>
                <div>
                  <h2>{{ t.cpWindowAlert }}</h2>
                  <p class="cp-section-subtitle">{{ t.cpWindowAlertDesc }}</p>
                </div>
                <label class="cp-toggle">
                  <input type="checkbox" [(ngModel)]="config.window.enabled">
                  <span class="cp-toggle-track"></span>
                </label>
              </div>

              <div class="cp-card" [class.cp-disabled]="!config.window.enabled">

                <div class="cp-field">
                  <label class="cp-label">{{ t.cpAlertThreshold }}</label>
                  <div class="cp-slider-row">
                    <input class="cp-slider" type="range" min="1" max="12" step="1"
                      [(ngModel)]="config.window.thresholdHours"
                      [disabled]="!config.window.enabled">
                    <span class="cp-slider-value">{{ config.window.thresholdHours }}h</span>
                  </div>
                  <p class="cp-hint">{{ t.cpAlertThresholdHint }}</p>
                </div>

                <div class="cp-info-box">
                  <i class="material-icons">info_outline</i>
                  <span>{{ t.cpWindowSetTo }} <strong>{{ config.window.thresholdHours }} h.</strong> {{ t.cpWindowHoursContinuous }}</span>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ── MEWS SYNC ── -->
          <ng-container *ngIf="activeSection === 'mews'">
            <div class="cp-section">
              <div class="cp-section-header">
                <i class="material-icons">sync</i>
                <div>
                  <h2>{{ t.cpMewsSync }}</h2>
                  <p class="cp-section-subtitle">{{ t.cpMewsSyncDesc }}</p>
                </div>
              </div>

              <div class="cp-card">

                <div class="cp-field">
                  <label class="cp-label">{{ t.cpSyncFrequency }}</label>
                  <div class="cp-chip-group">
                    <button
                      class="cp-chip"
                      *ngFor="let opt of mewsOptions"
                      [class.cp-chip--active]="config.mews.intervalMinutes === opt.value"
                      (click)="config.mews.intervalMinutes = opt.value"
                    >{{ opt.label }}</button>
                  </div>
                  <p class="cp-hint">{{ t.cpSyncFrequencyHint }}</p>
                </div>

                <div class="cp-info-box">
                  <i class="material-icons">schedule</i>
                  <span>{{ t.cpNextSyncScheduled }} <strong>{{ mewsLabel }}</strong>.</span>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ── TELEGRAM NOTIFICATIONS ── -->
          <ng-container *ngIf="activeSection === 'telegram'">
            <div class="cp-section">
              <div class="cp-section-header">
                <i class="material-icons">send</i>
                <div>
                  <h2>{{ t.cpTelegramTitle }}</h2>
                  <p class="cp-section-subtitle">{{ t.cpTelegramDesc }}</p>
                </div>
                <label class="cp-toggle">
                  <input type="checkbox" [(ngModel)]="config.telegram.enabled">
                  <span class="cp-toggle-track"></span>
                </label>
              </div>

              <div class="cp-card" style="gap: 12px; padding: 16px;" [class.cp-disabled]="!config.telegram.enabled">

                <div class="cp-row" style="gap: 20px;">
                  <!-- Alert level -->
                  <div class="cp-field" style="flex: 1.2;">
                    <label class="cp-label">{{ t.cpAlertLevel }}</label>
                    <div class="cp-alert-level-group cp-alert-level-group--vertical">

                      <label class="cp-radio-card" [class.cp-radio-card--active]="config.telegram.alertLevel === 'danger'">
                        <input type="radio" name="alertLevel" value="danger"
                          [(ngModel)]="config.telegram.alertLevel"
                          [disabled]="!config.telegram.enabled">
                        <div class="cp-radio-content">
                          <span class="cp-dot cp-dot--danger"></span>
                          <div class="cp-radio-title">{{ t.cpDangerOnly }}</div>
                        </div>
                      </label>

                      <label class="cp-radio-card" [class.cp-radio-card--active]="config.telegram.alertLevel === 'warning_and_above'">
                        <input type="radio" name="alertLevel" value="warning_and_above"
                          [(ngModel)]="config.telegram.alertLevel"
                          [disabled]="!config.telegram.enabled">
                        <div class="cp-radio-content">
                          <span class="cp-dot cp-dot--warning"></span>
                          <div class="cp-radio-title">{{ t.cpWarningAndAbove }}</div>
                        </div>
                      </label>

                      <label class="cp-radio-card" [class.cp-radio-card--active]="config.telegram.alertLevel === 'all'">
                        <input type="radio" name="alertLevel" value="all"
                          [(ngModel)]="config.telegram.alertLevel"
                          [disabled]="!config.telegram.enabled">
                        <div class="cp-radio-content">
                          <span class="cp-dot cp-dot--all"></span>
                          <div class="cp-radio-title">{{ t.cpAllAlerts }}</div>
                        </div>
                      </label>

                    </div>
                    <p class="cp-hint" style="margin-top: 6px;">{{ telegramDesc }}</p>
                  </div>

                  <!-- Message Preview -->
                  <div class="cp-field" style="flex: 1;" *ngIf="config.telegram.enabled">
                    <label class="cp-label">{{ t.cpPreview }}</label>
                    <div class="cp-telegram-preview">
                      <div class="cp-telegram-bubble">
                        <div class="cp-telegram-header">🏨 Revelton Hotel Bot</div>
                        <div class="cp-telegram-body" [innerHTML]="telegramPreview"></div>
                        <div class="cp-telegram-time">14:30</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="cp-info-box cp-info-box--warning">
                  <i class="material-icons">lock</i>
                  <span>{{ t.cpBotTokenHint }}</span>
                </div>

              </div>
            </div>
          </ng-container>

        </div>
      </div>

      <!-- Footer -->
      <div class="cp-footer">
        <button class="cp-btn cp-btn--secondary" (click)="resetToDefaults()">{{ t.cpResetDefaults }}</button>
        <button class="cp-btn cp-btn--primary" (click)="save()">
          <i class="material-icons">save</i>
          {{ t.cpSaveChanges }}
        </button>
      </div>

    </div>
  `,
  styleUrls: ['./control-panel.component.scss'],
  standalone: false,
})
export class ControlPanelComponent implements OnInit, OnDestroy {
  isOpen = false;
  activeSection: ControlPanelSectionId = 'thermostat';
  sections: ControlPanelSection[] = [];
  weekdays = WEEKDAYS;
  mewsOptions = MEWS_SYNC_OPTIONS;

  config: ControlPanelConfig = JSON.parse(JSON.stringify(DEFAULT_CONTROL_PANEL_CONFIG));

  private _subs = new Subscription();

  constructor(
    private controlPanelService: ControlPanelService,
    private translationService: TranslationService
  ) {}

  get t() {
    return this.translationService.t;
  }

  getSidebarLabel(id: string): string {
    switch(id) {
      case 'thermostat': return this.t.thermostats || 'Thermostats';
      case 'window': return this.t.cpWindowAlert || 'Window Alert';
      case 'mews': return this.t.mewsBridge || 'Mews Bridge';
      case 'telegram': return this.t.cpTelegramTitle || 'Telegram Notifications';
      default: return id;
    }
  }

  getWeekdayName(day: string): string {
    const mapEN: any = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };
    const mapRU: any = { Mon: 'Пн', Tue: 'Вт', Wed: 'Ср', Thu: 'Чт', Fri: 'Пт', Sat: 'Сб', Sun: 'Вс' };
    return this.translationService.activeLangCode === 'RU' ? mapRU[day] : mapEN[day];
  }

  ngOnInit(): void {
    this.sections = this.controlPanelService.sections;
    this._subs.add(this.controlPanelService.isOpen$.subscribe(v => (this.isOpen = v)));
    this._subs.add(this.controlPanelService.activeSection$.subscribe(v => (this.activeSection = v)));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get mewsLabel(): string {
    return MEWS_SYNC_OPTIONS.find(o => o.value === this.config.mews.intervalMinutes)?.label ?? `${this.config.mews.intervalMinutes} min`;
  }

  get telegramDesc(): string {
    switch (this.config.telegram.alertLevel) {
      case 'danger': return this.t.cpDangerDesc;
      case 'warning_and_above': return this.t.cpWarningDesc;
      case 'all': return this.t.cpAllAlertsDesc;
      default: return '';
    }
  }

  get telegramPreview(): string {
    switch (this.config.telegram.alertLevel) {
      case 'danger': 
        return `🚨 <b>${this.t.cpCritAlert}</b><br>${this.t.room}: 402<br>${this.t.cpSensor}: ${this.t.waterLeak}<br>${this.t.status}: ${this.t.cpDetected}<br>${this.t.cpActionRequired}`;
      case 'warning_and_above': 
        return `⚠️ <b>WARNING</b><br>${this.t.room}: 105<br>${this.t.cpSensor}: ${this.t.temperature}<br>${this.t.cpValue}: 28.5°C (${this.t.cpHigh})<br>${this.t.cpCheckAC}`;
      case 'all': 
        return `ℹ️ <b>INFO</b><br>${this.t.room}: 210<br>${this.t.cpSensor}: Window<br>${this.t.status}: ${this.t.cpOpenFor2Hours}`;
      default: 
        return '';
    }
  }

  isDaySelected(day: Weekday): boolean {
    return this.config.thermostat.activeDays.includes(day);
  }

  toggleDay(day: Weekday): void {
    const days = this.config.thermostat.activeDays;
    const idx = days.indexOf(day);
    idx === -1 ? days.push(day) : days.splice(idx, 1);
  }

  close(): void {
    this.controlPanelService.close();
  }

  navigateTo(section: ControlPanelSectionId): void {
    this.controlPanelService.navigateTo(section);
  }

  save(): void {
    // TODO: connect to backend service
    console.log('[ControlPanel] Config saved (UI only):', this.config);
    this.controlPanelService.close();
  }

  resetToDefaults(): void {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONTROL_PANEL_CONFIG));
  }
}
