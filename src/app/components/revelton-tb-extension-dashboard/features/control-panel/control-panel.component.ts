import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ControlPanelService } from './services/control-panel.service';
import { TranslationService } from '../../core/services/translation.service';
import { HotelStateService } from '../../core/services/hotel-state.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  ControlPanelSection,
  ControlPanelSectionId,
  ControlPanelConfig,
  DEFAULT_CONTROL_PANEL_CONFIG,
  WEEKDAYS,
  WEEKDAY_INDEX,
  Weekday,
} from './models/control-panel.models';

@Component({
  selector: 'tb-control-panel',
  template: `
    <!-- Main Overlay Container -->
    <div class="cp-overlay" [class.cp-overlay--open]="isOpen" (click)="close()">

      <!-- Sliding panel -->
      <div class="cp-panel" [class.cp-panel--open]="isOpen" (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="cp-header">
        <!-- Header top row: title | scope pill | close -->
        <div class="cp-header-top">
          <div class="cp-header-title">
            <i class="material-icons">settings</i>
            <span>{{ t.controlConfig || 'Control Settings' }}</span>
          </div>
          <div class="cp-header-actions">
            <!-- Room scope pill -->
            <div class="cp-scope-btn-container">
              <button class="cp-scope-btn" (click)="toggleScopeDropdown()">
                <span>{{ scopeSummary }}</span>
                <i class="material-icons cp-scope-chevron" [class.cp-scope-chevron--open]="scopeDropdownOpen">expand_more</i>
              </button>

              <!-- Scope Dropdown -->
              <div class="cp-scope-dropdown" *ngIf="scopeDropdownOpen">
                <div class="cp-scope-dropdown-inner" (click)="$event.stopPropagation()">
                  <!-- Scope toggle -->
                  <div class="cp-scope-toggle-row">
                    <button class="cp-scope-toggle-btn" [class.cp-scope-toggle-btn--active]="config.roomScope === 'all'" (click)="config.roomScope = 'all'; rebuildDerived();">All rooms</button>
                    <button class="cp-scope-toggle-btn" [class.cp-scope-toggle-btn--active]="config.roomScope !== 'all'" (click)="config.roomScope = 'except'; rebuildDerived();">Exclude rooms</button>
                  </div>
                  <!-- Search -->
                  <div class="cp-scope-search">
                    <i class="material-icons">search</i>
                    <input [(ngModel)]="scopeSearch" (ngModelChange)="onScopeSearch()" [placeholder]="t.searchRooms || 'Search rooms...'">
                  </div>
                  <!-- Room chips -->
                  <div class="cp-scope-chips">
                    <div class="cp-scope-chip" *ngFor="let rc of filteredScopeChips"
                      [class.cp-scope-chip--excluded]="rc.excluded"
                      (click)="toggleScopeRoom(rc.roomNumber)">
                      <i class="material-icons">{{ rc.excluded ? 'radio_button_unchecked' : 'check_circle' }}</i>
                      <span>{{ rc.label }}</span>
                    </div>
                  </div>
                  <!-- Scope footer -->
                  <div class="cp-scope-footer">
                    <span>{{ roomScopeCount }} {{ t.ofRooms || 'of' }} {{ totalRooms }} {{ t.roomsTargeted || 'rooms' }}</span>
                    <button (click)="scopeDropdownOpen = false">{{ t.done || 'Done' }}</button>
                  </div>
                </div>
              </div>
            </div>
            <button class="cp-close-btn" (click)="close()">
              <i class="material-icons">close</i>
            </button>
          </div>
        </div>

        <!-- Nav tabs row -->
        <nav class="cp-top-nav">
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
      </div>

      <div class="cp-scope-backdrop" *ngIf="scopeDropdownOpen" (click)="scopeDropdownOpen = false"></div>

      <!-- Body -->
      <div class="cp-body">

        <!-- Content -->
        <div class="cp-content" [class.cp-content--dark]="isDark">

          <!-- ═══ AIR QUALITY THRESHOLDS ═══ -->
          <ng-container *ngIf="activeSection === 'air_quality'">
            <div class="cp-section">

              <!-- Header -->
              <div class="cp-section-hdr">
                <div class="cp-section-icon cp-section-icon--accent">
                  <i class="material-icons">air</i>
                </div>
                <div class="cp-section-title-area">
                  <p>{{ t.cpAirGuardDesc || 'AirGuard · alert limits per metric' }}</p>
                </div>
                <div class="cp-section-badges">
                  <span class="cp-badge cp-badge--ok">
                    <b>{{ countNormal }}</b>&nbsp;{{ t.normalC || 'NORMAL' }}
                  </span>
                  <span class="cp-badge cp-badge--warn" *ngIf="countWarning > 0">
                    <b>{{ countWarning }}</b>&nbsp;{{ t.warningC || 'WARNING' }}
                  </span>
                  <span class="cp-badge cp-badge--alert" *ngIf="countAlert > 0">
                    <b>{{ countAlert }}</b>&nbsp;{{ t.alertC || 'EXCEEDED' }}
                  </span>
                </div>
              </div>

              <div [class.cp-disabled-section]="!config.airQuality.enabled">

                <!-- Climate Comfort -->
                <div class="cp-grid-label">{{ t.cpClimateSection || 'CLIMATE COMFORT' }}</div>
                <div class="cp-th-grid">
                  <div class="cp-th-card" *ngFor="let th of climateThresholds; trackBy: trackByKey">
                    <div class="cp-th-top">
                      <div class="cp-th-icon" [style.background]="th.iconBg" [style.color]="th.iconColor">
                        <i class="material-icons">{{ th.icon }}</i>
                      </div>
                      <span class="cp-th-label">{{ th.label }}</span>
                      <span class="cp-th-status" [style.background]="th.statusBg" [style.color]="th.statusColor">{{ th.statusLabel }}</span>
                    </div>
                    <div class="cp-th-value-area">
                      <span class="cp-th-val" [style.color]="th.statusColor">{{ th.current }}<span class="cp-th-unit"> {{ th.unit }}</span></span>
                      <span class="cp-th-sub">{{ t.cpCurrent || 'Current' }}</span>
                    </div>
                    <div class="cp-th-bar">
                      <!-- min warning zone: amber region from min to (min+warnGap) -->
                      <div class="cp-th-bar-warn-zone"
                        [style.left]="(th.minLimit / th.maxLimit * 100) + '%'"
                        [style.width]="(th.warnGap / th.maxLimit * 100) + '%'"
                        *ngIf="th.hasMin && th.warnGap > 0 && (th.minLimit + th.warnGap) < th.maxLimit">
                      </div>
                      <!-- max warning zone: amber region from (max-warnGap) to max -->
                      <div class="cp-th-bar-warn-zone"
                        [style.left]="((th.maxLimit - th.warnGap) / th.maxLimit * 100) + '%'"
                        [style.width]="(th.warnGap / th.maxLimit * 100) + '%'"
                        *ngIf="th.warnGap > 0 && th.warnGap < th.maxLimit">
                      </div>
                      <!-- exceeded marker line at 100% -->
                      <div class="cp-th-bar-exceed-mark"></div>
                      <!-- current value fill -->
                      <div class="cp-th-bar-fill" [style.width]="th.percent + '%'" [style.background]="th.statusColor"></div>
                    </div>
                    <!-- Warning threshold gap row -->
                    <div class="cp-th-warn-row">
                      <i class="material-icons cp-th-warn-icon">notifications_active</i>
                      <span class="cp-th-warn-lbl">WARN ZONE</span>
                      <div class="cp-th-warn-input-wrap">
                        <input class="cp-th-num cp-th-num--warn" type="number" min="0" (focus)="$event.target.select()" [(ngModel)]="th.warnGap" (ngModelChange)="onThresholdChange()">
                      </div>
                    </div>
                    <div class="cp-th-inputs">
                      <div class="cp-th-input-grp" *ngIf="th.hasMin">
                        <span class="cp-th-input-lbl">MIN</span>
                        <input class="cp-th-num" type="number" (focus)="$event.target.select()" [(ngModel)]="th.minLimit" (ngModelChange)="onThresholdChange()">
                      </div>
                      <div class="cp-th-input-grp cp-th-input-grp--max">
                        <span class="cp-th-input-lbl">MAX</span>
                        <input class="cp-th-num cp-th-num--max" type="number" (focus)="$event.target.select()" [(ngModel)]="th.maxLimit" (ngModelChange)="onThresholdChange()">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Air Purity -->
                <div class="cp-grid-label">{{ t.cpPuritySection || 'AIR PURITY' }}</div>
                <div class="cp-th-grid">
                  <div class="cp-th-card" *ngFor="let th of purityThresholds; trackBy: trackByKey">
                    <div class="cp-th-top">
                      <div class="cp-th-icon" [style.background]="th.iconBg" [style.color]="th.iconColor">
                        <i class="material-icons">{{ th.icon }}</i>
                      </div>
                      <span class="cp-th-label">{{ th.label }}</span>
                      <span class="cp-th-status" [style.background]="th.statusBg" [style.color]="th.statusColor">{{ th.statusLabel }}</span>
                    </div>
                    <div class="cp-th-value-area">
                      <span class="cp-th-val" [style.color]="th.statusColor">{{ th.current }}<span class="cp-th-unit"> {{ th.unit }}</span></span>
                      <span class="cp-th-sub">{{ t.cpCurrent || 'Current' }}</span>
                    </div>
                    <div class="cp-th-bar">
                      <!-- min warning zone: amber region from min to (min+warnGap) -->
                      <div class="cp-th-bar-warn-zone"
                        [style.left]="(th.minLimit / th.maxLimit * 100) + '%'"
                        [style.width]="(th.warnGap / th.maxLimit * 100) + '%'"
                        *ngIf="th.hasMin && th.warnGap > 0 && (th.minLimit + th.warnGap) < th.maxLimit">
                      </div>
                      <!-- max warning zone: amber region from (max-warnGap) to max -->
                      <div class="cp-th-bar-warn-zone"
                        [style.left]="((th.maxLimit - th.warnGap) / th.maxLimit * 100) + '%'"
                        [style.width]="(th.warnGap / th.maxLimit * 100) + '%'"
                        *ngIf="th.warnGap > 0 && th.warnGap < th.maxLimit">
                      </div>
                      <!-- exceeded marker line at 100% -->
                      <div class="cp-th-bar-exceed-mark"></div>
                      <!-- current value fill -->
                      <div class="cp-th-bar-fill" [style.width]="th.percent + '%'" [style.background]="th.statusColor"></div>
                    </div>
                    <!-- Warning threshold gap row -->
                    <div class="cp-th-warn-row">
                      <i class="material-icons cp-th-warn-icon">notifications_active</i>
                      <span class="cp-th-warn-lbl">WARN ZONE</span>
                      <div class="cp-th-warn-input-wrap">
                        <input class="cp-th-num cp-th-num--warn" type="number" min="0" (focus)="$event.target.select()" [(ngModel)]="th.warnGap" (ngModelChange)="onThresholdChange()">
                      </div>
                    </div>
                    <div class="cp-th-inputs">
                      <div class="cp-th-input-grp" *ngIf="th.hasMin">
                        <span class="cp-th-input-lbl">MIN</span>
                        <input class="cp-th-num" type="number" (focus)="$event.target.select()" [(ngModel)]="th.minLimit" (ngModelChange)="onThresholdChange()">
                      </div>
                      <div class="cp-th-input-grp cp-th-input-grp--max">
                        <span class="cp-th-input-lbl">MAX</span>
                        <input class="cp-th-num cp-th-num--max" type="number" (focus)="$event.target.select()" [(ngModel)]="th.maxLimit" (ngModelChange)="onThresholdChange()">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Warn Zone Info Badge -->
                <div class="cp-info-badge" style="margin-top: 24px;">
                  <i class="material-icons cp-info-icon">info</i>
                  <div class="cp-info-text">
                    <strong>{{ t.cpAqWarnZoneTitle || 'Thresholds & Warn Zone' }}</strong>
                    <p>{{ t.cpAqWarnZoneDesc || 'MIN and MAX set the absolute allowed boundaries for the reading. The warning zone is defined as a gap below the absolute MAX limit. When readings cross into this zone, they will display an amber WARNING status.' }}</p>
                  </div>
                </div>

              </div>
            </div>
          </ng-container>


          <!-- ═══ THERMOSTAT ═══ -->
          <ng-container *ngIf="activeSection === 'thermostat'">
            <div class="cp-section">

              <!-- Header -->
              <div class="cp-section-hdr">
                <div class="cp-section-icon cp-section-icon--warn">
                  <i class="material-icons">local_fire_department</i>
                </div>
                <div class="cp-section-title-area">
                  <p>{{ t.comfortHint || 'Default setpoint applied on guest check-in.' }}</p>
                </div>
              </div>

              <!-- Schedule + Maintenance side by side -->
              <div class="cp-card-grid-2">

              <!-- Schedule Card -->
              <div class="cp-card">
                <div class="cp-card-head">
                  <i class="material-icons" style="color: var(--accent,#5c7cfa)">schedule</i>
                  <span>{{ t.schedule || 'Schedule' }}</span>
                </div>
                <p class="cp-card-hint">{{ t.scheduleHint || 'Define heating periods with target temperatures for each time block.' }}</p>

                <!-- Timeline Visualizer -->
                <div class="cp-timeline-container" *ngIf="thermostatSchedule.length > 0">
                  <div class="cp-timeline-bar">
                    <div *ngFor="let seg of getTimelineSegments()"
                         class="cp-timeline-segment"
                         [style.width.%]="seg.widthPct"
                         [style.background]="seg.bg"
                         [style.color]="seg.color"
                         [class.cp-timeline-segment--conflict]="seg.isConflict"
                         [class.cp-timeline-segment--empty]="seg.isEmpty"
                         [title]="seg.isConflict ? 'Conflict Overlap! ' + seg.startStr + ' - ' + seg.endStr : (seg.isEmpty ? 'Unscheduled: ' + seg.startStr + ' - ' + seg.endStr : 'Interval: ' + seg.startStr + ' - ' + seg.endStr + ' (' + seg.label + ')')">
                      <span class="cp-timeline-lbl" *ngIf="seg.widthPct > 8">{{ seg.label }}</span>
                      <span class="cp-timeline-time" *ngIf="seg.widthPct > 15">{{ seg.startStr }} - {{ seg.endStr }}</span>
                    </div>
                  </div>
                  <!-- Timeline Ticks (00:00, 06:00, 12:00, 18:00, 24:00) -->
                  <div class="cp-timeline-ticks">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                  
                  <!-- Overlap Warning Message -->
                  <div class="cp-timeline-warning" *ngIf="hasScheduleOverlap()">
                    <i class="material-icons">warning</i>
                    <span>Schedule intervals overlap! Please adjust times so they do not conflict.</span>
                  </div>
                </div>

                <div class="cp-schedule-list">
                  <div class="cp-schedule-row" *ngFor="let iv of thermostatSchedule; let i = index">
                    <div class="cp-schedule-times">
                      <span class="cp-time-wrap">
                        <i class="material-icons cp-time-icon" [style.color]="getClockColor(iv.start)">schedule</i>
                        <input type="text" [(ngModel)]="iv.start" (ngModelChange)="onScheduleChanged()" class="cp-input-sm cp-input-time" placeholder="HH:MM" maxlength="5" pattern="^(2[0-3]|[01]?[0-9]):([0-5][0-9])$">
                      </span>
                      <i class="material-icons" style="color: var(--t3,#5c6675); font-size: 16px">arrow_forward</i>
                      <span class="cp-time-wrap">
                        <i class="material-icons cp-time-icon" [style.color]="getClockColor(iv.end)">schedule</i>
                        <input type="text" [(ngModel)]="iv.end" (ngModelChange)="onScheduleChanged()" class="cp-input-sm cp-input-time" placeholder="HH:MM" maxlength="5" pattern="^(2[0-3]|[01]?[0-9]):([0-5][0-9])$">
                      </span>
                    </div>
                    <div class="cp-schedule-temp">
                      <span class="cp-temp-wrap">
                        <input type="number" step="1" min="16" max="28" [(ngModel)]="iv.temp" (ngModelChange)="onScheduleChanged()" class="cp-input-temp" [style.color]="getTempColor(iv.temp)" [style.background]="getTempBg(iv.temp)" [style.borderColor]="getTempColor(iv.temp)">
                        <span class="cp-temp-unit">°C</span>
                      </span>
                      <button class="cp-icon-btn cp-icon-btn--danger" (click)="removeScheduleInterval(i)" [disabled]="thermostatSchedule.length <= 1">
                        <i class="material-icons">delete</i>
                      </button>
                    </div>
                  </div>
                </div>
                <button class="cp-add-btn" (click)="addScheduleInterval()">
                  <i class="material-icons">add</i> {{ t.cpAddInterval || 'Add Interval' }}
                </button>
              </div>

              <!-- Right Column Stack -->
              <div class="cp-card-stack">
                <!-- Winter Season Card -->
                <div class="cp-card cp-card--row" style="position: relative; padding: 10px 14px; gap: 10px; flex-wrap: nowrap;">

                  <!-- Icon -->
                  <div style="width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--accentSoft, rgba(92,124,250,0.14)); border: 1px solid rgba(92,124,250,0.25);">
                    <i class="material-icons" style="font-size: 16px; color: var(--accent, #5c7cfa);">event_available</i>
                  </div>

                  <!-- Title + hint -->
                  <div style="flex: 1; min-width: 0;">
                    <div style="font: 700 12px Manrope, sans-serif; color: var(--tx, #e6ecf3); white-space: nowrap;">{{ t.cpWinterSeason || 'Winter Season' }}</div>
                    <div class="cp-card-hint" style="white-space: nowrap;">Rules activation period</div>
                  </div>

                  <!-- Status + date range (clickable) -->
                  <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; background: var(--inner, #1e2733); border: 1px solid var(--border, #27313f); cursor: pointer; flex-shrink: 0;"
                       (click)="showSeasonPicker = !showSeasonPicker">

                    <!-- Status dot -->
                    <span style="width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; transition: background 0.3s;"
                          [style.background]="isWinterSeasonActive ? '#34d399' : 'var(--t3, #5c6675)'"
                          [style.box-shadow]="isWinterSeasonActive ? '0 0 5px rgba(52,211,153,0.7)' : 'none'"></span>

                    <!-- Date range inline -->
                    <span style="font: 700 11px 'IBM Plex Mono', monospace; color: var(--accent, #5c7cfa); white-space: nowrap;">
                      {{ (config.thermostat.winterSeason.start | date:'d MMM yy') || '--' }}
                    </span>
                    <i class="material-icons" style="color: var(--t3, #5c6675); font-size: 12px;">arrow_forward</i>
                    <span style="font: 700 11px 'IBM Plex Mono', monospace; color: var(--accent, #5c7cfa); white-space: nowrap;">
                      {{ (config.thermostat.winterSeason.end | date:'d MMM yy') || '--' }}
                    </span>

                    <i class="material-icons" style="color: var(--t3, #5c6675); font-size: 14px; margin-left: 2px;">edit_calendar</i>
                  </div>

                  <!-- Dropdown Picker -->
                  <div *ngIf="showSeasonPicker" 
                       style="position: absolute; top: calc(100% + 8px); right: 0; background: var(--panel, #141b25); border: 1px solid var(--border, #27313f); padding: 14px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 50; display: flex; flex-direction: column; gap: 12px; min-width: 240px;" 
                       (click)="$event.stopPropagation()">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                       <span style="font: 700 12px Manrope, sans-serif; color: var(--tx, #e6ecf3);">Select Season Dates</span>
                       <i class="material-icons" style="font-size: 16px; cursor: pointer; color: var(--t3, #5c6675);" (click)="showSeasonPicker = false">close</i>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                         <span style="font: 700 10px Manrope, sans-serif; color: var(--t2, #8b97a8); text-transform: uppercase; width: 36px;">Start</span>
                         <input type="date" [(ngModel)]="config.thermostat.winterSeason.start" style="flex: 1; border: 1px solid var(--border, #27313f); padding: 7px 10px; border-radius: 7px; font-size: 12px; font-family: inherit; background: var(--inner, #1e2733); color: var(--tx, #e6ecf3); outline: none;">
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px;">
                         <span style="font: 700 10px Manrope, sans-serif; color: var(--t2, #8b97a8); text-transform: uppercase; width: 36px;">End</span>
                         <input type="date" [(ngModel)]="config.thermostat.winterSeason.end" style="flex: 1; border: 1px solid var(--border, #27313f); padding: 7px 10px; border-radius: 7px; font-size: 12px; font-family: inherit; background: var(--inner, #1e2733); color: var(--tx, #e6ecf3); outline: none;">
                      </div>
                    </div>
                    <button type="button" (click)="showSeasonPicker = false" style="background: var(--accent, #5c7cfa); color: white; border: none; padding: 9px 12px; border-radius: 7px; font: 700 11px Manrope, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; width: 100%;">Apply</button>
                  </div>
                </div>

                <!-- Maintenance Card -->
                <div class="cp-card">
                  <div class="cp-card-head">
                    <i class="material-icons" [style.color]="config.thermostat.maintenance.enabled ? 'var(--accent,#5c7cfa)' : 'var(--t3,#5c6675)'">build_circle</i>
                    <span>{{ t.maintenanceT || 'Valve Maintenance' }}</span>
                    <div class="cp-knob cp-knob--sm" [class.cp-knob--on]="config.thermostat.maintenance.enabled"
                      (click)="config.thermostat.maintenance.enabled = !config.thermostat.maintenance.enabled; $event.stopPropagation()">
                      <span></span>
                    </div>
                  </div>
                  <p class="cp-card-hint">{{ t.maintenanceHint || 'Periodically fully opens then closes the valve to prevent limescale build-up.' }}</p>

                  <div class="cp-schedule-list">
                    <div class="cp-schedule-row" *ngFor="let test of config.thermostat.maintenance.tests; let i = index">
                      <div class="cp-schedule-times">
                        <select [(ngModel)]="test.day" class="cp-input-sm" [disabled]="!config.thermostat.maintenance.enabled">
                          <option [value]="1">{{ getWeekdayName('Mon') }}</option>
                          <option [value]="2">{{ getWeekdayName('Tue') }}</option>
                          <option [value]="3">{{ getWeekdayName('Wed') }}</option>
                          <option [value]="4">{{ getWeekdayName('Thu') }}</option>
                          <option [value]="5">{{ getWeekdayName('Fri') }}</option>
                          <option [value]="6">{{ getWeekdayName('Sat') }}</option>
                          <option [value]="7">{{ getWeekdayName('Sun') }}</option>
                        </select>
                        <input type="text" [(ngModel)]="test.time" class="cp-input-sm" [disabled]="!config.thermostat.maintenance.enabled" placeholder="HH:MM" maxlength="5" pattern="^(2[0-3]|[01]?[0-9]):([0-5][0-9])$" style="width: 70px;">
                      </div>
                      <button class="cp-icon-btn cp-icon-btn--danger" (click)="removeMaintTest(i)"
                        [disabled]="!config.thermostat.maintenance.enabled || config.thermostat.maintenance.tests.length <= 1">
                        <i class="material-icons">delete</i>
                      </button>
                    </div>
                  </div>
                  <button class="cp-add-btn" (click)="addMaintTest()" [disabled]="!config.thermostat.maintenance.enabled">
                    <i class="material-icons">add</i> {{ t.addTest || 'Add Test' }}
                  </button>
                </div>

                <!-- Preheating Settings Card -->
                <div class="cp-card">
                  <div class="cp-card-head">
                    <i class="material-icons" style="color: var(--accent,#5c7cfa)">ac_unit</i>
                    <span>{{ t.cpPreheatingSettings || 'Preheating Settings' }}</span>
                  </div>
                  
                  <div class="cp-preheat-row">
                    <div class="cp-preheat-label-group">
                      <span class="cp-preheat-title">{{ t.cpPreheatingTemp || 'Preheating Temperature' }}</span>
                      <span class="cp-preheat-subtitle">{{ t.cpPreheatingTempHint || 'Target temperature to preheat the room to before check-in' }}</span>
                    </div>
                    <div class="cp-mini-stepper">
                      <button class="cp-step-btn" (click)="bumpPreheatingTemp(-1)"><i class="material-icons">remove</i></button>
                      <span class="cp-mini-val"><b>{{ config.thermostat.preheatingTemp }}</b><span class="cp-mini-unit">°C</span></span>
                      <button class="cp-step-btn" (click)="bumpPreheatingTemp(1)"><i class="material-icons">add</i></button>
                    </div>
                  </div>

                  <div class="cp-preheat-row">
                    <div class="cp-preheat-label-group">
                      <span class="cp-preheat-title">{{ t.cpPreheatingMinutes || 'Preheating Time' }}</span>
                      <span class="cp-preheat-subtitle">{{ t.cpPreheatingMinutesHint || 'How early to start heating the room before check-in' }}</span>
                    </div>
                    <div class="cp-mini-stepper">
                      <button class="cp-step-btn" (click)="bumpPreheatingMinutes(-15)"><i class="material-icons">remove</i></button>
                      <span class="cp-mini-val"><b>{{ config.thermostat.preheatingMinutes }}</b><span class="cp-mini-unit">min</span></span>
                      <button class="cp-step-btn" (click)="bumpPreheatingMinutes(15)"><i class="material-icons">add</i></button>
                    </div>
                  </div>
                </div>

              </div>

              </div><!-- /cp-card-grid-2 -->

            </div>
          </ng-container>

          <!-- ═══ NOISE ═══ -->
          <ng-container *ngIf="activeSection === 'noise'">
            <div class="cp-section">

              <!-- Header -->
              <div class="cp-section-hdr">
                <div class="cp-section-icon cp-section-icon--accent">
                  <i class="material-icons">volume_up</i>
                </div>
                <div class="cp-section-title-area">
                  <p>{{ t.noiseThresholdHint || 'Noise thresholds per period — day and night limits.' }}</p>
                </div>
              </div>

              <div [class.cp-disabled-section]="!config.noise.enabled">

                <!-- Day Period -->
                <div class="cp-noise-block" *ngFor="let period of noisePeriods; trackBy: trackByKey">
                  <div class="cp-noise-period-hdr">
                    <div class="cp-noise-icon" [style.background]="period.iconBg" [style.color]="period.iconColor">
                      <i class="material-icons">{{ period.icon }}</i>
                    </div>
                    <div>
                      <div class="cp-noise-period-title">{{ period.label }}</div>
                      <div class="cp-noise-period-times">
                        <input type="text" [(ngModel)]="period.start" (ngModelChange)="onNoisePeriodChanged()" class="cp-input-xs" placeholder="HH:MM" maxlength="5" pattern="^(2[0-3]|[01]?[0-9]):([0-5][0-9])$">
                        <i class="material-icons" style="font-size: 13px; color: var(--t3,#5c6675)">arrow_forward</i>
                        <input type="text" [(ngModel)]="period.end" (ngModelChange)="onNoisePeriodChanged()" class="cp-input-xs" placeholder="HH:MM" maxlength="5" pattern="^(2[0-3]|[01]?[0-9]):([0-5][0-9])$">
                      </div>
                    </div>
                  </div>

                  <div class="cp-th-grid">
                    <div class="cp-th-card" *ngFor="let th of period.levels; trackBy: trackByKey">
                      <div class="cp-th-top">
                        <div class="cp-th-icon" [style.background]="th.iconBg" [style.color]="th.iconColor">
                          <i class="material-icons">{{ th.icon }}</i>
                        </div>
                        <span class="cp-th-label">{{ th.label }}</span>
                        <span class="cp-th-status" [style.background]="th.statusBg" [style.color]="th.statusColor">{{ th.statusLabel }}</span>
                      </div>
                      <div class="cp-th-value-area cp-th-value-area--row">
                        <div>
                          <span class="cp-th-val" [style.color]="th.statusColor">{{ th.current }}<span class="cp-th-unit"> {{ th.unit }}</span></span>
                          <span class="cp-th-sub">{{ t.cpCurrent || 'Current' }}</span>
                        </div>
                        <div class="cp-th-inputs">
                          <div class="cp-th-input-grp cp-th-input-grp--max">
                            <span class="cp-th-input-lbl">MAX</span>
                            <input class="cp-th-num cp-th-num--max" type="number" (focus)="$event.target.select()" [(ngModel)]="th.limit" (ngModelChange)="onNoiseThresholdChange(period.key, th.key, th.limit)">
                          </div>
                        </div>
                      </div>
                      <div class="cp-th-bar">
                        <div class="cp-th-bar-fill" [style.width]="th.percent + '%'" [style.background]="th.statusColor"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Acoustic Metrics Guide -->
                <div class="cp-noise-guide">
                  <div class="cp-noise-guide-card" style="--ac-color: #0ea5e9; --ac-bg: rgba(14,165,233,.14);">
                    <div class="cp-noise-guide-hdr">
                      <div class="cp-noise-guide-icon">
                        <i class="material-icons">equalizer</i>
                      </div>
                      <div class="cp-noise-guide-title">
                        <span>{{ t.cpLaeqName || 'LAEQ' }}</span>
                        <small>Continuous Average</small>
                      </div>
                    </div>
                    <p class="cp-noise-guide-body">{{ t.cpLaeqHint || 'Equivalent continuous level — average sound energy over time; best gauge of ongoing comfort.' }}</p>
                  </div>

                  <div class="cp-noise-guide-card" style="--ac-color: #6366f1; --ac-bg: rgba(99,102,241,.14);">
                    <div class="cp-noise-guide-hdr">
                      <div class="cp-noise-guide-icon">
                        <i class="material-icons">show_chart</i>
                      </div>
                      <div class="cp-noise-guide-title">
                        <span>{{ t.cpLaiName || 'LAI' }}</span>
                        <small>Impulse Level</small>
                      </div>
                    </div>
                    <p class="cp-noise-guide-body">{{ t.cpLaiHint || 'Instantaneous level — captures short peaks and transient events (e.g. doors slamming, footsteps).' }}</p>
                  </div>

                  <div class="cp-noise-guide-card" style="--ac-color: #ef4444; --ac-bg: rgba(239,68,68,.14);">
                    <div class="cp-noise-guide-hdr">
                      <div class="cp-noise-guide-icon">
                        <i class="material-icons">trending_up</i>
                      </div>
                      <div class="cp-noise-guide-title">
                        <span>{{ t.cpLaimaxName || 'LAIMAX' }}</span>
                        <small>Peak Maximum</small>
                      </div>
                    </div>
                    <p class="cp-noise-guide-body">{{ t.cpLaimaxHint || 'Maximum level recorded — the absolute loudest impact/peak moment in the measurement interval.' }}</p>
                  </div>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ═══ WINDOW ALERT ═══ -->
          <ng-container *ngIf="activeSection === 'window'">
            <div class="cp-section">

              <!-- Header -->
              <div class="cp-section-hdr">
                <div class="cp-section-icon cp-section-icon--accent">
                  <i class="material-icons">window</i>
                </div>
                <div class="cp-section-title-area">
                  <p>{{ t.cpWindowAlertHint || 'Notify staff if a window stays open longer than this.' }}</p>
                </div>
              </div>

              <div [class.cp-disabled-section]="!config.window.enabled">
                <div class="cp-card-stack">

                <div class="cp-card-grid-2">
                  <!-- Auto-pause Card -->
                  <div class="cp-card">
                    <div class="cp-card-head">
                      <i class="material-icons" [style.color]="config.window.autoPauseHeating ? 'var(--ok,#34d399)' : 'var(--t3,#5c6675)'">local_fire_department</i>
                      <span>{{ t.cpWindowAutoPause || 'Auto-pause Heating' }}</span>
                    </div>
                    <div class="cp-toggle-row" (click)="config.window.autoPauseHeating = !config.window.autoPauseHeating"
                      [class.cp-toggle-row--on]="config.window.autoPauseHeating">
                      <div class="cp-knob" [class.cp-knob--on]="config.window.autoPauseHeating">
                        <span></span>
                      </div>
                      <span [style.color]="config.window.autoPauseHeating ? 'var(--ok,#34d399)' : 'var(--t3,#5c6675)'">
                        {{ config.window.autoPauseHeating ? (t.cpOn || 'On') : (t.cpOff || 'Off') }}
                      </span>
                    </div>
                    <p class="cp-card-hint">{{ t.cpWindowAutoPauseHint || 'Pause the valve automatically while a window is open in the room.' }}</p>
                  </div>

                  <!-- Alert Minutes Card -->
                  <div class="cp-card cp-card--center">
                    <div class="cp-card-head">
                      <i class="material-icons" style="color: var(--warn,#f5b54a)">timer</i>
                      <span>{{ t.cpWindowAlertT || 'Open-Window Alert' }}</span>
                    </div>
                    <div class="cp-big-stepper">
                      <button class="cp-step-btn cp-step-btn--lg" (click)="bumpWindowMinutes(-5)"><i class="material-icons">remove</i></button>
                      <div class="cp-big-step-val">
                        <span class="cp-big-num">{{ config.window.thresholdMinutes }}</span>
                        <span class="cp-big-unit">{{ t.minutesU || 'min' }}</span>
                      </div>
                      <button class="cp-step-btn cp-step-btn--lg" (click)="bumpWindowMinutes(5)"><i class="material-icons">add</i></button>
                    </div>
                    <p class="cp-card-hint cp-card-hint--center">{{ t.cpWindowAlertHint || 'Notify staff if a window stays open longer than this.' }}</p>
                  </div>
                </div>

                <!-- Currently Open Windows -->
                <div class="cp-card">
                  <div class="cp-card-head">
                    <i class="material-icons" style="color: var(--accent,#5c7cfa)">sensor_door</i>
                    <span>{{ t.cpCurrentlyOpen || 'Currently Open Windows' }}</span>
                    <span class="cp-card-count">{{ openWindowsList.length }}</span>
                  </div>
                  <div *ngIf="openWindowsList.length === 0" class="cp-empty">
                    {{ t.cpNoOpenWindows || 'All windows closed right now' }}
                  </div>
                  <div class="cp-open-windows-grid" *ngIf="openWindowsList.length > 0">
                    <div class="cp-open-win" *ngFor="let ow of openWindowsList; let i = index">
                      <i class="material-icons">meeting_room</i>
                      <div>
                        <div class="cp-open-win-name">Window {{ ow.windowIndex }}</div>
                        <div class="cp-open-win-state">Room {{ ow.roomNumber }}</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div><!-- /cp-card-stack -->
              </div>
            </div>
          </ng-container>

          <!-- ═══ MEWS SYNC ═══ -->
          <ng-container *ngIf="activeSection === 'mews'">
            <div class="cp-section">

              <!-- Header -->
              <div class="cp-section-hdr">
                <div class="cp-section-icon cp-section-icon--accent">
                  <i class="material-icons">router</i>
                </div>
                <div class="cp-section-title-area">
                  <p>{{ t.mewsSyncHint || 'How often reservation data is pulled from Mews PMS.' }}</p>
                </div>
                <span class="cp-badge" [class.cp-badge--ok]="mewsOnline" [class.cp-badge--alert]="!mewsOnline">
                  <i class="material-icons" style="font-size: 14px">{{ mewsOnline ? 'check_circle' : 'error' }}</i>
                  {{ mewsOnline ? (t.onlineLabel || 'Online') : (t.offlineLabel || 'Offline') }}
                </span>
              </div>

              <div class="cp-card-grid-2">
                <!-- Auto Sync Card -->
                <div class="cp-card">
                  <div class="cp-card-head">
                    <i class="material-icons" style="color: var(--ok,#34d399)">sync</i>
                    <span>{{ t.mewsAutoSyncT || 'Auto Sync' }}</span>
                  </div>
                  <div class="cp-status-box cp-status-box--ok">
                    <i class="material-icons">check_circle</i>
                    <span>{{ t.mewsAutoSyncHint || 'Reservation data is kept up to date automatically.' }}</span>
                  </div>
                </div>

                <!-- Sync Interval Card -->
                <div class="cp-card cp-card--center">
                  <div class="cp-card-head">
                    <i class="material-icons" style="color: var(--accent,#5c7cfa)">schedule</i>
                    <span>{{ t.mewsSyncT || 'Sync Interval' }}</span>
                  </div>
                  <div class="cp-big-stepper">
                    <button class="cp-step-btn cp-step-btn--lg" (click)="bumpMewsInterval(-5)"><i class="material-icons">remove</i></button>
                    <div class="cp-big-step-val">
                      <span class="cp-big-num">{{ config.mews.intervalMinutes }}</span>
                      <span class="cp-big-unit">{{ t.minutesU || 'min' }}</span>
                    </div>
                    <button class="cp-step-btn cp-step-btn--lg" (click)="bumpMewsInterval(5)"><i class="material-icons">add</i></button>
                  </div>
                  <p class="cp-card-hint cp-card-hint--center">{{ t.mewsSyncHint || 'How often reservation data is pulled from Mews PMS.' }}</p>
                </div>
              </div>

              <!-- Last Sync + Sync Now -->
              <div class="cp-card cp-card--row">
                <i class="material-icons" style="color: var(--t2,#8b97a8); font-size: 20px">history</i>
                <div class="cp-last-sync">
                  <div class="cp-last-sync-label">{{ t.lastSyncT || 'Last Sync' }}</div>
                  <div class="cp-last-sync-val">{{ mewsLastSyncAgo }} {{ t.minAgo || 'min ago' }}</div>
                </div>
                <button class="cp-sync-btn" (click)="syncMewsNow()">
                  <i class="material-icons">sync</i> {{ t.syncNow || 'Sync Now' }}
                </button>
              </div>

            </div>
          </ng-container>


        </div>
      </div>

      <!-- Footer -->
      <div class="cp-footer">
        <span class="cp-footer-scope">
          {{ t.appliesTo || 'Applies to' }} <b>{{ roomScopeCount }}</b> {{ t.ofRooms || 'of' }} {{ totalRooms }} {{ t.roomsTargeted || 'rooms' }}
        </span>
        <button class="cp-btn cp-btn--primary" (click)="save()">
          <i class="material-icons">save</i>
          {{ t.cpSaveThresholds || 'Save' }}
        </button>
      </div>

    </div>
  </div>
  `,
  styleUrls: ['./control-panel.component.scss'],
  standalone: false,
})
export class ControlPanelComponent implements OnInit, OnDestroy {
  isOpen = false;
  activeSection: ControlPanelSectionId = 'noise';
  sections: ControlPanelSection[] = [];
  weekdays = WEEKDAYS;

  config: ControlPanelConfig = JSON.parse(JSON.stringify(DEFAULT_CONTROL_PANEL_CONFIG));
  originalConfig: ControlPanelConfig | null = null;
  private rooms: any[] = [];
  private _subs = new Subscription();

  // Cached derived data (prevent infinite change detection from getters creating new objects)
  climateThresholds: any[] = [];
  purityThresholds: any[] = [];
  noisePeriods: any[] = [];

  openWindowsList: any[] = [];
  thermostatSchedule: any[] = [];

  // Mews state (would come from HotelStateService in production)
  mewsOnline = true;
  mewsLastSyncAgo = 6;

  // Scope / Room targeting
  scopeDropdownOpen = false;
  scopeSearch = '';
  filteredScopeChips: any[] = [];

  get scopeSummary(): string {
    const count = this.roomScopeCount;
    const total = this.totalRooms;
    if (this.config.roomScope === 'all') return `${count} ${this.t.rooms || 'rooms'}`;
    return `${count} ${this.t.ofRooms || 'of'} ${total} ${this.t.rooms || 'rooms'}`;
  }

  botChatId: string = '';

  showSeasonPicker = false;

  constructor(
    private controlPanelService: ControlPanelService,
    private translationService: TranslationService,
    private hotelStateService: HotelStateService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  get isDark(): boolean {
    return this.themeService.activeMode === 'dark';
  }

  get t() {
    return this.translationService.t;
  }

  get scheduleSeq(): number {
    return Math.max(...this.config.thermostat.schedule.map(s => s.id), 0) + 1;
  }

  getSidebarLabel(id: string): string {
    switch(id) {
      case 'air_quality': return this.t.airQuality || 'Air Quality';
      case 'thermostat': return this.t.thermostatsT || 'Thermostats';
      case 'noise': return this.t.acousticNoise || 'Acoustic Noise';
      case 'window': return this.t.windowOpenAlert || 'Window';
      case 'mews': return this.t.mewsB || 'Mews Bridge';

      default: return id;
    }
  }

  getWeekdayName(day: string): string {
    const mapEN: any = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };
    const mapRU: any = { Mon: 'Пн', Tue: 'Вт', Wed: 'Ср', Thu: 'Чт', Fri: 'Пт', Sat: 'Сб', Sun: 'Вс' };
    return this.translationService.activeLangCode === 'RU' ? mapRU[day] : mapEN[day];
  }

  getTempColor(temp: number): string {
    if (!this.isDark) {
      if (temp >= 24) return '#dc2626';
      if (temp >= 21) return '#b45309';
      return '#1d4ed8';
    }
    if (temp >= 24) return '#f87171';
    if (temp >= 21) return '#fbbf24';
    return '#60a5fa';
  }

  getTempBg(temp: number): string {
    if (!this.isDark) {
      if (temp >= 24) return 'rgba(220,38,38,.16)';
      if (temp >= 21) return 'rgba(217,119,6,.18)';
      return 'rgba(37,99,235,.15)';
    }
    if (temp >= 24) return 'rgba(248,113,113,.12)';
    if (temp >= 21) return 'rgba(251,191,36,.12)';
    return 'rgba(96,165,250,.12)';
  }

  getClockColor(time: string): string {
    const hour = parseInt((time || '12:00').split(':')[0], 10) || 12;
    if (!this.isDark) {
      if (hour >= 6 && hour < 12) return '#d97706';   // morning — dark amber
      if (hour >= 12 && hour < 17) return '#0284c7';  // afternoon — dark sky
      if (hour >= 17 && hour < 21) return '#c2410c';  // evening — dark orange
      return '#4f46e5';                                // night — dark indigo
    }
    if (hour >= 6 && hour < 12) return '#f59e0b';   // morning — amber
    if (hour >= 12 && hour < 17) return '#38bdf8';  // afternoon — sky
    if (hour >= 17 && hour < 21) return '#f97316';  // evening — orange
    return '#818cf8';                                // night — indigo
  }

  ngOnInit(): void {
    this.sections = this.controlPanelService.sections;
    this.rebuildDerived();
    this._subs.add(this.controlPanelService.isOpen$.subscribe(v => {
      this.isOpen = v;
      if (v) this.rebuildDerived();
      this.cdr.detectChanges();
    }));
    this._subs.add(this.controlPanelService.activeSection$.subscribe(v => {
      this.activeSection = v;
      this.cdr.detectChanges();
    }));
    this._subs.add(this.controlPanelService.config$.subscribe(c => {
      if (!c) return;
      this.config = JSON.parse(JSON.stringify(c));
      this.ensureDefaults();
      this.originalConfig = JSON.parse(JSON.stringify(this.config));
      this.rebuildDerived();
      this.rebuildScopeChips();
      this.cdr.detectChanges();
    }));
    this._subs.add(this.themeService.mode$.subscribe(() => {
      this.cdr.detectChanges();
    }));
    this._subs.add(this.hotelStateService.rooms$.subscribe(r => {
      this.rooms = r;
      this.rebuildDerived();
      this.rebuildScopeChips();
      this.cdr.detectChanges();
    }));
  }

  /** Rebuild all cached derived arrays — called after config/rooms change */
  private rebuildDerived(): void {
    this.climateThresholds = this._buildClimateThresholds();
    this.purityThresholds = this._buildPurityThresholds();
    this.noisePeriods = this._buildNoisePeriods();

    this.openWindowsList = this._buildOpenWindowsList();
    this.thermostatSchedule = this.config?.thermostat?.schedule || [];
  }

  private ensureDefaults(): void {
    const d = DEFAULT_CONTROL_PANEL_CONFIG;

    // Air Quality
    if (this.config.airQuality) {
      const aq = this.config.airQuality;
      if (aq.tempMin === undefined) aq.tempMin = d.airQuality.tempMin;
      if (aq.humMin === undefined) aq.humMin = d.airQuality.humMin;
      if (aq.pressMin === undefined) aq.pressMin = d.airQuality.pressMin;
      if (aq.co2Min === undefined) aq.co2Min = d.airQuality.co2Min;
      if (aq.pm25Min === undefined) aq.pm25Min = d.airQuality.pm25Min;
      if (aq.pm10Min === undefined) aq.pm10Min = d.airQuality.pm10Min;
      if (aq.tvocMin === undefined) aq.tvocMin = d.airQuality.tvocMin;
      // Warning gap defaults
      if ((aq as any).co2WarnGap === undefined) (aq as any).co2WarnGap = d.airQuality.co2WarnGap;
      if ((aq as any).pm25WarnGap === undefined) (aq as any).pm25WarnGap = d.airQuality.pm25WarnGap;
      if ((aq as any).pm10WarnGap === undefined) (aq as any).pm10WarnGap = d.airQuality.pm10WarnGap;
      if ((aq as any).tvocWarnGap === undefined) (aq as any).tvocWarnGap = d.airQuality.tvocWarnGap;
      if ((aq as any).tempWarnGap === undefined) (aq as any).tempWarnGap = d.airQuality.tempWarnGap;
      if ((aq as any).humWarnGap === undefined) (aq as any).humWarnGap = d.airQuality.humWarnGap;
      if ((aq as any).pressWarnGap === undefined) (aq as any).pressWarnGap = d.airQuality.pressWarnGap;
    }

    // Thermostat
    if (!this.config.thermostat) {
      this.config.thermostat = JSON.parse(JSON.stringify(d.thermostat));
    }
    if (this.config.thermostat.valveOpen === undefined) this.config.thermostat.valveOpen = d.thermostat.valveOpen;
    if (this.config.thermostat.preheatingTemp === undefined) this.config.thermostat.preheatingTemp = d.thermostat.preheatingTemp;
    if (this.config.thermostat.preheatingMinutes === undefined) this.config.thermostat.preheatingMinutes = d.thermostat.preheatingMinutes;
    if (!this.config.thermostat.schedule || this.config.thermostat.schedule.length === 0) {
      this.config.thermostat.schedule = JSON.parse(JSON.stringify(d.thermostat.schedule));
    }
    if (!this.config.thermostat.maintenance) {
      this.config.thermostat.maintenance = JSON.parse(JSON.stringify(d.thermostat.maintenance));
    } else {
      if (this.config.thermostat.maintenance.enabled === undefined) this.config.thermostat.maintenance.enabled = d.thermostat.maintenance.enabled;
      if (!this.config.thermostat.maintenance.tests || this.config.thermostat.maintenance.tests.length === 0) {
        this.config.thermostat.maintenance.tests = JSON.parse(JSON.stringify(d.thermostat.maintenance.tests));
      }
    }
    if (!this.config.thermostat.winterSeason) {
      this.config.thermostat.winterSeason = JSON.parse(JSON.stringify(d.thermostat.winterSeason));
    } else {
      if (this.config.thermostat.winterSeason.enabled === undefined) this.config.thermostat.winterSeason.enabled = d.thermostat.winterSeason.enabled;
    }

    // Noise
    if (!this.config.noise) {
      this.config.noise = JSON.parse(JSON.stringify(d.noise));
    } else {
      if (this.config.noise.noiseMax === undefined) this.config.noise.noiseMax = d.noise.noiseMax;
      if (this.config.noise.laeqMax === undefined) this.config.noise.laeqMax = d.noise.laeqMax;
      if (this.config.noise.laiMax === undefined) this.config.noise.laiMax = d.noise.laiMax;
      if (this.config.noise.laimaxMax === undefined) this.config.noise.laimaxMax = d.noise.laimaxMax;
      if (!this.config.noise.dayPeriod) this.config.noise.dayPeriod = JSON.parse(JSON.stringify(d.noise.dayPeriod));
      if (!this.config.noise.nightPeriod) this.config.noise.nightPeriod = JSON.parse(JSON.stringify(d.noise.nightPeriod));
      if (!this.config.noise.day) this.config.noise.day = JSON.parse(JSON.stringify(d.noise.day));
      if (!this.config.noise.night) this.config.noise.night = JSON.parse(JSON.stringify(d.noise.night));
    }

    // Window
    if (!this.config.window) {
      this.config.window = JSON.parse(JSON.stringify(d.window));
    }
    if (this.config.window.autoPauseHeating === undefined) this.config.window.autoPauseHeating = d.window.autoPauseHeating;
    if (this.config.window.thresholdMinutes === undefined) this.config.window.thresholdMinutes = d.window.thresholdMinutes;

    // Mews
    if (!this.config.mews) {
      this.config.mews = JSON.parse(JSON.stringify(d.mews));
    }
    if (this.config.mews.autoSync === undefined) this.config.mews.autoSync = d.mews.autoSync;



    // Room scope
    if (!this.config.roomScope) this.config.roomScope = 'all';
    if (!this.config.roomScopeList) this.config.roomScopeList = [];
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  // ── Room Scope ──

  get totalRooms(): number {
    return this.rooms.length || 0;
  }

  get roomScopeCount(): number {
    if (this.config.roomScope === 'all') {
      return Math.max(0, this.totalRooms - (this.config.roomScopeList?.length || 0));
    }
    return this.config.roomScopeList?.length || 0;
  }

  // ── Air Quality Thresholds ──

  private thresholdMeta(metric: string): any {
    const meta: any = {
      temp:  { icon: 'device_thermostat', iconBg: 'rgba(249,115,22,.15)', iconColor: '#f97316', label: this.t.cpTempMax || 'TEMP MAX', desc: 'Upper temperature limit before triggering high temp alerts.', unit: '°C', rangeMax: 45, hasMin: true,  sliderMin: 10, sliderMax: 40, sliderStep: 1 },
      hum:   { icon: 'water_drop',        iconBg: 'rgba(56,189,248,.15)', iconColor: '#38bdf8', label: this.t.cpHumMax || 'HUMIDITY MAX', desc: 'Maximum indoor humidity allowed to prevent mold and dampness.', unit: '%', rangeMax: 95, hasMin: true,  sliderMin: 20, sliderMax: 90, sliderStep: 1 },
      press: { icon: 'compress',          iconBg: 'rgba(168,85,247,.15)', iconColor: '#a855f7', label: this.t.cpPressMax || 'PRESSURE MAX', desc: 'Atmospheric pressure limit.', unit: 'hPa', rangeMax: 1200, hasMin: false,  sliderMin: 950, sliderMax: 1150, sliderStep: 1 },
      co2:   { icon: 'co2',               iconBg: 'rgba(52,211,153,.15)', iconColor: '#34d399', label: this.t.cpCo2Limit || 'CO₂', desc: 'Carbon dioxide threshold; high levels indicate poor ventilation.', unit: 'ppm', rangeMax: 2000, hasMin: false, sliderMin: 300, sliderMax: 2000, sliderStep: 10 },
      pm25:  { icon: 'blur_on',           iconBg: 'rgba(251,191,36,.15)',  iconColor: '#fbbf24', label: this.t.cpPm25Limit || 'PM2.5', desc: 'Fine particulate matter under 2.5 microns (dust, smoke).', unit: 'µg/m³', rangeMax: 150, hasMin: false, sliderMin: 5, sliderMax: 150, sliderStep: 1 },
      pm10:  { icon: 'grain',             iconBg: 'rgba(245,158,11,.15)', iconColor: '#f59e0b', label: this.t.cpPm10Limit || 'PM10', desc: 'Coarse particulate matter under 10 microns (pollen, dust).', unit: 'µg/m³', rangeMax: 300, hasMin: false, sliderMin: 10, sliderMax: 300, sliderStep: 1 },
      tvoc:  { icon: 'science',           iconBg: 'rgba(239,68,68,.15)',  iconColor: '#ef4444', label: this.t.cpTvocLimit || 'TVOC', desc: 'Total Volatile Organic Compounds (chemical odors, aerosols).', unit: 'ppb', rangeMax: 1500, hasMin: false, sliderMin: 100, sliderMax: 1500, sliderStep: 10 },
      laeq:  { icon: 'equalizer',         iconBg: 'rgba(14,165,233,.15)', iconColor: '#0ea5e9', label: this.t.cpLaeqName || 'LAEQ', desc: this.t.cpLaeqHint || 'Equivalent continuous level — average sound energy over time; best gauge of ongoing comfort.', unit: 'dBA', rangeMax: 100, hasMin: false, sliderMin: 20, sliderMax: 100, sliderStep: 1 },
      lai:   { icon: 'show_chart',        iconBg: 'rgba(99,102,241,.15)', iconColor: '#6366f1', label: this.t.cpLaiName || 'LAI', desc: this.t.cpLaiHint || 'Instantaneous level — captures short peaks and transient events.', unit: 'dBA', rangeMax: 100, hasMin: false, sliderMin: 20, sliderMax: 100, sliderStep: 1 },
      laimax:{ icon: 'trending_up',       iconBg: 'rgba(239,68,68,.15)', iconColor: '#ef4444', label: this.t.cpLaimaxName || 'LAIMAX', desc: this.t.cpLaimaxHint || 'Maximum level recorded — the loudest moment in the interval.', unit: 'dBA', rangeMax: 100, hasMin: false, sliderMin: 20, sliderMax: 100, sliderStep: 1 },
    };
    return meta[metric] || { icon: 'help', iconBg: 'rgba(100,100,100,.15)', iconColor: '#888', label: metric, desc: '', unit: '', rangeMax: 100, hasMin: false, sliderMin: 0, sliderMax: 100, sliderStep: 1 };
  }

  private buildThresholdCard(metric: string, maxLimit: number, minLimit: number, warnGap: number): any {
    const meta = this.thresholdMeta(metric);
    const current = this.getLiveValue(metric);
    const status = this.getMetricStatus(current, maxLimit, warnGap, meta.hasMin ? minLimit : undefined);
    const statusColor = status === 'alert' ? 'var(--alert,#f87171)' : status === 'warning' ? 'var(--warn,#f5b54a)' : 'var(--ok,#34d399)';
    const statusBg = status === 'alert' ? 'var(--alertSoft,rgba(248,113,113,.13))' : status === 'warning' ? 'var(--warnSoft,rgba(245,181,74,.13))' : 'var(--okSoft,rgba(52,211,153,.13))';
    const statusLabel = status === 'alert' ? (this.t.alertC || 'EXCEEDED') : status === 'warning' ? (this.t.warningC || 'WARNING') : (this.t.normalC || 'NORMAL');
    const percent = Math.min(100, Math.round((current / maxLimit) * 100));
    return {
      key: metric, icon: meta.icon, iconBg: meta.iconBg, iconColor: meta.iconColor,
      label: meta.label, desc: meta.desc, unit: meta.unit, hasMin: meta.hasMin,
      statusLabel, statusColor, statusBg, current, percent, maxLimit, minLimit, warnGap,
      sliderMin: meta.sliderMin, sliderMax: meta.sliderMax, sliderStep: meta.sliderStep,
    };
  }

  private _buildClimateThresholds(): any[] {
    if (!this.config?.airQuality) return [];
    const aq: any = this.config.airQuality;
    return [
      this.buildThresholdCard('temp',  aq.tempMax,  aq.tempMin,  aq.tempWarnGap  ?? 3),
      this.buildThresholdCard('hum',   aq.humMax,   aq.humMin,   aq.humWarnGap   ?? 10),
      this.buildThresholdCard('press', aq.pressMax, aq.pressMin, aq.pressWarnGap ?? 30),
    ];
  }

  private _buildPurityThresholds(): any[] {
    if (!this.config?.airQuality) return [];
    const aq: any = this.config.airQuality;
    return [
      this.buildThresholdCard('co2',  aq.co2Max,  aq.co2Min,  aq.co2WarnGap  ?? 200),
      this.buildThresholdCard('pm25', aq.pm25Max, aq.pm25Min, aq.pm25WarnGap ?? 10),
      this.buildThresholdCard('pm10', aq.pm10Max, aq.pm10Min, aq.pm10WarnGap ?? 40),
      this.buildThresholdCard('tvoc', aq.tvocMax, aq.tvocMin, aq.tvocWarnGap ?? 150),
    ];
  }

  trackByKey(index: number, item: any): string {
    return item.key;
  }

  onThresholdChange(): void {
    // Sync card edits back to config before rebuild overwrites them
    const aq: any = this.config.airQuality;
    const allCards = [...this.climateThresholds, ...this.purityThresholds];
    for (const th of allCards) {
      const maxKey = th.key + 'Max';
      const minKey = th.key + 'Min';
      const warnKey = th.key + 'WarnGap';
      if (maxKey in aq) aq[maxKey] = th.maxLimit;
      if (minKey in aq) aq[minKey] = th.minLimit;
      aq[warnKey] = th.warnGap;
    }
    this.rebuildDerived();
  }

  // ── Noise build methods ──

  private _buildNoisePeriods(): any[] {
    if (!this.config?.noise) return [];
    const buildPeriod = (key: 'day' | 'night', label: string, icon: string, iconBg: string, iconColor: string) => {
      const period = key === 'day' ? this.config.noise.dayPeriod : this.config.noise.nightPeriod;
      const limits = key === 'day' ? this.config.noise.day : this.config.noise.night;
      return {
        key,
        label: this.t[key === 'day' ? 'dayPeriod' : 'nightPeriod'] || label,
        icon, iconBg, iconColor,
        start: period?.start || '',
        end: period?.end || '',
        levels: [
          this._buildNoiseCard(key, 'laeq', limits?.laeq !== undefined ? limits.laeq : 60),
          this._buildNoiseCard(key, 'lai', limits?.lai !== undefined ? limits.lai : 65),
          this._buildNoiseCard(key, 'laimax', limits?.laimax !== undefined ? limits.laimax : 70),
        ],
      };
    };
    return [
      buildPeriod('day', 'Day', 'wb_sunny', 'rgba(251,191,36,.15)', '#fbbf24'),
      buildPeriod('night', 'Night', 'dark_mode', 'rgba(99,102,241,.15)', '#6366f1'),
    ];
  }

  private _buildNoiseCard(periodKey: string, metric: string, limit: number): any {
    const meta = this.thresholdMeta(metric);
    const current = this.getLiveValue(metric);
    // Noise uses a 20% gap below the limit as the warning zone (no per-metric config for noise yet)
    const noiseWarnGap = Math.round(limit * 0.2);
    const status = this.getMetricStatus(current, limit, noiseWarnGap);
    const statusColor = status === 'alert' ? 'var(--alert,#f87171)' : status === 'warning' ? 'var(--warn,#f5b54a)' : 'var(--ok,#34d399)';
    const statusBg = status === 'alert' ? 'var(--alertSoft,rgba(248,113,113,.13))' : status === 'warning' ? 'var(--warnSoft,rgba(245,181,74,.13))' : 'var(--okSoft,rgba(52,211,153,.13))';
    const statusLabel = status === 'alert' ? (this.t.alertC || 'EXCEEDED') : status === 'warning' ? (this.t.warningC || 'WARNING') : (this.t.normalC || 'NORMAL');
    const percent = Math.min(100, Math.round((current / limit) * 100));
    return {
      key: metric, periodKey, icon: meta.icon, iconBg: meta.iconBg, iconColor: meta.iconColor,
      label: meta.label, desc: meta.desc, unit: meta.unit,
      statusLabel, statusColor, statusBg, current, percent, limit,
    };
  }

  onNoiseThresholdChange(periodKey: string, metric: string, newLimit: number): void {
    const limits = periodKey === 'day' ? this.config.noise.day : this.config.noise.night;
    const key = metric === 'laeq' ? 'laeq' : metric === 'lai' ? 'lai' : 'laimax';
    (limits as any)[key] = newLimit;
    this.rebuildDerived();
    this.cdr.detectChanges();
  }

  onNoisePeriodChanged(): void {
    this.cdr.detectChanges();
  }

  addScheduleInterval(): void {
    const maxId = this.config.thermostat.schedule.reduce((max, s) => Math.max(max, s.id), 0);
    this.config.thermostat.schedule.push({ id: maxId + 1, start: '12:00', end: '14:00', temp: 21 });
    this.thermostatSchedule = this.config.thermostat.schedule;
    this.cdr.detectChanges();
  }

  removeScheduleInterval(index: number): void {
    if (this.config.thermostat.schedule.length > 1) {
      this.config.thermostat.schedule.splice(index, 1);
      this.thermostatSchedule = this.config.thermostat.schedule;
      this.cdr.detectChanges();
    }
  }

  onScheduleChanged(): void {
    this.cdr.detectChanges();
  }

  addMaintTest(): void {
    const id = Math.max(...this.config.thermostat.maintenance.tests.map(t => t.id), 0) + 1;
    this.config.thermostat.maintenance.tests.push({ id, day: 3, time: '03:00' });
    this.cdr.detectChanges();
  }

  removeMaintTest(index: number): void {
    if (this.config.thermostat.maintenance.tests.length > 1) {
      this.config.thermostat.maintenance.tests.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  // ── Window ──

  bumpWindowMinutes(delta: number): void {
    this.config.window.thresholdMinutes = Math.min(60, Math.max(1, this.config.window.thresholdMinutes + delta));
    this.rebuildDerived();
    this.cdr.detectChanges();
  }

  private _buildOpenWindowsList(): any[] {
    const list: any[] = [];
    for (const r of this.rooms) {
      if (!r.roomData) continue;
      const roomName = r.roomData.roomName || r.entityName || '';
      const winDevices = r.roomData.windowDevices || {};
      for (const [entityName, w] of Object.entries(winDevices)) {
        const contact = (w as any).contact;
        const isOpen = contact === 'open' || contact === true || (w as any).open === true;
        if (isOpen) {
          // Parse room number and window index from entity name.
          // Entity name format: anything + first number = room number,
          //                     second number (if present) = window index, else 1.
          const numbers = entityName.match(/\d+/g) || [];
          const roomNumber = numbers[0] || roomName;
          const windowIndex = numbers.length > 1 ? Number(numbers[1]) : 1;
          const dur = (w as any).openDuration || (w as any).duration || '';
          list.push({ room: roomName, roomNumber, windowIndex, sensor: entityName, duration: dur || 'Open' });
        }
      }
    }
    return list;
  }

  // ── Mews ──

  bumpMewsInterval(delta: number): void {
    this.config.mews.intervalMinutes = Math.min(180, Math.max(5, this.config.mews.intervalMinutes + delta));
    this.cdr.detectChanges();
  }

  bumpPreheatingTemp(delta: number): void {
    if (!this.config.thermostat) return;
    const current = this.config.thermostat.preheatingTemp ?? 22;
    this.config.thermostat.preheatingTemp = Math.max(16, Math.min(28, current + delta));
    this.cdr.detectChanges();
  }

  bumpPreheatingMinutes(delta: number): void {
    if (!this.config.thermostat) return;
    const current = this.config.thermostat.preheatingMinutes ?? 180;
    this.config.thermostat.preheatingMinutes = Math.max(0, Math.min(1440, current + delta));
    this.cdr.detectChanges();
  }

  syncMewsNow(): void {
    this.mewsLastSyncAgo = 0;
    this.cdr.detectChanges();
  }


  // ── Common ──

  close(): void {
    this.controlPanelService.close();
  }

  navigateTo(section: ControlPanelSectionId): void {
    this.controlPanelService.navigateTo(section);
  }

  isValidTime(time: string): boolean {
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || '');
  }

  getTimelineSegments(): any[] {
    const minutes = new Array(1440).fill(null);
    const conflicts = new Array(1440).fill(false);

    const parseToMin = (t: string): number => {
      if (!t) return 0;
      const parts = t.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    };

    const formatMin = (m: number): string => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    const schedule = this.config?.thermostat?.schedule || [];

    schedule.forEach((iv, index) => {
      if (!iv.start || !iv.end || !this.isValidTime(iv.start) || !this.isValidTime(iv.end)) return;
      const startMin = parseToMin(iv.start);
      const endMin = parseToMin(iv.end);

      const fillMin = (m: number) => {
        if (m < 0 || m >= 1440) return;
        if (minutes[m] !== null) {
          conflicts[m] = true;
        } else {
          minutes[m] = { id: iv.id, temp: iv.temp, index };
        }
      };

      if (startMin < endMin) {
        for (let m = startMin; m < endMin; m++) {
          fillMin(m);
        }
      } else if (startMin > endMin) {
        // Crosses midnight
        for (let m = startMin; m < 1440; m++) {
          fillMin(m);
        }
        for (let m = 0; m < endMin; m++) {
          fillMin(m);
        }
      }
    });

    const segments: any[] = [];
    let currentSegment: any = null;

    for (let m = 0; m < 1440; m++) {
      const info = minutes[m];
      const isConflict = conflicts[m];
      let stateKey = 'empty';
      if (isConflict) {
        stateKey = 'conflict';
      } else if (info !== null) {
        stateKey = `iv-${info.id}-${info.temp}`;
      }

      if (currentSegment && currentSegment.stateKey === stateKey) {
        currentSegment.end = m + 1;
      } else {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          stateKey,
          start: m,
          end: m + 1,
          info,
          isConflict
        };
      }
    }
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments.map(seg => {
      const duration = seg.end - seg.start;
      const pct = (duration / 1440) * 100;
      let bg = !this.isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
      let label = '';
      let color = !this.isDark ? 'var(--t3, #475569)' : 'var(--t3, #8b97a8)';
      
      if (seg.isConflict) {
        bg = 'var(--alert, #ef4444)';
        label = 'Overlap!';
        color = '#ffffff';
      } else if (seg.info !== null) {
        bg = this.getTempBg(seg.info.temp);
        color = this.getTempColor(seg.info.temp);
        label = `${seg.info.temp}°C`;
      }

      return {
        start: seg.start,
        end: seg.end,
        startStr: formatMin(seg.start),
        endStr: formatMin(seg.end),
        widthPct: pct,
        bg,
        color,
        label,
        isConflict: seg.isConflict,
        isEmpty: seg.info === null && !seg.isConflict,
        info: seg.info
      };
    });
  }

  hasScheduleOverlap(): boolean {
    const segments = this.getTimelineSegments();
    return segments.some(seg => seg.isConflict);
  }

  save(): void {
    // Validate all time entries are in HH:MM format
    for (const iv of this.config.thermostat.schedule) {
      if (!this.isValidTime(iv.start) || !this.isValidTime(iv.end)) {
        alert('Please enter valid times in 24-hour style HH:MM format (e.g., 08:00, 22:30).');
        return;
      }
    }
    for (const test of this.config.thermostat.maintenance.tests) {
      if (!this.isValidTime(test.time)) {
        alert('Please enter valid times in 24-hour style HH:MM format (e.g., 03:00) for valve maintenance.');
        return;
      }
    }
    if (this.config.noise.enabled) {
      const day = this.config.noise.dayPeriod;
      const night = this.config.noise.nightPeriod;
      if (!this.isValidTime(day.start) || !this.isValidTime(day.end) || !this.isValidTime(night.start) || !this.isValidTime(night.end)) {
        alert('Please enter valid times in 24-hour style HH:MM format (e.g., 07:00, 22:00) for acoustic noise periods.');
        return;
      }
    }

    const seasonPattern = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
    const ws = this.config.thermostat.winterSeason;
    if (ws && ws.enabled && (!seasonPattern.test(ws.start) || !seasonPattern.test(ws.end))) {
      alert('Please enter valid season dates in the calendar.');
      return;
    }

    if (this.hasScheduleOverlap()) {
      alert('Cannot save: schedule intervals overlap! Please adjust schedule times so they do not conflict.');
      return;
    }

    const entityIds = this.resolveRoomEntityIds();
    this.controlPanelService.saveConfig(this.config, entityIds);
    this.originalConfig = JSON.parse(JSON.stringify(this.config));
    this.controlPanelService.close();
  }

  // ── Room Scope ──

  /**
   * Resolve ASSET entity IDs for rooms matching the current scope selection.
   * - 'all' with empty roomScopeList → all rooms
   * - 'all' with roomScopeList entries → all rooms EXCEPT those listed
   * - 'except' / 'selected' → only rooms in roomScopeList
   */
  private resolveRoomEntityIds(): string[] {
    if (!this.rooms || this.rooms.length === 0) return [];

    const roomScope = this.config.roomScope as string;
    const scopeList: number[] = this.config.roomScopeList || [];

    // Filter rooms to get the set covered by the current scope
    let targetRooms: any[];
    if (roomScope === 'all') {
      targetRooms = this.rooms.filter(r => {
        const roomNum = parseInt(r.id, 10);
        return isNaN(roomNum) || !scopeList.includes(roomNum);
      });
    } else {
      targetRooms = this.rooms.filter(r => {
        const roomNum = parseInt(r.id, 10);
        return !isNaN(roomNum) && scopeList.includes(roomNum);
      });
    }

    // Extract ASSET entity IDs from each room's mockCtx.datasources
    const entityIds: string[] = [];
    for (const room of targetRooms) {
      const datasources = room.mockCtx?.datasources || [];
      for (const ds of datasources) {
        if (ds.entityType === 'ASSET') {
          const rawId = ds.entityId;
          const resolvedId = typeof rawId === 'string' ? rawId : rawId?.id;
          if (resolvedId && !entityIds.includes(resolvedId)) {
            entityIds.push(resolvedId);
          }
        }
      }
    }

    return entityIds;
  }

  toggleScopeDropdown(): void {
    this.scopeDropdownOpen = !this.scopeDropdownOpen;
    if (this.scopeDropdownOpen) {
      this.scopeSearch = '';
      this.rebuildScopeChips();
    }
  }

  onScopeSearch(): void {
    this.rebuildScopeChips();
  }

  toggleScopeRoom(roomNumber: number): void {
    const list = this.config.roomScopeList || [];
    const idx = list.indexOf(roomNumber);
    if (idx === -1) {
      list.push(roomNumber);
    } else {
      list.splice(idx, 1);
    }
    this.config.roomScopeList = list;
    this.rebuildScopeChips();
    this.cdr.detectChanges();
  }

  rebuildScopeChips(): void {
    const search = (this.scopeSearch || '').toLowerCase();
    this.filteredScopeChips = this.rooms
      .filter(r => {
        if (!search) return true;
        const name = (r.name || '').toLowerCase();
        const id = String(r.id || '');
        return name.includes(search) || id.includes(search);
      })
      .map(r => {
        const roomNum = parseInt(r.id, 10) || 0;
        return {
          roomNumber: roomNum,
          label: `${roomNum} · ${r.name || `Room ${roomNum}`}`,
          excluded: (this.config.roomScopeList || []).includes(roomNum),
        };
      });
  }

  // ── Live value & status ──

  getLiveValue(metric: string): number {
    let total = 0; let count = 0;
    for (const r of this.rooms) {
      if (!r.roomData) continue;
      const rd = r.roomData;
      if (metric === 'co2') {
        for (const aq of Object.values(rd.airSensors || {})) {
          if ((aq as any).co2 != null) { total += (aq as any).co2; count++; }
        }
      } else if (metric === 'pm25') {
        for (const aq of Object.values(rd.airSensors || {})) {
          if ((aq as any).pm25 != null) { total += (aq as any).pm25; count++; }
        }
      } else if (metric === 'pm10') {
        for (const aq of Object.values(rd.airSensors || {})) {
          if ((aq as any).pm10 != null) { total += (aq as any).pm10; count++; }
        }
      } else if (metric === 'tvoc') {
        for (const aq of Object.values(rd.airSensors || {})) {
          const val = (aq as any).tvoc ?? (aq as any).iaq;
          if (val != null) { total += val; count++; }
        }
      } else if (metric === 'temp') {
        if (rd.sensorData?.temperature != null) { total += rd.sensorData.temperature; count++; }
      } else if (metric === 'hum') {
        if (rd.sensorData?.humidity != null) { total += rd.sensorData.humidity; count++; }
      } else if (metric === 'press') {
        for (const aq of Object.values(rd.airSensors || {})) {
          if ((aq as any).pressure != null) { total += (aq as any).pressure; count++; }
        }
      } else if (metric === 'laeq') {
        for (const nd of Object.values(rd.noiseDevices || {})) {
          if ((nd as any).laeq != null) { total += (nd as any).laeq; count++; }
        }
      } else if (metric === 'lai') {
        for (const nd of Object.values(rd.noiseDevices || {})) {
          if ((nd as any).lai != null) { total += (nd as any).lai; count++; }
        }
      } else if (metric === 'laimax') {
        for (const nd of Object.values(rd.noiseDevices || {})) {
          if ((nd as any).laimax != null) { total += (nd as any).laimax; count++; }
        }
      }
    }
    if (count > 0) return Math.round(total / count);
    // Fallbacks
    const fb: any = { co2: 820, pm25: 42, pm10: 110, tvoc: 660, temp: 24, hum: 58, press: 1016, laeq: 55, lai: 60, laimax: 65 };
    return fb[metric] || 0;
  }

  /**
   * Determine metric status using an absolute warning gap.
   * - EXCEEDED : val >= limit
   * - WARNING  : val >= (limit - warnGap)
   * - NORMAL   : otherwise
   */
  getMetricStatus(val: number, limit: number, warnGap: number = 0, minLimit?: number): 'normal' | 'warning' | 'alert' {
    if (minLimit !== undefined) {
      if (val <= minLimit || val >= limit) return 'alert';
      if ((warnGap > 0 && val <= minLimit + warnGap) || (warnGap > 0 && val >= limit - warnGap)) return 'warning';
      return 'normal';
    } else {
      if (val >= limit) return 'alert';
      if (warnGap > 0 && val >= limit - warnGap) return 'warning';
      return 'normal';
    }
  }

  get countNormal(): number {
    return this.allAqMetrics.filter(m => this.getMetricStatus(this.getLiveValue(m), this.getLimitFor(m), this.getWarnGapFor(m), this.getMinLimitFor(m)) === 'normal').length;
  }

  get countWarning(): number {
    return this.allAqMetrics.filter(m => this.getMetricStatus(this.getLiveValue(m), this.getLimitFor(m), this.getWarnGapFor(m), this.getMinLimitFor(m)) === 'warning').length;
  }

  get countAlert(): number {
    return this.allAqMetrics.filter(m => this.getMetricStatus(this.getLiveValue(m), this.getLimitFor(m), this.getWarnGapFor(m), this.getMinLimitFor(m)) === 'alert').length;
  }

  private get allAqMetrics(): string[] {
    return ['co2', 'pm25', 'pm10', 'tvoc', 'temp', 'hum', 'press'];
  }

  private getLimitFor(metric: string): number {
    const aq: any = this.config.airQuality;
    const map: any = { co2: aq.co2Max, pm25: aq.pm25Max, pm10: aq.pm10Max, tvoc: aq.tvocMax, temp: aq.tempMax, hum: aq.humMax, press: aq.pressMax };
    return map[metric] || 100;
  }

  private getMinLimitFor(metric: string): number | undefined {
    const aq: any = this.config.airQuality;
    const map: any = { temp: aq.tempMin, hum: aq.humMin };
    return map[metric];
  }

  private getWarnGapFor(metric: string): number {
    const aq: any = this.config.airQuality;
    const map: any = { co2: aq.co2WarnGap, pm25: aq.pm25WarnGap, pm10: aq.pm10WarnGap, tvoc: aq.tvocWarnGap, temp: aq.tempWarnGap, hum: aq.humWarnGap, press: aq.pressWarnGap };
    return map[metric] ?? 0;
  }

  get isWinterSeasonActive(): boolean {
    const ws = this.config?.thermostat?.winterSeason;
    if (!ws || !ws.start || !ws.end) return false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(ws.start);
    const end = new Date(ws.end);
    end.setHours(23, 59, 59, 999);

    return now >= start && now <= end;
  }
}
