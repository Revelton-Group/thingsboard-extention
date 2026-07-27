import { Component, ElementRef, Inject, OnInit, ViewChild, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ThingsBoardTelemetryService } from '../../../../revelton-tb-extension-historical-dashboard/data/services/thingsboard-telemetry.service';
import { EntityId } from '../../../../revelton-tb-extension-historical-dashboard/core/models/time-range.models';
import { EV_CHARGER_LOG_KEYS } from '../../../core/constants';

export type SocketFilter = 'all' | 'A' | 'B';

export interface EvChargerHistoryModalData {
  deviceId: string;
  deviceName: string;
  deviceCode: string;
}

interface SessionRow {
  ts: number;
  date: Date;
  user: string;
  min: number | null;
  kwh: number;
}

interface BarSlot {
  path: string;
  cx: number;
  tipY: number;
  hitX: number;
  hitW: number;
  xLabel?: string;
  date: Date;
  kwh: number;
  count: number;
}

interface GridLine { y: number; baseline: boolean; label?: string; }
interface XLabel { x: number; text: string; anchor: string; }
interface TipState { show: boolean; x: number; y: number; l1: string; l2: string; l2suffix: string; }

const DAY_MS = 86_400_000;

/* Bar chart geometry (spec: viewBox 708×240) */
const BW = 708, BH = 240, B_PAD_L = 34, B_PAD_R = 6, B_PAD_T = 18, B_PAD_B = 26;
const B_PLOT_W = BW - B_PAD_L - B_PAD_R, B_PLOT_H = BH - B_PAD_T - B_PAD_B;

/* Power line geometry (spec: viewBox 708×220) */
const LW = 708, LH = 220, L_PAD_L = 30, L_PAD_R = 6, L_PAD_T = 14, L_PAD_B = 26;
const L_PLOT_W = LW - L_PAD_L - L_PAD_R, L_PLOT_H = LH - L_PAD_T - L_PAD_B;

const EMPTY_TIP: TipState = { show: false, x: 0, y: 0, l1: '', l2: '', l2suffix: '' };

@Component({
  selector: 'revelton-ev-station-history-modal',
  standalone: false,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="rev-evh-modal">
      <div class="evh-head">
        <div>
          <div class="evh-title">{{ data.deviceName }} — Charging history</div>
          <div class="evh-sub">{{ data.deviceCode }}<ng-container *ngIf="historyStartLabel"> · history starts {{ historyStartLabel }}</ng-container></div>
        </div>
        <button class="evh-close" type="button" (click)="close()" aria-label="Close">×</button>
      </div>

      <div class="evh-controls">
        <div class="evh-tabs" role="tablist" aria-label="History view">
          <button class="evh-tab" type="button" role="tab"
                  *ngFor="let t of tabDefs"
                  [attr.aria-selected]="tab === t.id"
                  (click)="setTab(t.id)">{{ t.label }}</button>
        </div>
        <div class="evh-filters">
          <div class="evh-ranges" role="group" aria-label="Socket selection">
            <button class="evh-range" type="button"
                    *ngFor="let s of socketOptions"
                    [attr.aria-pressed]="socketFilter === s.id"
                    (click)="setSocketFilter(s.id)">{{ s.label }}</button>
          </div>
          <div class="evh-ranges" role="group" aria-label="Date range" *ngIf="tab !== 'power'">
            <button class="evh-range" type="button"
                    *ngFor="let r of rangeOptions"
                    [attr.aria-pressed]="rangeDays === r"
                    (click)="setRange(r)">{{ r === 1 ? '24H' : r + 'D' }}</button>
            <button class="evh-range" type="button"
                    [attr.aria-pressed]="rangeDays === 'custom'"
                    (click)="setRange('custom')">Custom</button>
          </div>
          <div class="evh-ranges" role="group" aria-label="Power time range" *ngIf="tab === 'power'">
            <button class="evh-range" type="button"
                    *ngFor="let r of rangeOptions"
                    [attr.aria-pressed]="powerRangeDays === r"
                    (click)="setPowerRange(r)">{{ r === 1 ? '24H' : r + 'D' }}</button>
            <button class="evh-range" type="button"
                    [attr.aria-pressed]="powerRangeDays === 'custom'"
                    (click)="setPowerRange('custom')">Custom</button>
          </div>

          <!-- Custom range dropdown, anchored under the range buttons -->
          <div class="evh-custom-pop" *ngIf="showCustomPanel" role="dialog" aria-label="Custom range">
            <div class="evh-custom-card">
              <div class="evh-custom-title">Custom Range</div>

              <div class="evh-date-row">
                <span class="evh-date-lbl">Start</span>
                <div class="evh-date-inputs">
                  <input type="date" class="evh-native evh-native-date" [value]="customStartDateIso"
                         (change)="setCustomPart('start', 'date', $any($event.target).value)" aria-label="Start date">
                  <div class="evh-time-24">
                    <input type="number" class="evh-native evh-native-hhmm" [value]="customStartHour"
                           min="0" max="23" placeholder="HH"
                           (change)="setCustomTimePart('start', 'hour', $any($event.target).value)" aria-label="Start hour">
                    <span class="evh-time-sep">:</span>
                    <input type="number" class="evh-native evh-native-hhmm" [value]="customStartMinute"
                           min="0" max="59" placeholder="MM"
                           (change)="setCustomTimePart('start', 'minute', $any($event.target).value)" aria-label="Start minute">
                  </div>
                </div>
              </div>

              <div class="evh-date-row">
                <span class="evh-date-lbl">End</span>
                <div class="evh-date-inputs">
                  <input type="date" class="evh-native evh-native-date" [value]="customEndDateIso"
                         (change)="setCustomPart('end', 'date', $any($event.target).value)" aria-label="End date">
                  <div class="evh-time-24">
                    <input type="number" class="evh-native evh-native-hhmm" [value]="customEndHour"
                           min="0" max="23" placeholder="HH"
                           (change)="setCustomTimePart('end', 'hour', $any($event.target).value)" aria-label="End hour">
                    <span class="evh-time-sep">:</span>
                    <input type="number" class="evh-native evh-native-hhmm" [value]="customEndMinute"
                           min="0" max="59" placeholder="MM"
                           (change)="setCustomTimePart('end', 'minute', $any($event.target).value)"
                           (keyup.enter)="applyCustomRange()" aria-label="End minute">
                  </div>
                </div>
              </div>

              <button type="button" class="evh-apply-btn evh-apply-full" (click)="applyCustomRange()" [disabled]="loadingLogs || loadingPower">
                <div *ngIf="loadingLogs || loadingPower" class="evh-spinner-sm"></div>
                <span>{{ (loadingLogs || loadingPower) ? 'Loading…' : 'Apply' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="evh-kpis">
        <div class="evh-kpi">
          <div class="evh-kpi-lbl">Energy delivered</div>
          <div class="evh-kpi-val">{{ kpiEnergy }} <small>kWh</small></div>
        </div>
        <div class="evh-kpi">
          <div class="evh-kpi-lbl">Sessions</div>
          <div class="evh-kpi-val">{{ kpiCount }}</div>
        </div>
        <div class="evh-kpi">
          <div class="evh-kpi-lbl">Avg per session</div>
          <div class="evh-kpi-val">{{ kpiAvg }} <small>kWh</small></div>
        </div>
        <div class="evh-kpi">
          <div class="evh-kpi-lbl">Charging time</div>
          <div class="evh-kpi-val">{{ kpiTime }}</div>
        </div>
      </div>

      <!-- ── Energy tab ── -->
      <div class="evh-tabpanel" *ngIf="tab === 'energy'">
        <div class="evh-charttitle">Energy delivered per day</div>
        <div class="evh-chartsub">kWh · sum of completed sessions per day</div>
        
        <div class="evh-loading-box" *ngIf="loadingLogs">
          <div class="evh-spinner"></div>
          <span>Loading charge history…</span>
        </div>

        <div class="evh-chartbox" #barBox *ngIf="!loadingLogs">
          <svg #barSvg viewBox="0 0 708 240" role="img"
               aria-label="Bar chart of daily energy delivered in kilowatt hours">
            <ng-container *ngFor="let g of barGrid">
              <svg:line [attr.x1]="34" [attr.x2]="702" [attr.y1]="g.y" [attr.y2]="g.y"
                    class="evh-gridline" [class.baseline]="g.baseline"></svg:line>
              <svg:text *ngIf="g.label" [attr.x]="28" [attr.y]="g.y + 4"
                    text-anchor="end" class="evh-axis">{{ g.label }}</svg:text>
            </ng-container>
            <ng-container *ngFor="let b of barSlots">
              <svg:path *ngIf="b.path" [attr.d]="b.path" class="evh-bar"></svg:path>
            </ng-container>
            <svg:text *ngFor="let x of barXLabels" [attr.x]="x.x" [attr.y]="232"
                  [attr.text-anchor]="x.anchor" class="evh-axis">{{ x.text }}</svg:text>
            <svg:text *ngIf="barPeak" [attr.x]="barPeak.x" [attr.y]="barPeak.y"
                  text-anchor="middle" class="evh-peak">{{ barPeak.text }}</svg:text>
            <svg:rect *ngFor="let b of barSlots; let i = index"
                  [attr.x]="b.hitX" [attr.y]="18" [attr.width]="b.hitW" [attr.height]="196"
                  class="evh-hit"
                  (mousemove)="onBarMove(i)" (mouseleave)="barTip = emptyTip"></svg:rect>
          </svg>
          <div class="evh-tip" *ngIf="barTip.show"
               [style.left.px]="barTip.x" [style.top.px]="barTip.y">
            {{ barTip.l1 }}<br><b>{{ barTip.l2 }}</b>{{ barTip.l2suffix }}
          </div>
        </div>
        <div class="evh-footnote" *ngIf="!loadingLogs">
          Empty slots are days with no charging. Sessions are stored at their real end-times,
          so this chart is exact, not an approximation.
        </div>
      </div>

      <!-- ── Sessions tab ── -->
      <div class="evh-tabpanel" *ngIf="tab === 'sessions'">
        <div class="evh-charttitle">Completed sessions</div>
        <div class="evh-chartsub">Newest first · one row per charge log entry</div>
        
        <div class="evh-loading-box" *ngIf="loadingLogs">
          <div class="evh-spinner"></div>
          <span>Loading completed sessions…</span>
        </div>

        <div class="evh-tablewrap" *ngIf="!loadingLogs && tableRows.length">
          <table class="evh-sess">
            <thead>
              <tr><th>Ended</th><th>User</th><th class="r">Duration</th><th class="r">Energy</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of tableRows">
                <td>{{ formatRowDate(row.date) }}</td>
                <td class="mono">{{ row.user }}</td>
                <td class="r">{{ row.min !== null ? formatDuration(row.min) : '—' }}</td>
                <td class="r"><b>{{ row.kwh.toFixed(2) }} kWh</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="evh-empty" *ngIf="!loadingLogs && !tableRows.length">
          No charging sessions in this range.
        </div>
      </div>

      <!-- ── Power tab ── -->
      <div class="evh-tabpanel" *ngIf="tab === 'power'">
        <div class="evh-charttitle">
          Charging power — {{ powerRangeLabel }}{{ socketFilter !== 'all' ? ' · Socket ' + socketFilter : '' }}
          <span class="evh-live" *ngIf="chargingNow"><span class="evh-live-dot"></span>Charging now</span>
        </div>
        <div class="evh-chartsub">kW · sampled at the charger sync interval</div>
        
        <div class="evh-loading-box" *ngIf="loadingPower">
          <div class="evh-spinner"></div>
          <span>Loading power samples…</span>
        </div>

        <div class="evh-chartbox" #lineBox *ngIf="!loadingPower && linePath">
          <svg #lineSvg viewBox="0 0 708 220" role="img"
               aria-label="Line chart of charging power over the last 24 hours">
            <ng-container *ngFor="let g of lineGrid">
              <svg:line [attr.x1]="30" [attr.x2]="702" [attr.y1]="g.y" [attr.y2]="g.y"
                    class="evh-gridline" [class.baseline]="g.baseline"></svg:line>
              <svg:text *ngIf="g.label" [attr.x]="24" [attr.y]="g.y + 4"
                    text-anchor="end" class="evh-axis">{{ g.label }}</svg:text>
            </ng-container>
            <svg:text *ngFor="let x of lineXLabels" [attr.x]="x.x" [attr.y]="212"
                  [attr.text-anchor]="x.anchor" class="evh-axis">{{ x.text }}</svg:text>
            <svg:path *ngIf="areaPath" [attr.d]="areaPath" class="evh-area"></svg:path>
            <svg:path *ngIf="linePath" [attr.d]="linePath" class="evh-line"></svg:path>
            <svg:circle *ngIf="lineEnd" [attr.cx]="lineEnd.x" [attr.cy]="lineEnd.y" r="4" class="evh-dot"></svg:circle>
            <svg:line *ngIf="lineCross.show" [attr.x1]="lineCross.x" [attr.x2]="lineCross.x"
                  [attr.y1]="14" [attr.y2]="194" class="evh-cross"></svg:line>
            <svg:circle *ngIf="lineCross.show" [attr.cx]="lineCross.x" [attr.cy]="lineCross.dotY"
                    r="4.5" class="evh-dot"></svg:circle>
            <svg:rect [attr.x]="30" [attr.y]="14" [attr.width]="672" [attr.height]="180"
                  class="evh-hit"
                  (mousemove)="onLineMove($event)" (mouseleave)="hideLineTip()"></svg:rect>
          </svg>
          <div class="evh-tip" *ngIf="lineTip.show"
               [style.left.px]="lineTip.x" [style.top.px]="lineTip.y">
            {{ lineTip.l1 }}<br><b>{{ lineTip.l2 }}</b>
          </div>
        </div>
        <div class="evh-empty" *ngIf="!loadingPower && !linePath">
          No power samples in the {{ powerRangeLabel }}.
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* MatDialog container overrides */
    .rev-evh-dialog .mat-mdc-dialog-container,
    .rev-evh-dialog .mat-dialog-container {
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 16px !important;
    }
    .rev-evh-dialog .mat-mdc-dialog-surface,
    .rev-evh-dialog .mat-dialog-surface {
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 16px !important;
    }

    /* ── Design tokens (spec) — modal renders in the overlay, outside the
       dashboard container, so it carries its own token set ── */
    .rev-evh-modal {
      --page: #f9f9f7;
      --surface: #fcfcfb;
      --track: #efeee8;
      --ink: #0b0b0b;
      --ink-2: #52514e;
      --muted: #898781;
      --grid: #e1e0d9;
      --baseline: #c3c2b7;
      --border: rgba(11,11,11,0.10);
      --accent: #2a78d6;
      --accent-wash: rgba(42,120,214,0.08);
      --good: #0ca30c;
      --good-text: #006300;
      --critical: #d03b3b;
      --critical-wash: rgba(208,59,59,0.07);
      --shadow: 0 1px 2px rgba(11,11,11,0.05), 0 4px 16px rgba(11,11,11,0.06);
    }
    @media (prefers-color-scheme: dark) {
      .rev-evh-modal {
        --surface: #1a1a19;
        --track: #232322;
        --ink: #ffffff;
        --ink-2: #c3c2b7;
        --grid: #2c2c2a;
        --baseline: #383835;
        --border: rgba(255,255,255,0.10);
        --accent: #3987e5;
        --accent-wash: rgba(57,135,229,0.12);
        --good-text: #0ca30c;
        --critical-wash: rgba(208,59,59,0.14);
        --shadow: 0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.35);
      }
    }
    [data-mode="dark"] .rev-evh-modal {
      --surface: #1a1a19;
      --track: #232322;
      --ink: #ffffff;
      --ink-2: #c3c2b7;
      --grid: #2c2c2a;
      --baseline: #383835;
      --border: rgba(255,255,255,0.10);
      --accent: #3987e5;
      --accent-wash: rgba(57,135,229,0.12);
      --good-text: #0ca30c;
      --critical-wash: rgba(208,59,59,0.14);
      --shadow: 0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.35);
    }
    [data-mode="light"] .rev-evh-modal {
      --surface: #fcfcfb;
      --track: #efeee8;
      --ink: #0b0b0b;
      --ink-2: #52514e;
      --grid: #e1e0d9;
      --baseline: #c3c2b7;
      --border: rgba(11,11,11,0.10);
      --accent: #2a78d6;
      --accent-wash: rgba(42,120,214,0.08);
      --good-text: #006300;
      --critical-wash: rgba(208,59,59,0.07);
      --shadow: 0 1px 2px rgba(11,11,11,0.05), 0 4px 16px rgba(11,11,11,0.06);
    }

    .rev-evh-modal {
      width: min(760px, 92vw);
      max-height: 92vh;
      overflow-y: auto;
      box-sizing: border-box;
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow);
      padding: 22px 26px 26px;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 15px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    .rev-evh-modal * { box-sizing: border-box; }

    .rev-evh-modal .evh-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; margin-bottom: 4px;
    }
    .rev-evh-modal .evh-title { font-size: 18px; font-weight: 700; }
    .rev-evh-modal .evh-sub { font-size: 12.5px; color: var(--muted); }
    .rev-evh-modal .evh-close {
      font: inherit; font-size: 20px; line-height: 1; border: none; background: none;
      color: var(--muted); cursor: pointer; padding: 4px 8px; border-radius: 6px;
    }
    .rev-evh-modal .evh-close:hover { color: var(--ink); background: var(--accent-wash); }
    .rev-evh-modal .evh-close:focus-visible,
    .rev-evh-modal .evh-tab:focus-visible,
    .rev-evh-modal .evh-range:focus-visible {
      outline: 2px solid var(--accent); outline-offset: 2px;
    }

    .rev-evh-modal .evh-controls {
      display: flex; align-items: center; gap: 12px;
      flex-wrap: wrap; margin: 14px 0 18px;
    }
    /* Filter row sits full-width under the tabs: sockets pinned left, date range pinned right.
       position:relative anchors the custom-range dropdown. */
    .rev-evh-modal .evh-filters {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap; flex: 1 1 100%; min-height: 34px; position: relative;
    }
    .rev-evh-modal .evh-tabs, .rev-evh-modal .evh-ranges {
      display: inline-flex; gap: 2px; padding: 3px;
      background: var(--track); border: 1px solid var(--grid); border-radius: 10px;
      max-width: 100%; overflow-x: auto; scrollbar-width: none;
    }
    .rev-evh-modal .evh-tabs::-webkit-scrollbar,
    .rev-evh-modal .evh-ranges::-webkit-scrollbar { display: none; }
    .rev-evh-modal .evh-tab, .rev-evh-modal .evh-range {
      font: inherit; font-size: 13px; padding: 5px 12px; border-radius: 7px;
      border: 1px solid transparent; background: none; color: var(--ink-2); cursor: pointer;
      white-space: nowrap; transition: background .15s ease, color .15s ease;
    }
    .rev-evh-modal .evh-tab:hover, .rev-evh-modal .evh-range:hover {
      background: var(--accent-wash); color: var(--ink);
    }
    .rev-evh-modal .evh-tab[aria-selected="true"] {
      background: var(--ink); color: var(--surface); font-weight: 600;
    }
    .rev-evh-modal .evh-range[aria-pressed="true"] {
      background: var(--surface); color: var(--ink); font-weight: 600;
      box-shadow: 0 1px 2px rgba(11,11,11,0.10);
    }

    /* ── Custom range: dropdown popover anchored under the range buttons ── */
    .rev-evh-modal .evh-custom-pop {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 40;
    }
    .rev-evh-modal .evh-custom-card {
      position: relative; width: 264px; max-width: min(264px, 84vw);
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.14);
    }
    /* Caret pointing up to the Custom button */
    .rev-evh-modal .evh-custom-card::before {
      content: ''; position: absolute; top: -6px; right: 26px; width: 11px; height: 11px;
      background: var(--surface); border-left: 1px solid var(--border); border-top: 1px solid var(--border);
      transform: rotate(45deg);
    }
    .rev-evh-modal .evh-custom-title {
      font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 12px;
    }
    .rev-evh-modal .evh-date-row { margin-bottom: 12px; }
    .rev-evh-modal .evh-date-lbl {
      display: block; font-size: 12px; color: var(--ink-2); font-weight: 600; margin-bottom: 5px;
    }
    .rev-evh-modal .evh-date-inputs { display: flex; align-items: center; gap: 8px; }
    .rev-evh-modal .evh-native {
      font-family: inherit; font-size: 13.5px; padding: 7px 10px; border-radius: 9px;
      border: 1px solid var(--grid); background: var(--track); color: var(--ink);
      font-variant-numeric: tabular-nums; color-scheme: light dark;
    }
    .rev-evh-modal .evh-native-date { flex: 1 1 auto; min-width: 0; }
    .rev-evh-modal .evh-time-24 { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
    .rev-evh-modal .evh-time-sep { color: var(--ink-2); font-weight: 700; line-height: 1; }
    .rev-evh-modal .evh-native-hhmm {
      width: 44px; text-align: center; padding: 7px 4px;
      -moz-appearance: textfield;
    }
    .rev-evh-modal .evh-native-hhmm::-webkit-inner-spin-button,
    .rev-evh-modal .evh-native-hhmm::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .rev-evh-modal .evh-native:focus {
      outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent);
    }
    .rev-evh-modal .evh-native::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
    .rev-evh-modal .evh-native:hover::-webkit-calendar-picker-indicator { opacity: 1; }
    .rev-evh-modal .evh-apply-full { width: 100%; justify-content: center; margin-top: 4px; padding: 9px 14px; font-size: 14px; }

    .rev-evh-modal .evh-apply-btn {
      display: flex; align-items: center; gap: 6px; font: inherit; font-size: 13px; font-weight: 600;
      padding: 5px 14px; border-radius: 8px; border: none; background: var(--accent); color: #ffffff;
      cursor: pointer; transition: opacity 0.2s ease, background 0.2s ease;
    }
    .rev-evh-modal .evh-apply-btn:hover:not(:disabled) { opacity: 0.9; }
    .rev-evh-modal .evh-apply-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .rev-evh-modal .evh-apply-btn .evh-spinner-sm {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff; border-radius: 50%; animation: evhSpin 0.8s linear infinite;
    }

    .rev-evh-modal .evh-loading-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 54px 0; gap: 14px; color: var(--muted); font-size: 13.5px; font-weight: 500;
    }
    .rev-evh-modal .evh-loading-box .evh-spinner {
      width: 32px; height: 32px; border: 3px solid var(--grid);
      border-top-color: var(--accent); border-radius: 50%;
      animation: evhSpin 0.8s linear infinite;
    }
    @keyframes evhSpin { to { transform: rotate(360deg); } }

    .rev-evh-modal .evh-kpis {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px;
    }
    /* Tablet: keep 4 KPIs but tighten spacing so the filter row fits one line */
    @media (max-width: 760px) {
      .rev-evh-modal { padding: 20px 20px 22px; }
      .rev-evh-modal .evh-tab, .rev-evh-modal .evh-range { padding: 5px 10px; }
    }
    /* Mobile: stack controls, 2-up KPIs, shorter reserved chart height */
    @media (max-width: 620px) {
      .rev-evh-modal { padding: 16px 14px 18px; font-size: 14px; }
      .rev-evh-modal .evh-kpis { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .rev-evh-modal .evh-filters {
        flex-direction: column; align-items: stretch; gap: 8px;
      }
      .rev-evh-modal .evh-tabs, .rev-evh-modal .evh-ranges { justify-content: flex-start; }
      .rev-evh-modal .evh-tabpanel { min-height: 240px; }
      /* Custom dropdown spans the row on mobile instead of a narrow right-aligned card */
      .rev-evh-modal .evh-custom-pop { left: 0; right: 0; }
      .rev-evh-modal .evh-custom-card { width: 100%; max-width: 100%; }
      .rev-evh-modal .evh-custom-card::before { right: 50%; }
      .rev-evh-modal .evh-kpi-val { font-size: 17px; }
    }
    .rev-evh-modal .evh-kpi { border: 1px solid var(--grid); border-radius: 10px; padding: 10px 14px; }
    .rev-evh-modal .evh-kpi-lbl {
      font-size: 9.5px; letter-spacing: 0.09em; text-transform: uppercase;
      color: var(--muted); font-weight: 600;
    }
    .rev-evh-modal .evh-kpi-val {
      font-size: 19px; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .rev-evh-modal .evh-kpi-val small { font-size: 11px; font-weight: 600; color: var(--ink-2); }

    /* Reserve a constant height for the tab body so switching Energy / Sessions /
       Power (or hitting an empty/loading state) never resizes the modal. */
    .rev-evh-modal .evh-tabpanel { min-height: 340px; }
    .rev-evh-modal .evh-charttitle { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .rev-evh-modal .evh-live {
      display: inline-flex; align-items: center; gap: 5px; margin-left: 8px;
      font-size: 11px; font-weight: 600; color: var(--good-text);
      padding: 1px 8px; border-radius: 999px;
      background: rgba(12,163,12,0.10); border: 1px solid rgba(12,163,12,0.25);
      vertical-align: middle;
    }
    .rev-evh-modal .evh-live-dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--good);
      animation: evhLivePulse 1.6s ease-in-out infinite;
    }
    @keyframes evhLivePulse { 50% { opacity: 0.3; } }
    @media (prefers-reduced-motion: reduce) { .rev-evh-modal .evh-live-dot { animation: none; } }
    .rev-evh-modal .evh-chartsub { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
    .rev-evh-modal .evh-chartbox { position: relative; }
    .rev-evh-modal .evh-chartbox svg { display: block; width: 100%; height: auto; }
    .rev-evh-modal .evh-footnote { font-size: 12px; color: var(--muted); margin-top: 10px; }
    .rev-evh-modal .evh-empty {
      font-size: 13px; color: var(--muted); padding: 24px 0; text-align: center;
    }

    /* SVG marks — colors come from tokens so theme flips need no re-render */
    .rev-evh-modal .evh-gridline { stroke: var(--grid); stroke-width: 1; }
    .rev-evh-modal .evh-gridline.baseline { stroke: var(--baseline); }
    .rev-evh-modal .evh-axis { font-size: 10.5px; fill: var(--muted); }
    .rev-evh-modal .evh-bar { fill: var(--accent); }
    .rev-evh-modal .evh-peak { font-size: 11px; font-weight: 700; fill: var(--ink); }
    .rev-evh-modal .evh-line {
      fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round;
    }
    .rev-evh-modal .evh-area { fill: var(--accent); opacity: 0.08; }
    .rev-evh-modal .evh-dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2; }
    .rev-evh-modal .evh-cross { stroke: var(--baseline); stroke-width: 1; stroke-dasharray: 3 3; }
    .rev-evh-modal .evh-hit { fill: transparent; }

    .rev-evh-modal .evh-tip {
      position: absolute; pointer-events: none; z-index: 10;
      background: var(--ink); color: var(--surface);
      font-size: 12px; line-height: 1.45; padding: 7px 10px; border-radius: 7px;
      white-space: nowrap; transform: translate(-50%, calc(-100% - 10px));
    }
    .rev-evh-modal .evh-tip b { font-variant-numeric: tabular-nums; }

    .rev-evh-modal .evh-tablewrap {
      overflow-x: auto; max-height: 300px; overflow-y: auto;
      border: 1px solid var(--grid); border-radius: 10px;
    }
    .rev-evh-modal table.evh-sess { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .rev-evh-modal table.evh-sess th {
      text-align: left; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--muted); font-weight: 600; padding: 8px 10px;
      border-bottom: 1px solid var(--baseline);
      position: sticky; top: 0; background: var(--surface);
    }
    .rev-evh-modal table.evh-sess td {
      padding: 8px 10px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums;
    }
    .rev-evh-modal table.evh-sess th.r, .rev-evh-modal table.evh-sess td.r { text-align: right; }
    .rev-evh-modal table.evh-sess td.mono {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12.5px; color: var(--ink-2);
    }
  `],
})
export class EvStationHistoryModalComponent implements OnInit {

  readonly tabDefs = [
    { id: 'energy' as const, label: 'Energy' },
    { id: 'sessions' as const, label: 'Sessions' },
    { id: 'power' as const, label: 'Power' },
  ];
  readonly rangeOptions = [1, 7, 30, 90];
  readonly socketOptions: { id: SocketFilter, label: string }[] = [
    { id: 'all', label: 'All Sockets' },
    { id: 'A', label: 'Socket A' },
    { id: 'B', label: 'Socket B' },
  ];
  readonly emptyTip: TipState = EMPTY_TIP;

  tab: 'energy' | 'sessions' | 'power' = 'energy';
  rangeDays: number | 'custom' = 30;
  socketFilter: SocketFilter = 'all';

  // Custom range is stored as epoch ms; the native date/time inputs bind to these getters.
  private customStartTs = 0;
  private customEndTs = 0;

  get customStartDateIso(): string { return this.toDateIso(this.customStartTs); }
  get customStartTimeStr(): string { return this.toTimeStr(this.customStartTs); }
  get customStartHour(): number { return this.customStartTs ? new Date(this.customStartTs).getHours() : 0; }
  get customStartMinute(): number { return this.customStartTs ? new Date(this.customStartTs).getMinutes() : 0; }
  get customEndDateIso(): string { return this.toDateIso(this.customEndTs); }
  get customEndTimeStr(): string { return this.toTimeStr(this.customEndTs); }
  get customEndHour(): number { return this.customEndTs ? new Date(this.customEndTs).getHours() : 0; }
  get customEndMinute(): number { return this.customEndTs ? new Date(this.customEndTs).getMinutes() : 0; }

  /** Update the hour or minute part of the start/end time from the 24-h number inputs. */
  setCustomTimePart(which: 'start' | 'end', part: 'hour' | 'minute', rawValue: string): void {
    const current = which === 'start' ? this.customStartTs : this.customEndTs;
    const d = current ? new Date(current) : new Date();
    const v = Math.max(0, Math.min(part === 'hour' ? 23 : 59, parseInt(rawValue, 10) || 0));
    if (part === 'hour') d.setHours(v); else d.setMinutes(v);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    this.setCustomPart(which, 'time', timeStr);
  }

  loadingLogs = true;
  loadingPower = true;

  historyStartLabel: string | null = null;

  kpiEnergy = '—';
  kpiCount = '—';

  private loadedStartTs = 0;
  private loadedEndTs = 0;
  private logsSub?: any;
  kpiAvg = '—';
  kpiTime = '—';

  barGrid: GridLine[] = [];
  barSlots: BarSlot[] = [];
  barXLabels: XLabel[] = [];
  barPeak: { x: number; y: number; text: string } | null = null;
  barTip: TipState = EMPTY_TIP;

  lineGrid: GridLine[] = [];
  lineXLabels: XLabel[] = [];
  linePath = '';
  areaPath = '';
  lineEnd: { x: number; y: number } | null = null;
  lineCross = { show: false, x: 0, dotY: 0 };
  lineTip: TipState = EMPTY_TIP;

  tableRows: SessionRow[] = [];

  @ViewChild('barBox') barBox?: ElementRef<HTMLElement>;
  @ViewChild('barSvg') barSvg?: ElementRef<SVGSVGElement>;
  @ViewChild('lineBox') lineBox?: ElementRef<HTMLElement>;
  @ViewChild('lineSvg') lineSvg?: ElementRef<SVGSVGElement>;

  private latestTsMap: Record<string, { ts: number; value: any }[]> = {};
  private allRows: SessionRow[] = [];
  private linePts: { x: number; y: number; ts: number; kw: number }[] = [];

  // Power chart: samples for every socket over the selected window, fetched together
  // so switching A/B/all is instant. Refetched when the power range changes.
  private powerTsMap: Record<string, { ts: number; value: any }[]> = {};
  private powerNow = 0;
  private powerSpanMs = DAY_MS;
  private powerIsLive = true;
  private powerSub?: any;
  /** Power tab has its own range (24H default); it does not share the Energy/Sessions range. */
  powerRangeDays: number | 'custom' = 1;
  // Socket → per-connector power telemetry key, discovered from the device's key list.
  private socketPowerKey: { A?: string; B?: string } = {};

  constructor(
    public dialogRef: MatDialogRef<EvStationHistoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EvChargerHistoryModalData,
    private telemetry: ThingsBoardTelemetryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const entityId: EntityId = { id: this.data.deviceId, entityType: 'DEVICE' };
    const now = Date.now();

    this.customEndTs = now;
    this.customStartTs = now - 30 * DAY_MS;

    this.loadLogs(now - 90 * DAY_MS, now);

    // Discover per-connector power keys so the socket filter can drive the chart,
    // then load the default power window (last 24h).
    this.telemetry.getDeviceKeys(entityId).subscribe(deviceKeys => {
      this.resolveSocketPowerKeys(deviceKeys);
      console.info(`[EvHistory] ${this.data.deviceName}: power keys`,
        { all: 'total_active_kw', ...this.socketPowerKey });
      this.loadPower();
    });

    this.recompute();
  }

  close(): void {
    this.dialogRef.close();
  }

  setTab(tab: 'energy' | 'sessions' | 'power'): void {
    this.tab = tab;
    this.barTip = EMPTY_TIP;
    this.hideLineTip();
    this.recompute();               // KPIs follow the active tab's window
    if (tab === 'power') this.refreshPowerChart();
    this.cdr.detectChanges();
  }

  setPowerRange(days: number | 'custom'): void {
    if (this.powerRangeDays === days) return;
    this.powerRangeDays = days;
    this.hideLineTip();
    if (days === 'custom') {
      // Wait for Apply before fetching; just reveal the picker and refresh KPIs.
      this.recompute();
      this.cdr.detectChanges();
      return;
    }
    this.loadPower();
    this.recompute();               // keep KPIs in step with the power window
  }

  /** Whether the From/To picker is currently open (either tab in custom mode). */
  get showCustomPanel(): boolean {
    return this.tab === 'power' ? this.powerRangeDays === 'custom' : this.rangeDays === 'custom';
  }

  /** Human label for the current power window, used in the chart title and empty state. */
  get powerRangeLabel(): string {
    switch (this.powerRangeDays) {
      case 'custom': return this.customStartTs && this.customEndTs
        ? `${this.formatAxisDate(new Date(this.customStartTs))} → ${this.formatAxisDate(new Date(this.customEndTs))}`
        : 'custom range';
      case 1: return 'last 24 h';
      case 7: return 'last 7 days';
      case 30: return 'last 30 days';
      case 90: return 'last 90 days';
      default: return `last ${this.powerRangeDays} days`;
    }
  }

  /**
   * True when the selected socket is drawing power right now — i.e. its most recent
   * sample is fresh (< 15 min) and above ~0. The completed-session KPIs can't show an
   * in-progress charge (it isn't logged until it ends), so this drives a live badge.
   */
  get chargingNow(): boolean {
    const key = this.socketFilter === 'all'
      ? 'total_active_kw'
      : (this.socketFilter === 'A' ? this.socketPowerKey.A : this.socketPowerKey.B);
    if (!key) return false;
    const arr = this.powerTsMap[key];
    if (!arr || !arr.length) return false;
    const last = arr[arr.length - 1];
    return (Date.now() - last.ts) < 15 * 60_000 && Number(last.value) > 0.1;
  }

  setRange(r: number | 'custom'): void {
    this.rangeDays = r;
    this.barTip = EMPTY_TIP;
    
    if (r === 'custom') {
      this.recompute();
    } else {
      const now = Date.now();
      const neededStart = now - Math.max(90, r) * DAY_MS;
      // If we already have this time range in memory, switch instantly in 0ms without server requests!
      if (this.latestTsMap && Object.keys(this.latestTsMap).length > 0
          && this.loadedStartTs <= neededStart + 3600000 && this.loadedEndTs >= now - 3600000) {
        this.recompute();
        return;
      }
      this.loadLogs(neededStart, now);
    }
  }

  /** Update one part (date or time) of the start/end bound from the native inputs. */
  setCustomPart(which: 'start' | 'end', part: 'date' | 'time', value: string): void {
    const current = which === 'start' ? this.customStartTs : this.customEndTs;
    const dateIso = part === 'date' ? value : this.toDateIso(current);
    const timeStr = part === 'time' ? value : this.toTimeStr(current);
    const ts = this.combineDateTime(dateIso, timeStr);
    if (ts === null) return;
    if (which === 'start') this.customStartTs = ts;
    else this.customEndTs = ts;
  }

  applyCustomRange(): void {
    if (!this.customStartTs || !this.customEndTs || this.customStartTs >= this.customEndTs) return;
    // Logs feed the KPIs (and the Energy/Sessions views); the power chart needs its own fetch.
    this.loadLogs(this.customStartTs, this.customEndTs);
    if (this.tab === 'power') this.loadPower();
  }

  private toDateIso(ts: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  private toTimeStr(ts: number): string {
    if (!ts) return '00:00';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  private combineDateTime(dateIso: string, timeStr: string): number | null {
    if (!dateIso) return null;
    const [y, m, day] = dateIso.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    const d = new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }


  private loadLogs(startTs: number, endTs: number): void {
    if (this.logsSub) {
      this.logsSub.unsubscribe();
    }
    const entityId: EntityId = { id: this.data.deviceId, entityType: 'DEVICE' };
    this.loadingLogs = true;
    this.logsSub = this.telemetry
      .getTimeseries(entityId, [...EV_CHARGER_LOG_KEYS], startTs, endTs, 0)
      .subscribe(tsMap => {
        this.latestTsMap = tsMap;
        this.loadedStartTs = startTs;
        this.loadedEndTs = endTs;
        this.allRows = this.buildRows(tsMap, this.socketFilter);
        console.info(`[EvHistory] ${this.data.deviceName} (${this.data.deviceId}): `
          + `${this.allRows.length} charge log entries in selected range`, Object.keys(tsMap));
        if (this.allRows.length && this.rangeDays !== 'custom') {
          this.historyStartLabel = this.allRows[0].date.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          });
        }
        this.loadingLogs = false;
        this.recompute();
        this.cdr.detectChanges();
      });
  }

  setSocketFilter(filter: SocketFilter): void {
    this.socketFilter = filter;
    this.barTip = EMPTY_TIP;
    this.hideLineTip();
    this.allRows = this.buildRows(this.latestTsMap, filter);
    this.refreshPowerChart();
    this.recompute();
  }

  // ─── Data shaping ───────────────────────────────────────────────────────────

  /** One charge log entry = one row; the sync writes all charge_log_* keys at the same ts. */
  private buildRows(tsMap: Record<string, { ts: number; value: any }[]>, filter: SocketFilter): SessionRow[] {
    const byTs = new Map<number, SessionRow>();
    const row = (ts: number): SessionRow => {
      let r = byTs.get(ts);
      if (!r) {
        r = { ts, date: new Date(ts), user: '—', min: null, kwh: 0 };
        byTs.set(ts, r);
      }
      return r;
    };

    const prefix = filter === 'all' ? 'charge_log_' : `charge_log_${filter.toLowerCase()}_`;
    const kwhKey = `${prefix}kwh`;
    const userKey = `${prefix}username`;
    const minKey = `${prefix}duration_min`;

    for (const p of tsMap[kwhKey] || []) {
      const v = Number(p.value);
      if (!isNaN(v)) row(p.ts).kwh = v;
    }
    for (const p of tsMap[userKey] || []) {
      if (p.value !== undefined && p.value !== null && String(p.value).length > 0) {
        row(p.ts).user = String(p.value);
      }
    }
    for (const p of tsMap[minKey] || []) {
      const v = Number(p.value);
      if (!isNaN(v)) row(p.ts).min = v;
    }

    return [...byTs.values()].sort((a, b) => a.ts - b.ts);
  }

  /**
   * Window that drives the KPIs (and, on Energy, the bar chart). On the Power tab the
   * KPIs follow the power window so the numbers line up with the chart instead of
   * silently reporting a different (30-day) range.
   */
  private effectiveRange(): { start: Date; endTs: number } {
    const now = Date.now();

    if (this.tab === 'power') {
      if (this.powerRangeDays === 'custom') {
        return { start: new Date(this.customStartTs), endTs: this.customEndTs };
      }
      let start = new Date(now - this.powerRangeDays * DAY_MS);
      if (this.allRows.length && start < this.allRows[0].date) start = this.allRows[0].date;
      return { start, endTs: now };
    }

    if (this.rangeDays === 'custom') {
      return { start: new Date(this.customStartTs), endTs: this.customEndTs };
    }

    const start = this.startOfDay(new Date());
    start.setDate(start.getDate() - (this.rangeDays - 1));
    // History depth is finite — clamp instead of pretending the range is full
    if (this.allRows.length) {
      const first = this.startOfDay(this.allRows[0].date);
      if (start < first) return { start: first, endTs: now };
    }
    return { start, endTs: now };
  }

  private recompute(): void {
    const { start, endTs } = this.effectiveRange();
    const rows = this.allRows.filter(r => r.ts >= start.getTime() && r.ts <= endTs);

    const kwh = rows.reduce((a, r) => a + r.kwh, 0);
    const min = rows.reduce((a, r) => a + (r.min || 0), 0);
    this.kpiEnergy = kwh.toFixed(1);
    this.kpiCount = String(rows.length);
    this.kpiAvg = rows.length ? (kwh / rows.length).toFixed(1) : '0.0';
    this.kpiTime = min > 0 ? this.formatDuration(min) : '0 min';

    this.tableRows = [...rows].sort((a, b) => b.ts - a.ts);
    this.buildBarChart(start, rows);
    this.cdr.detectChanges();
  }

  // ─── Energy bar chart ───────────────────────────────────────────────────────

  private buildBarChart(start: Date, rows: SessionRow[]): void {
    const end = this.rangeDays === 'custom' ? this.startOfDay(new Date(this.customEndTs)) : this.startOfDay(new Date());
    const slots: { date: Date; kwh: number; count: number }[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      slots.push({ date: new Date(d), kwh: 0, count: 0 });
    }
    const byKey = new Map<string, { date: Date; kwh: number; count: number }>();
    for (const s of slots) byKey.set(this.dayKey(s.date), s);
    for (const r of rows) {
      const slot = byKey.get(this.dayKey(r.date));
      if (slot) { slot.kwh += r.kwh; slot.count += 1; }
    }

    const maxKwh = slots.reduce((a, s) => Math.max(a, s.kwh), 0);
    const maxV = Math.max(20, Math.ceil(maxKwh / 20) * 20);
    const y = (v: number) => B_PAD_T + B_PLOT_H * (1 - v / maxV);

    this.barGrid = [];
    for (let g = 0; g <= maxV; g += 20) {
      this.barGrid.push({ y: y(g), baseline: g === 0, label: g > 0 ? String(g) : undefined });
    }

    const slotW = B_PLOT_W / Math.max(1, slots.length);
    const barW = Math.max(4, slotW - 2);
    const labelStep = slots.length <= 7 ? 1 : 7;

    this.barSlots = slots.map((s, i) => {
      const x = B_PAD_L + i * slotW + (slotW - barW) / 2;
      const h = B_PLOT_H * (s.kwh / maxV);
      return {
        path: s.kwh > 0 ? this.roundedTopBar(x, y(s.kwh), barW, h, 4) : '',
        cx: B_PAD_L + i * slotW + slotW / 2,
        tipY: y(Math.max(s.kwh, maxV * 0.06)),
        hitX: B_PAD_L + i * slotW,
        hitW: slotW,
        date: s.date,
        kwh: s.kwh,
        count: s.count,
      };
    });

    this.barXLabels = slots
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => i % labelStep === 0)
      .map(({ s, i }) => ({
        x: B_PAD_L + i * slotW + slotW / 2,
        text: this.formatDay(s.date),
        anchor: 'middle',
      }));

    // Selective direct label: peak day only
    let peakIdx = -1;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].kwh > 0 && (peakIdx === -1 || slots[i].kwh > slots[peakIdx].kwh)) peakIdx = i;
    }
    this.barPeak = peakIdx >= 0
      ? {
        x: B_PAD_L + peakIdx * slotW + slotW / 2,
        y: y(slots[peakIdx].kwh) - 6,
        text: slots[peakIdx].kwh.toFixed(1),
      }
      : null;
  }

  onBarMove(index: number): void {
    const slot = this.barSlots[index];
    if (!slot || !this.barBox || !this.barSvg) return;
    const svgRect = this.barSvg.nativeElement.getBoundingClientRect();
    const boxRect = this.barBox.nativeElement.getBoundingClientRect();
    const scale = svgRect.width / BW;
    this.barTip = {
      show: true,
      x: svgRect.left - boxRect.left + slot.cx * scale,
      y: svgRect.top - boxRect.top + slot.tipY * scale,
      l1: this.formatDay(slot.date),
      l2: `${slot.kwh.toFixed(2)} kWh`,
      l2suffix: slot.count
        ? ` · ${slot.count} session${slot.count > 1 ? 's' : ''}`
        : ' · no charging',
    };
  }

  // ─── Power line chart ───────────────────────────────────────────────────────

  /**
   * Map Socket A / B to their per-connector power telemetry key.
   * Mirrors the live card's socket ordering: connectors sorted ascending, the lowest
   * number is Socket A. Prefers connector_N_session_kw, falls back to connector_N_power.
   */
  private resolveSocketPowerKeys(deviceKeys: string[]): void {
    const kw = new Map<number, string>();
    const pw = new Map<number, string>();
    for (const k of deviceKeys) {
      const key = k.toLowerCase();
      let m = key.match(/^connector_(\d+)_session_kw$/);
      if (m) { kw.set(Number(m[1]), key); continue; }
      m = key.match(/^connector_(\d+)_power$/);
      if (m) pw.set(Number(m[1]), key);
    }
    const source = kw.size ? kw : pw;
    const nums = [...source.keys()].sort((a, b) => a - b);
    this.socketPowerKey = {};
    if (nums.length > 0) this.socketPowerKey.A = source.get(nums[0]);
    if (nums.length > 1) this.socketPowerKey.B = source.get(nums[1]);
  }

  /** Rebuild the power line from the already-fetched samples for the selected socket. */
  private refreshPowerChart(): void {
    let pts: { ts: number; value: any }[];
    if (this.socketFilter === 'all') {
      pts = this.powerTsMap['total_active_kw'] || [];
    } else {
      const key = this.socketFilter === 'A' ? this.socketPowerKey.A : this.socketPowerKey.B;
      pts = key ? (this.powerTsMap[key] || []) : [];
    }
    this.buildLineChart(pts, this.powerNow || Date.now(), this.powerSpanMs);
  }

  /** Fetch total + per-socket power over the selected power range (aggregated for long windows). */
  private loadPower(): void {
    const entityId: EntityId = { id: this.data.deviceId, entityType: 'DEVICE' };
    let startTs: number;
    let endTs: number;
    if (this.powerRangeDays === 'custom') {
      startTs = this.customStartTs;
      endTs = this.customEndTs;
    } else {
      endTs = Date.now();
      startTs = endTs - this.powerRangeDays * DAY_MS;
    }
    const spanMs = Math.max(1, endTs - startTs);
    const { interval, agg } = this.powerAgg(spanMs);

    const keys = ['total_active_kw'];
    if (this.socketPowerKey.A) keys.push(this.socketPowerKey.A);
    if (this.socketPowerKey.B) keys.push(this.socketPowerKey.B);

    this.loadingPower = true;
    if (this.powerSub) this.powerSub.unsubscribe();
    this.powerSub = this.telemetry
      .getTimeseries(entityId, keys, startTs, endTs, interval, 50_000, agg)
      .subscribe(tsMap => {
        this.loadingPower = false;
        this.powerTsMap = tsMap;
        this.powerNow = endTs;
        this.powerSpanMs = spanMs;
        this.powerIsLive = (Date.now() - endTs) < 2 * 60_000;
        this.refreshPowerChart();
        this.cdr.detectChanges();
      });
  }

  /** 24h → raw points; longer ranges → ~400 AVG buckets so the request stays light. */
  private powerAgg(spanMs: number): { interval: number; agg: 'NONE' | 'AVG' } {
    if (spanMs <= DAY_MS) return { interval: 0, agg: 'NONE' };
    const interval = Math.max(60_000, Math.round(spanMs / 400 / 60_000) * 60_000);
    return { interval, agg: 'AVG' };
  }

  private buildLineChart(points: { ts: number; value: any }[], now: number, spanMs: number): void {
    const t0 = now - spanMs;
    const multiDay = spanMs > DAY_MS;
    const pts = points
      .map(p => ({ ts: p.ts, kw: Number(p.value) }))
      .filter(p => !isNaN(p.kw) && p.ts >= t0)
      .sort((a, b) => a.ts - b.ts);

    if (pts.length < 2) {
      this.linePath = '';
      this.areaPath = '';
      this.lineEnd = null;
      this.lineGrid = [];
      this.lineXLabels = [];
      this.linePts = [];
      return;
    }

    const maxKw = pts.reduce((a, p) => Math.max(a, p.kw), 0);
    const maxV = Math.max(12, Math.ceil(maxKw / 4) * 4);
    const x = (ts: number) => L_PAD_L + L_PLOT_W * ((ts - t0) / spanMs);
    const y = (v: number) => L_PAD_T + L_PLOT_H * (1 - v / maxV);

    this.lineGrid = [];
    for (let g = 0; g <= maxV; g += 4) {
      this.lineGrid.push({ y: y(g), baseline: g === 0, label: g > 0 ? String(g) : undefined });
    }

    const edgeLabel = (ts: number) => multiDay ? this.formatAxisDate(new Date(ts)) : this.formatClock(new Date(ts));
    this.lineXLabels = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const ts = t0 + f * spanMs;
      return {
        x: L_PAD_L + L_PLOT_W * f,
        // Right edge reads "now" only for the live window; a past custom range shows its end.
        text: f === 1 ? (this.powerIsLive ? 'now' : edgeLabel(ts)) : edgeLabel(ts),
        anchor: f === 1 ? 'end' : (f === 0 ? 'start' : 'middle'),
      };
    });

    this.linePts = pts.map(p => ({ x: x(p.ts), y: y(p.kw), ts: p.ts, kw: p.kw }));
    this.linePath = this.linePts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join('');
    const first = this.linePts[0];
    const last = this.linePts[this.linePts.length - 1];
    this.areaPath = `M${first.x.toFixed(1)} ${y(0).toFixed(1)}`
      + this.linePts.map(p => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
      + `L${last.x.toFixed(1)} ${y(0).toFixed(1)}Z`;
    this.lineEnd = { x: last.x, y: last.y };
  }

  onLineMove(event: MouseEvent): void {
    if (!this.linePts.length || !this.lineBox || !this.lineSvg) return;
    const svgRect = this.lineSvg.nativeElement.getBoundingClientRect();
    const boxRect = this.lineBox.nativeElement.getBoundingClientRect();
    const scale = svgRect.width / LW;
    const mx = (event.clientX - svgRect.left) / scale;

    let nearest = this.linePts[0];
    for (const p of this.linePts) {
      if (Math.abs(p.x - mx) < Math.abs(nearest.x - mx)) nearest = p;
    }

    this.lineCross = { show: true, x: nearest.x, dotY: nearest.y };
    const minsAgo = Math.round((Date.now() - nearest.ts) / 60000);
    const hoursAgo = minsAgo / 60;
    // Multi-day or a past custom window: relative "X h ago" is unreadable, so show the date/time.
    const l1 = (this.powerSpanMs > DAY_MS || !this.powerIsLive)
      ? this.formatTipDateTime(new Date(nearest.ts))
      : (minsAgo < 5 ? 'now' : (hoursAgo >= 1
        ? `${hoursAgo.toFixed(1).replace('.0', '')} h ago`
        : `${minsAgo} min ago`));
    this.lineTip = {
      show: true,
      x: svgRect.left - boxRect.left + nearest.x * scale,
      y: svgRect.top - boxRect.top + nearest.y * scale,
      l1,
      l2: `${nearest.kw.toFixed(1)} kW`,
      l2suffix: '',
    };
  }

  hideLineTip(): void {
    this.lineTip = EMPTY_TIP;
    this.lineCross = { show: false, x: 0, dotY: 0 };
  }

  // ─── Formatting helpers ─────────────────────────────────────────────────────

  formatDuration(min: number): string {
    const total = Math.round(min);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h} h ${m.toString().padStart(2, '0')} m` : `${m} min`;
  }

  formatRowDate(d: Date): string {
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    return `${dd}-${mm}-${yy}, `
      + `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  private formatDay(d: Date): string {
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    return `${dd}-${mm}-${yy}`;
  }

  private formatClock(d: Date): string {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  /** Short axis date for multi-day power windows, e.g. "9 Jun". */
  private formatAxisDate(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /** Tooltip date + time for multi-day power windows, e.g. "9 Jun, 14:04". */
  private formatTipDateTime(d: Date): string {
    return `${this.formatAxisDate(d)}, ${this.formatClock(d)}`;
  }

  private startOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  /** Local date parts — toISOString() is UTC and can shift the day */
  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y}`
      + ` H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
  }
}
