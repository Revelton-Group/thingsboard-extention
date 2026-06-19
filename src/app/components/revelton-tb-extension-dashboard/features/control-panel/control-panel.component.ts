import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ControlPanelService } from './services/control-panel.service';
import { TranslationService } from '../../core/services/translation.service';
import { HotelStateService } from '../../core/services/hotel-state.service';
import {
  ControlPanelSection,
  ControlPanelSectionId,
  ControlPanelConfig,
  DEFAULT_CONTROL_PANEL_CONFIG,
  WEEKDAYS,
  Weekday,
  MEWS_SYNC_OPTIONS,
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
        <div class="cp-content cp-content--dark">

          <!-- ── AIR QUALITY THRESHOLDS (AirGuard Design) ── -->
          <ng-container *ngIf="activeSection === 'air_quality'">
            <div class="cp-section cp-aq-section">
              
              <!-- AirGuard Header -->
              <div class="cp-aq-header">
                <div class="cp-aq-title-row">
                  <div class="cp-aq-icon-container">
                    <i class="material-icons">air</i>
                  </div>
                  <div>
                    <h2>Threshold Settings</h2>
                    <p class="cp-aq-subtitle">AirGuard · alert limits per metric</p>
                  </div>
                </div>
                
                <!-- Status Counters -->
                <div class="cp-aq-counters">
                  <span class="cp-aq-counter-badge cp-aq-counter-badge--normal">
                    <span class="cp-aq-badge-val">{{ countNormal }}</span> Normal
                  </span>
                  <span class="cp-aq-counter-badge cp-aq-counter-badge--warning">
                    <span class="cp-aq-badge-val">{{ countWarning }}</span> Warning
                  </span>
                </div>
              </div>

              <!-- Threshold Cards Grid -->
              <div class="cp-aq-grid" [class.cp-disabled]="!config.airQuality.enabled">
                
                <!-- TEMP MAX LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">TEMP MAX LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('temp', getLiveValue('temp')) === 'warning'">{{ getLiveValue('temp') }} °C</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('temp', getLiveValue('temp')) }}">
                        • {{ getMetricStatus('temp', getLiveValue('temp')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="15" max="45" step="1"
                      [(ngModel)]="config.airQuality.tempMax"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.tempMax" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">°C</span>
                  </div>
                </div>

                <!-- HUMIDITY MAX LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">HUMIDITY MAX LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('hum', getLiveValue('hum')) === 'warning'">{{ getLiveValue('hum') }} %</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('hum', getLiveValue('hum')) }}">
                        • {{ getMetricStatus('hum', getLiveValue('hum')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="20" max="95" step="5"
                      [(ngModel)]="config.airQuality.humMax"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.humMax" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">%</span>
                  </div>
                </div>

                <!-- CO2 LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">CO₂ LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('co2', getLiveValue('co2')) === 'warning'">{{ getLiveValue('co2') }} ppm</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('co2', getLiveValue('co2')) }}">
                        • {{ getMetricStatus('co2', getLiveValue('co2')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="400" max="2000" step="50"
                      [(ngModel)]="config.airQuality.co2Max"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.co2Max" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">ppm</span>
                  </div>
                </div>

                <!-- PM2.5 LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">PM2.5 LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('pm25', getLiveValue('pm25')) === 'warning'">{{ getLiveValue('pm25') }} µg/m³</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('pm25', getLiveValue('pm25')) }}">
                        • {{ getMetricStatus('pm25', getLiveValue('pm25')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="5" max="150" step="5"
                      [(ngModel)]="config.airQuality.pm25Max"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.pm25Max" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">µg/m³</span>
                  </div>
                </div>

                <!-- PM10 LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">PM10 LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('pm10', getLiveValue('pm10')) === 'warning'">{{ getLiveValue('pm10') }} µg/m³</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('pm10', getLiveValue('pm10')) }}">
                        • {{ getMetricStatus('pm10', getLiveValue('pm10')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="10" max="300" step="10"
                      [(ngModel)]="config.airQuality.pm10Max"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.pm10Max" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">µg/m³</span>
                  </div>
                </div>

                <!-- TVOC LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">TVOC LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('tvoc', getLiveValue('tvoc')) === 'warning'">{{ getLiveValue('tvoc') }} ppb</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('tvoc', getLiveValue('tvoc')) }}">
                        • {{ getMetricStatus('tvoc', getLiveValue('tvoc')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="100" max="1500" step="50"
                      [(ngModel)]="config.airQuality.tvocMax"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.tvocMax" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">ppb</span>
                  </div>
                </div>

                <!-- PRESSURE MAX LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.airQuality.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">PRESSURE MAX LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('press', getLiveValue('press')) === 'warning'">{{ getLiveValue('press') }} hPa</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('press', getLiveValue('press')) }}">
                        • {{ getMetricStatus('press', getLiveValue('press')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="800" max="1200" step="10"
                      [(ngModel)]="config.airQuality.pressMax"
                      (ngModelChange)="checkPresetMatch()">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.airQuality.pressMax" (ngModelChange)="checkPresetMatch()">
                    </div>
                    <span class="cp-aq-unit-suffix">hPa</span>
                  </div>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ── THERMOSTAT AUTOMATION ── -->
          <ng-container *ngIf="activeSection === 'thermostat'">
            <div class="cp-section cp-aq-section">
              <div class="cp-aq-header">
                <div class="cp-aq-title-row">
                  <div class="cp-aq-icon-container">
                    <i class="material-icons">thermostat</i>
                  </div>
                  <div>
                    <h2>{{ t.cpThermostatAuto }}</h2>
                    <p class="cp-aq-subtitle">{{ t.cpThermostatDesc }}</p>
                  </div>
                </div>
                <label class="cp-toggle" style="margin: 0;">
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

          <!-- ── NOISE THRESHOLDS (AirGuard Design) ── -->
          <ng-container *ngIf="activeSection === 'noise'">
            <div class="cp-section cp-aq-section">
              
              <!-- Noise Header -->
              <div class="cp-aq-header">
                <div class="cp-aq-title-row">
                  <div class="cp-aq-icon-container" style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3);">
                    <i class="material-icons" style="color: #0ea5e9;">volume_up</i>
                  </div>
                  <div>
                    <h2>Acoustic Noise Settings</h2>
                    <p class="cp-aq-subtitle">Noise Sensor · alert limits per metric</p>
                  </div>
                </div>
                
                <!-- Status Counters -->
                <div class="cp-aq-counters">
                  <span class="cp-aq-counter-badge cp-aq-counter-badge--normal">
                    <span class="cp-aq-badge-val">{{ countNoiseNormal }}</span> Normal
                  </span>
                  <span class="cp-aq-counter-badge cp-aq-counter-badge--warning">
                    <span class="cp-aq-badge-val">{{ countNoiseWarning }}</span> Warning
                  </span>
                </div>
              </div>

              <!-- Threshold Cards Grid -->
              <div class="cp-aq-grid" [class.cp-disabled]="!config.noise.enabled">
                
                <!-- LAEQ LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.noise.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">LAEQ LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('laeq', getLiveValue('laeq')) === 'warning'">{{ getLiveValue('laeq') }} dBA</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('laeq', getLiveValue('laeq')) }}">
                        • {{ getMetricStatus('laeq', getLiveValue('laeq')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="30" max="95" step="1"
                      [(ngModel)]="config.noise.laeqMax">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.noise.laeqMax">
                    </div>
                    <span class="cp-aq-unit-suffix">dBA</span>
                  </div>
                </div>

                <!-- LAI LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.noise.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">LAI LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('lai', getLiveValue('lai')) === 'warning'">{{ getLiveValue('lai') }} dBA</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('lai', getLiveValue('lai')) }}">
                        • {{ getMetricStatus('lai', getLiveValue('lai')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="30" max="95" step="1"
                      [(ngModel)]="config.noise.laiMax">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.noise.laiMax">
                    </div>
                    <span class="cp-aq-unit-suffix">dBA</span>
                  </div>
                </div>

                <!-- LAIMAX LIMIT -->
                <div class="cp-aq-card" [class.cp-aq-card--active]="config.noise.enabled">
                  <div class="cp-aq-card-header">
                    <span class="cp-aq-card-title">LAIMAX LIMIT</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cp-aq-live-badge" [class.cp-aq-live-badge--warning]="getMetricStatus('laimax', getLiveValue('laimax')) === 'warning'">{{ getLiveValue('laimax') }} dBA</span>
                      <span class="cp-aq-status-badge cp-aq-status-badge--{{ getMetricStatus('laimax', getLiveValue('laimax')) }}">
                        • {{ getMetricStatus('laimax', getLiveValue('laimax')) | uppercase }}
                      </span>
                    </div>
                  </div>
                  <div class="cp-aq-card-body">
                    <input class="cp-aq-slider" type="range" min="30" max="95" step="1"
                      [(ngModel)]="config.noise.laimaxMax">
                    <div class="cp-aq-input-wrapper">
                      <input class="cp-aq-value-input" type="number" [(ngModel)]="config.noise.laimaxMax">
                    </div>
                    <span class="cp-aq-unit-suffix">dBA</span>
                  </div>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ── WINDOW ALERT ── -->
          <ng-container *ngIf="activeSection === 'window'">
            <div class="cp-section cp-aq-section">
              <div class="cp-aq-header">
                <div class="cp-aq-title-row">
                  <div class="cp-aq-icon-container">
                    <i class="material-icons">window</i>
                  </div>
                  <div>
                    <h2>{{ t.cpWindowAlert }}</h2>
                    <p class="cp-aq-subtitle">{{ t.cpWindowAlertDesc }}</p>
                  </div>
                </div>
                <label class="cp-toggle" style="margin: 0;">
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
            <div class="cp-section cp-aq-section">
              <div class="cp-aq-header">
                <div class="cp-aq-title-row">
                  <div class="cp-aq-icon-container">
                    <i class="material-icons">sync</i>
                  </div>
                  <div>
                    <h2>{{ t.cpMewsSync }}</h2>
                    <p class="cp-aq-subtitle">{{ t.cpMewsSyncDesc }}</p>
                  </div>
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
            <div class="cp-section cp-aq-section">
              <div class="cp-aq-header">
                <div class="cp-aq-title-row">
                  <div class="cp-aq-icon-container">
                    <i class="material-icons">send</i>
                  </div>
                  <div>
                    <h2>{{ t.cpTelegramTitle }}</h2>
                    <p class="cp-aq-subtitle">{{ t.cpTelegramDesc }}</p>
                  </div>
                </div>
                <label class="cp-toggle" style="margin: 0;">
                  <input type="checkbox" [(ngModel)]="config.telegram.enabled">
                  <span class="cp-toggle-track"></span>
                </label>
              </div>

              <div class="cp-card" style="gap: 24px; padding: 16px; flex-direction: row; display: flex; align-items: stretch;" [class.cp-disabled]="!config.telegram.enabled">

                <!-- LEFT COLUMN -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                  <!-- Message Preview -->
                  <div class="cp-field" *ngIf="config.telegram.enabled" style="flex: 1; display: flex; flex-direction: column;">
                    <label class="cp-label">{{ t.cpPreview }}</label>
                    <div class="cp-telegram-preview" style="flex: 1;">
                      <div class="cp-telegram-bubble">
                        <div class="cp-telegram-header">🏨 Revelton Hotel Bot</div>
                        <div class="cp-telegram-body" [innerHTML]="telegramPreview"></div>
                        <div class="cp-telegram-time">14:30</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="cp-info-box cp-info-box--warning" style="margin-top: auto;">
                    <i class="material-icons">lock</i>
                    <span>{{ t.cpBotTokenHint }}</span>
                  </div>
                </div>

                <!-- RIGHT COLUMN -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px; border-left: 1px solid rgba(255, 255, 255, 0.05); padding-left: 24px;">
                  <!-- Bot Token -->
                  <div class="cp-field">
                    <label class="cp-label">Main Bot Token</label>
                    <input class="cp-input" type="password" [(ngModel)]="config.telegram.botToken" [disabled]="!config.telegram.enabled" placeholder="123456789:ABCdefGHIjkl...">
                    <p class="cp-hint" style="margin-top: 6px;">The API Token provided by BotFather.</p>
                  </div>

                  <!-- Chat ID -->
                  <div class="cp-field">
                    <label class="cp-label">Chat ID (Region/Group)</label>
                    <input class="cp-input" type="text" [(ngModel)]="config.telegram.chatId" [disabled]="!config.telegram.enabled" placeholder="e.g. -100123456789">
                    <p class="cp-hint" style="margin-top: 6px;">The Telegram group where alerts will be sent.</p>
                  </div>

                  <!-- Topic ID -->
                  <div class="cp-field">
                    <label class="cp-label">Topic ID (Hotel Thread)</label>
                    <input class="cp-input" type="text" [(ngModel)]="config.telegram.topicId" [disabled]="!config.telegram.enabled" placeholder="e.g. 42 (Optional)">
                    <p class="cp-hint" style="margin-top: 6px;">The specific thread ID within the group.</p>
                  </div>
                </div>

              </div>
            </div>
          </ng-container>

        </div>
      </div>

      <!-- Footer -->
      <div class="cp-footer">
        <div style="display: flex; align-items: center; gap: 12px; margin-right: auto;">
          <!-- Reset button removed -->
          
          <div *ngIf="activeSection === 'air_quality'" style="display: flex; align-items: center; gap: 8px; border-left: 1.5px solid rgba(255, 255, 255, 0.08); padding-left: 12px;">
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Monitor Enabled</span>
            <label class="cp-toggle" style="margin: 0;">
              <input type="checkbox" [(ngModel)]="config.airQuality.enabled">
              <span class="cp-toggle-track"></span>
            </label>
          </div>
          
          <div *ngIf="activeSection === 'noise'" style="display: flex; align-items: center; gap: 8px; border-left: 1.5px solid rgba(255, 255, 255, 0.08); padding-left: 12px;">
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Monitor Enabled</span>
            <label class="cp-toggle" style="margin: 0;">
              <input type="checkbox" [(ngModel)]="config.noise.enabled">
              <span class="cp-toggle-track"></span>
            </label>
          </div>
        </div>

        <span class="cp-unsaved-changes" style="margin-right: 12px; margin-left: 0;" *ngIf="hasUnsavedChanges">
          <span class="cp-unsaved-dot"></span> Unsaved changes
        </span>
        <button class="cp-btn cp-btn--primary" (click)="save()">
          <i class="material-icons">save</i>
          Save thresholds
        </button>
      </div>

    </div>
  `,
  styleUrls: ['./control-panel.component.scss'],
  standalone: false,
})
export class ControlPanelComponent implements OnInit, OnDestroy {
  isOpen = false;
  activeSection: ControlPanelSectionId = 'air_quality';
  sections: ControlPanelSection[] = [];
  weekdays = WEEKDAYS;
  mewsOptions = MEWS_SYNC_OPTIONS;

  config: ControlPanelConfig = JSON.parse(JSON.stringify(DEFAULT_CONTROL_PANEL_CONFIG));
  originalConfig: ControlPanelConfig | null = null;
  activePreset: 'home' | 'office' | 'lab' | null = null;
  
  private rooms: any[] = [];
  private _subs = new Subscription();

  constructor(
    private controlPanelService: ControlPanelService,
    private translationService: TranslationService,
    private hotelStateService: HotelStateService
  ) {}

  get t() {
    return this.translationService.t;
  }

  getSidebarLabel(id: string): string {
    switch(id) {
      case 'air_quality': return this.t.airQuality || 'Air Quality';
      case 'thermostat': return this.t.thermostats || 'Thermostats';
      case 'noise': return this.t.histNoiseLevels || 'Noise Sensor';
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
    this._subs.add(this.controlPanelService.config$.subscribe(c => {
      this.config = JSON.parse(JSON.stringify(c));
      if (!this.config.telegram) this.config.telegram = { enabled: false, botToken: '', chatId: '', topicId: '' };
      if (this.config.telegram.botToken === undefined) this.config.telegram.botToken = '';
      if (this.config.telegram.chatId === undefined) this.config.telegram.chatId = '';
      if (this.config.telegram.topicId === undefined) this.config.telegram.topicId = '';
      if (this.config && this.config.noise) {
        if (this.config.noise.laeqMax == null) this.config.noise.laeqMax = 60;
        if (this.config.noise.laiMax == null) this.config.noise.laiMax = 65;
        if (this.config.noise.laimaxMax == null) this.config.noise.laimaxMax = 70;
      }
      this.originalConfig = JSON.parse(JSON.stringify(c));
      if (!this.originalConfig.telegram) this.originalConfig.telegram = { enabled: false, botToken: '', chatId: '', topicId: '' };
      if (this.originalConfig.telegram.botToken === undefined) this.originalConfig.telegram.botToken = '';
      if (this.originalConfig.telegram.chatId === undefined) this.originalConfig.telegram.chatId = '';
      if (this.originalConfig.telegram.topicId === undefined) this.originalConfig.telegram.topicId = '';
      if (this.originalConfig && this.originalConfig.noise) {
        if (this.originalConfig.noise.laeqMax == null) this.originalConfig.noise.laeqMax = 60;
        if (this.originalConfig.noise.laiMax == null) this.originalConfig.noise.laiMax = 65;
        if (this.originalConfig.noise.laimaxMax == null) this.originalConfig.noise.laimaxMax = 70;
      }
      this.checkPresetMatch();
    }));
    this._subs.add(this.hotelStateService.rooms$.subscribe(r => (this.rooms = r)));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get mewsLabel(): string {
    return MEWS_SYNC_OPTIONS.find(o => o.value === this.config.mews.intervalMinutes)?.label ?? `${this.config.mews.intervalMinutes} min`;
  }

  get telegramPreview(): string {
    return `🚨 <b>${this.t.cpCritAlert || 'CRITICAL ALERT'}</b><br>${this.t.room || 'Room'}: 402<br>${this.t.cpSensor || 'Sensor'}: ${this.t.waterLeak || 'WATER LEAK'}<br>${this.t.status || 'Status'}: ${this.t.cpDetected || 'Detected'}<br>${this.t.cpActionRequired || 'Action Required Immediately!'}`;
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
    this.controlPanelService.saveConfig(this.config);
    this.originalConfig = JSON.parse(JSON.stringify(this.config));
    this.controlPanelService.close();
  }



  get hasUnsavedChanges(): boolean {
    if (!this.originalConfig) return false;
    return JSON.stringify(this.config) !== JSON.stringify(this.originalConfig);
  }

  applyPreset(preset: 'home' | 'office' | 'lab'): void {
    this.activePreset = preset;
    if (preset === 'home') {
      this.config.airQuality.co2Max = 1000;
      this.config.airQuality.pm25Max = 35;
      this.config.airQuality.pm10Max = 150;
      this.config.airQuality.tvocMax = 600;
      this.config.airQuality.tempMax = 28;
      this.config.airQuality.humMax = 65;
      this.config.airQuality.pressMax = 1100;
    } else if (preset === 'office') {
      this.config.airQuality.co2Max = 800;
      this.config.airQuality.pm25Max = 25;
      this.config.airQuality.pm10Max = 100;
      this.config.airQuality.tvocMax = 400;
      this.config.airQuality.tempMax = 25;
      this.config.airQuality.humMax = 60;
      this.config.airQuality.pressMax = 1050;
    } else if (preset === 'lab') {
      this.config.airQuality.co2Max = 600;
      this.config.airQuality.pm25Max = 15;
      this.config.airQuality.pm10Max = 50;
      this.config.airQuality.tvocMax = 200;
      this.config.airQuality.tempMax = 22;
      this.config.airQuality.humMax = 50;
      this.config.airQuality.pressMax = 1020;
    }
  }

  checkPresetMatch(): void {
    const aq = this.config.airQuality;
    if (aq.co2Max === 1000 && aq.pm25Max === 35 && aq.pm10Max === 150 && aq.tvocMax === 600 && aq.tempMax === 28 && aq.humMax === 65 && aq.pressMax === 1100) {
      this.activePreset = 'home';
    } else if (aq.co2Max === 800 && aq.pm25Max === 25 && aq.pm10Max === 100 && aq.tvocMax === 400 && aq.tempMax === 25 && aq.humMax === 60 && aq.pressMax === 1050) {
      this.activePreset = 'office';
    } else if (aq.co2Max === 600 && aq.pm25Max === 15 && aq.pm10Max === 50 && aq.tvocMax === 200 && aq.tempMax === 22 && aq.humMax === 50 && aq.pressMax === 1020) {
      this.activePreset = 'lab';
    } else {
      this.activePreset = null;
    }
  }

  getLiveValue(metric: string): number {
    let total = 0;
    let count = 0;
    for (const r of this.rooms) {
      if (!r.roomData) continue;
      if (metric === 'co2') {
        for (const aq of Object.values(r.roomData.airSensors || {})) {
          if ((aq as any).co2 != null) { total += (aq as any).co2; count++; }
        }
      } else if (metric === 'pm25') {
        for (const aq of Object.values(r.roomData.airSensors || {})) {
          if ((aq as any).pm25 != null) { total += (aq as any).pm25; count++; }
        }
      } else if (metric === 'pm10') {
        for (const aq of Object.values(r.roomData.airSensors || {})) {
          if ((aq as any).pm10 != null) { total += (aq as any).pm10; count++; }
        }
      } else if (metric === 'tvoc') {
        for (const aq of Object.values(r.roomData.airSensors || {})) {
          const val = (aq as any).tvoc ?? (aq as any).iaq;
          if (val != null) { total += val; count++; }
        }
      } else if (metric === 'temp') {
        if (r.roomData.sensorData?.temperature != null) {
          total += r.roomData.sensorData.temperature;
          count++;
        }
      } else if (metric === 'hum') {
        if (r.roomData.sensorData?.humidity != null) {
          total += r.roomData.sensorData.humidity;
          count++;
        }
      } else if (metric === 'press') {
        for (const aq of Object.values(r.roomData.airSensors || {})) {
          if ((aq as any).pressure != null) { total += (aq as any).pressure; count++; }
        }
      } else if (metric === 'laeq') {
        for (const nd of Object.values(r.roomData.noiseDevices || {})) {
          if ((nd as any).laeq != null) { total += (nd as any).laeq; count++; }
        }
      } else if (metric === 'lai') {
        for (const nd of Object.values(r.roomData.noiseDevices || {})) {
          if ((nd as any).lai != null) { total += (nd as any).lai; count++; }
        }
      } else if (metric === 'laimax') {
        for (const nd of Object.values(r.roomData.noiseDevices || {})) {
          if ((nd as any).laimax != null) { total += (nd as any).laimax; count++; }
        }
      }
    }
    if (count > 0) return Math.round(total / count);

    switch (metric) {
      case 'co2': return 820;
      case 'pm25': return 42;
      case 'pm10': return 110;
      case 'tvoc': return 660;
      case 'temp': return 24;
      case 'hum': return 58;
      case 'press': return 1016;
      case 'laeq': return 55;
      case 'lai': return 60;
      case 'laimax': return 65;
      default: return 0;
    }
  }

  getMetricStatus(metric: string, val: number): 'normal' | 'warning' {
    if (metric === 'co2') {
      return val >= this.config.airQuality.co2Max ? 'warning' : 'normal';
    }
    if (metric === 'pm25') {
      return val >= this.config.airQuality.pm25Max ? 'warning' : 'normal';
    }
    if (metric === 'pm10') {
      return val >= this.config.airQuality.pm10Max ? 'warning' : 'normal';
    }
    if (metric === 'tvoc') {
      return val >= this.config.airQuality.tvocMax ? 'warning' : 'normal';
    }
    if (metric === 'temp') {
      return val >= this.config.airQuality.tempMax ? 'warning' : 'normal';
    }
    if (metric === 'hum') {
      return val >= this.config.airQuality.humMax ? 'warning' : 'normal';
    }
    if (metric === 'press') {
      return val >= this.config.airQuality.pressMax ? 'warning' : 'normal';
    }
    if (metric === 'laeq') {
      return val >= this.config.noise.laeqMax ? 'warning' : 'normal';
    }
    if (metric === 'lai') {
      return val >= this.config.noise.laiMax ? 'warning' : 'normal';
    }
    if (metric === 'laimax') {
      return val >= this.config.noise.laimaxMax ? 'warning' : 'normal';
    }
    return 'normal';
  }

  get countNormal(): number {
    return ['co2', 'pm25', 'pm10', 'tvoc', 'temp', 'hum', 'press']
      .filter(m => this.getMetricStatus(m, this.getLiveValue(m)) === 'normal').length;
  }

  get countWarning(): number {
    return ['co2', 'pm25', 'pm10', 'tvoc', 'temp', 'hum', 'press']
      .filter(m => this.getMetricStatus(m, this.getLiveValue(m)) === 'warning').length;
  }

  get countNoiseNormal(): number {
    return ['laeq', 'lai', 'laimax']
      .filter(m => this.getMetricStatus(m, this.getLiveValue(m)) === 'normal').length;
  }

  get countNoiseWarning(): number {
    return ['laeq', 'lai', 'laimax']
      .filter(m => this.getMetricStatus(m, this.getLiveValue(m)) === 'warning').length;
  }


}
