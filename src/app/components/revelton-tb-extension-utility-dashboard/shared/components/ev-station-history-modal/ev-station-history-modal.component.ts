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
        <div class="evh-controls-right">
          <div class="evh-ranges" role="group" aria-label="Socket selection" *ngIf="tab !== 'power'">
            <button class="evh-range" type="button"
                    *ngFor="let s of socketOptions"
                    [attr.aria-pressed]="socketFilter === s.id"
                    (click)="setSocketFilter(s.id)">{{ s.label }}</button>
          </div>
          <div class="evh-ranges" role="group" aria-label="Date range">
            <button class="evh-range" type="button"
                    *ngFor="let r of rangeOptions"
                    [attr.aria-pressed]="rangeDays === r"
                    (click)="setRange(r)">{{ r }}D</button>
            <button class="evh-range" type="button"
                    [attr.aria-pressed]="rangeDays === 'custom'"
                    (click)="setRange('custom')">Custom</button>
          </div>
        </div>
        <div class="evh-custom-dates" *ngIf="rangeDays === 'custom'">
          <label class="evh-date-wrap">
            From
            <input type="text" placeholder="DD-MM-YY" [value]="customStartStr"
                   (input)="onCustomDateChange('start', $any($event.target).value)"
                   (change)="onCustomDateChange('start', $any($event.target).value)">
            <button type="button" class="evh-cal-btn" (click)="startPicker.showPicker()" title="Pick from calendar" aria-label="Pick from calendar">
              <mat-icon>calendar_today</mat-icon>
            </button>
            <input #startPicker type="date" class="evh-hidden-date" [value]="customStartIso"
                   (change)="onPickerChange('start', startPicker.value)">
          </label>
          <label class="evh-date-wrap">
            To
            <input type="text" placeholder="DD-MM-YY" [value]="customEndStr"
                   (input)="onCustomDateChange('end', $any($event.target).value)"
                   (change)="onCustomDateChange('end', $any($event.target).value)"
                   (keyup.enter)="applyCustomRange()">
            <button type="button" class="evh-cal-btn" (click)="endPicker.showPicker()" title="Pick from calendar" aria-label="Pick from calendar">
              <mat-icon>calendar_today</mat-icon>
            </button>
            <input #endPicker type="date" class="evh-hidden-date" [value]="customEndIso"
                   (change)="onPickerChange('end', endPicker.value)">
          </label>
          <button type="button" class="evh-apply-btn" (click)="applyCustomRange()" [disabled]="loadingLogs">
            <div *ngIf="loadingLogs" class="evh-spinner-sm"></div>
            <span>{{ loadingLogs ? 'Loading…' : 'Apply' }}</span>
          </button>
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
      <div *ngIf="tab === 'energy'">
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
      <div *ngIf="tab === 'sessions'">
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
      <div *ngIf="tab === 'power'">
        <div class="evh-charttitle">Charging power — last 24 h</div>
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
          No power samples in the last 24 h.
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
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap; margin: 14px 0 18px;
    }
    .rev-evh-modal .evh-controls-right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .rev-evh-modal .evh-tabs, .rev-evh-modal .evh-ranges { display: flex; gap: 4px; }
    .rev-evh-modal .evh-tab, .rev-evh-modal .evh-range {
      font: inherit; font-size: 13px; padding: 5px 12px; border-radius: 8px;
      border: 1px solid transparent; background: none; color: var(--ink-2); cursor: pointer;
    }
    .rev-evh-modal .evh-tab:hover, .rev-evh-modal .evh-range:hover { background: var(--accent-wash); }
    .rev-evh-modal .evh-tab[aria-selected="true"] {
      background: var(--ink); color: var(--surface); font-weight: 600;
    }
    .rev-evh-modal .evh-range[aria-pressed="true"] {
      border-color: var(--baseline); background: var(--surface); color: var(--ink); font-weight: 600;
    }

    .rev-evh-modal .evh-custom-dates {
      width: 100%; display: flex; gap: 16px; margin-top: 10px; justify-content: flex-end; flex-wrap: wrap;
    }
    .rev-evh-modal .evh-date-wrap {
      display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); position: relative;
    }
    .rev-evh-modal .evh-custom-dates input[type="text"] {
      font-family: inherit; font-size: 13px; padding: 4px 8px; border-radius: 6px; width: 88px; text-align: center;
      border: 1px solid var(--grid); background: var(--surface); color: var(--ink);
    }
    .rev-evh-modal .evh-custom-dates input[type="text"]:focus {
      outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent);
    }
    .rev-evh-modal .evh-cal-btn {
      display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;
      border: 1px solid var(--grid); border-radius: 6px; background: var(--surface); color: var(--muted); cursor: pointer; padding: 0;
    }
    .rev-evh-modal .evh-cal-btn:hover { color: var(--ink); background: var(--accent-wash); border-color: var(--baseline); }
    .rev-evh-modal .evh-cal-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .rev-evh-modal .evh-hidden-date {
      position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; border: none; padding: 0;
    }

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
    @media (max-width: 620px) {
      .rev-evh-modal .evh-kpis { grid-template-columns: repeat(2, 1fr); }
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

    .rev-evh-modal .evh-charttitle { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
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
      overflow-x: auto; max-height: 340px; overflow-y: auto;
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
  readonly rangeOptions = [7, 30, 90];
  readonly socketOptions: { id: SocketFilter, label: string }[] = [
    { id: 'all', label: 'All Sockets' },
    { id: 'A', label: 'Socket A' },
    { id: 'B', label: 'Socket B' },
  ];
  readonly emptyTip: TipState = EMPTY_TIP;

  tab: 'energy' | 'sessions' | 'power' = 'energy';
  rangeDays: number | 'custom' = 30;
  socketFilter: SocketFilter = 'all';

  customStartStr = '';
  customEndStr = '';
  private customStartTs = 0;
  private customEndTs = 0;

  get customStartIso(): string {
    if (!this.customStartTs) return '';
    const d = new Date(this.customStartTs);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  get customEndIso(): string {
    if (!this.customEndTs) return '';
    const d = new Date(this.customEndTs);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
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

  constructor(
    public dialogRef: MatDialogRef<EvStationHistoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EvChargerHistoryModalData,
    private telemetry: ThingsBoardTelemetryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const entityId: EntityId = { id: this.data.deviceId, entityType: 'DEVICE' };
    const now = Date.now();

    const dEnd = new Date(now);
    const dStart = new Date(now - 30 * DAY_MS);
    this.customEndStr = this.dateInputString(dEnd);
    this.customStartStr = this.dateInputString(dStart);
    this.customEndTs = now;
    this.customStartTs = now - 30 * DAY_MS;

    this.loadLogs(now - 90 * DAY_MS, now);

    this.telemetry
      .getTimeseries(entityId, ['total_active_kw'], now - DAY_MS, now, 0)
      .subscribe(tsMap => {
        this.loadingPower = false;
        const pts = tsMap['total_active_kw'] || [];
        console.info(`[EvHistory] ${this.data.deviceName}: ${pts.length} power samples in the last 24h`);
        this.buildLineChart(pts, now);
        this.cdr.detectChanges();
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
    this.cdr.detectChanges();
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

  onPickerChange(field: 'start' | 'end', isoValue: string): void {
    if (!isoValue) return;
    const parts = isoValue.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        if (field === 'start') {
          this.customStartTs = d.getTime();
          this.customStartStr = this.dateInputString(d);
        } else {
          d.setHours(23, 59, 59, 999);
          this.customEndTs = d.getTime();
          this.customEndStr = this.dateInputString(d);
        }
      }
    }
  }

  onCustomDateChange(field: 'start' | 'end', value: string): void {
    if (field === 'start') this.customStartStr = value;
    else this.customEndStr = value;

    const dStart = this.parseCustomDate(this.customStartStr);
    const dEnd = this.parseCustomDate(this.customEndStr);

    if (dStart && dEnd && !isNaN(dStart.getTime()) && !isNaN(dEnd.getTime())) {
      dEnd.setHours(23, 59, 59, 999);
      this.customStartTs = dStart.getTime();
      this.customEndTs = dEnd.getTime();
    }
  }

  applyCustomRange(): void {
    const dStart = this.parseCustomDate(this.customStartStr);
    const dEnd = this.parseCustomDate(this.customEndStr);

    if (dStart && dEnd && !isNaN(dStart.getTime()) && !isNaN(dEnd.getTime())) {
      dEnd.setHours(23, 59, 59, 999);
      this.customStartTs = dStart.getTime();
      this.customEndTs = dEnd.getTime();
      this.loadCustomRange();
    }
  }

  private parseCustomDate(str: string): Date | null {
    if (!str) return null;
    const parts = str.trim().split(/[-/.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) return d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  private loadCustomRange(): void {
    if (this.rangeDays !== 'custom') return;
    this.loadLogs(this.customStartTs, this.customEndTs);
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
    this.allRows = this.buildRows(this.latestTsMap, filter);
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

  private rangeStart(): Date {
    if (this.rangeDays === 'custom') {
      return new Date(this.customStartTs);
    }

    const start = this.startOfDay(new Date());
    start.setDate(start.getDate() - (this.rangeDays - 1));
    // History depth is finite — clamp instead of pretending the range is full
    if (this.allRows.length) {
      const first = this.startOfDay(this.allRows[0].date);
      if (start < first) return first;
    }
    return start;
  }

  private recompute(): void {
    const start = this.rangeStart();
    const endTs = this.rangeDays === 'custom' ? this.customEndTs : Date.now();
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

  private buildLineChart(points: { ts: number; value: any }[], now: number): void {
    const t0 = now - DAY_MS;
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
    const x = (ts: number) => L_PAD_L + L_PLOT_W * ((ts - t0) / DAY_MS);
    const y = (v: number) => L_PAD_T + L_PLOT_H * (1 - v / maxV);

    this.lineGrid = [];
    for (let g = 0; g <= maxV; g += 4) {
      this.lineGrid.push({ y: y(g), baseline: g === 0, label: g > 0 ? String(g) : undefined });
    }

    this.lineXLabels = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const ts = t0 + f * DAY_MS;
      return {
        x: L_PAD_L + L_PLOT_W * f,
        text: f === 1 ? 'now' : this.formatClock(new Date(ts)),
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
    this.lineTip = {
      show: true,
      x: svgRect.left - boxRect.left + nearest.x * scale,
      y: svgRect.top - boxRect.top + nearest.y * scale,
      l1: minsAgo < 5 ? 'now' : (hoursAgo >= 1
        ? `${hoursAgo.toFixed(1).replace('.0', '')} h ago`
        : `${minsAgo} min ago`),
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

  private startOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  /** Local date parts — toISOString() is UTC and can shift the day */
  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private dateInputString(d: Date): string {
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    return `${dd}-${mm}-${yy}`;
  }

  private roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y}`
      + ` H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
  }
}
