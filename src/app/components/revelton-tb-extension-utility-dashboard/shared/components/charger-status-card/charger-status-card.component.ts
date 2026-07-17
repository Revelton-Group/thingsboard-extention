import { ChangeDetectionStrategy, Component, Input, ViewContainerRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ChargerCardViewModel } from '../../../core/models';
import { EvStationHistoryModalComponent } from '../ev-station-history-modal/ev-station-history-modal.component';

@Component({
  selector: 'revelton-charger-status-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <button class="ev-card" type="button" (click)="openHistory()"
            aria-haspopup="dialog"
            [attr.aria-label]="charger.deviceName + ' charger — open charging history'">

      <div class="card-head">
        <div>
          <div class="name">{{ charger.deviceName }}</div>
          <div class="model">{{ charger.deviceCode }}</div>
        </div>
        <div class="badges">
          <span class="status-pill" [class.online]="charger.online" [class.offline]="!charger.online">
            <span class="dot"></span>{{ charger.onlineLabel }}
          </span>
          <span class="fresh">synced {{ charger.syncedAgo }}</span>
        </div>
      </div>

      <div class="statrow">
        <div class="stat">
          <div class="lbl">Active power</div>
          <div class="val">{{ charger.activePowerKw | number:'1.1-1' }}<small>kW</small></div>
        </div>
        <div class="stat">
          <div class="lbl">Lifetime energy</div>
          <div class="val">
            <ng-container *ngIf="charger.lifetimeKwh !== null">{{ charger.lifetimeKwh | number:'1.1-1' }}<small>kWh</small></ng-container>
            <ng-container *ngIf="charger.lifetimeKwh === null">—</ng-container>
          </div>
        </div>
        <div class="stat">
          <div class="lbl">Charging time</div>
          <div class="val">
            <ng-container *ngIf="charger.chargingTimeH !== null">{{ charger.chargingTimeH }}<small>h</small> {{ charger.chargingTimeM }}<small>m</small></ng-container>
            <ng-container *ngIf="charger.chargingTimeH === null">—</ng-container>
          </div>
        </div>
        <div class="stat">
          <div class="lbl">Sessions now</div>
          <div class="val">{{ charger.activeSessionCount }}</div>
        </div>
      </div>

      <div class="sockets">
        <div class="socket" *ngFor="let s of charger.sockets; trackBy: trackByName"
             [ngClass]="'is-' + s.state">
          <div class="socket-head">
            <span class="sname">{{ s.name }}</span>
            <span class="chip">{{ s.typeLabel }}</span>
          </div>

          <div class="sstatus"><span class="sdot"></span>{{ s.statusLabel }}</div>

          <ng-container *ngIf="s.state === 'charging'; else socketSub">
            <div class="kwbig" *ngIf="s.sessionKw !== null && s.sessionKw !== undefined">
              {{ s.sessionKw | number:'1.1-1' }} <small>kW</small>
            </div>
            <div class="sess-lines">
              <span *ngIf="s.sessionUser">
                <b>{{ s.sessionUser }}</b><ng-container *ngIf="s.sessionDuration"> · {{ s.sessionDuration }}</ng-container>
              </span>
              <span *ngIf="s.sessionKwh !== null && s.sessionKwh !== undefined">
                <b>{{ s.sessionKwh | number:'1.1-1' }} kWh</b> delivered<ng-container
                  *ngIf="s.usedCurrentA !== null && s.usedCurrentA !== undefined"> · <b>{{ s.usedCurrentA | number:'1.0-0' }} A</b> draw</ng-container>
              </span>
            </div>
          </ng-container>
          <ng-template #socketSub>
            <div class="ssub" *ngIf="s.subLabel">{{ s.subLabel }}</div>
          </ng-template>
        </div>
      </div>

      <div class="card-foot"><span>View history</span><span class="chev">→</span></div>
    </button>
  `,
  styles: [`
    :host { display: block; }

    .ev-card {
      display: block; width: 100%; background: var(--surface);
      border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow);
      cursor: pointer; text-align: left; padding: 0; font: inherit; color: var(--ink);
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .ev-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(11,11,11,0.06), 0 8px 24px rgba(11,11,11,0.10);
    }
    .ev-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .ev-card, .ev-card:hover { transition: none; transform: none; }
    }

    .card-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 18px 20px 14px;
    }
    .card-head .name { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
    .card-head .model { font-size: 12.5px; color: var(--muted); margin-top: 1px; }

    .badges { display: flex; align-items: center; gap: 8px; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
      border: 1px solid var(--border);
    }
    .status-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--good); }
    .status-pill.online { color: var(--good-text); }
    .status-pill.offline { color: var(--muted); }
    .status-pill.offline .dot { background: var(--muted); }
    .fresh { font-size: 11.5px; color: var(--muted); white-space: nowrap; }

    .statrow {
      display: grid; grid-template-columns: repeat(4, 1fr);
      border-top: 1px solid var(--grid); border-bottom: 1px solid var(--grid);
    }
    .stat { padding: 12px 8px 12px 20px; }
    .stat + .stat { border-left: 1px solid var(--grid); }
    .stat .lbl {
      font-size: 9.5px; letter-spacing: 0.09em; text-transform: uppercase;
      color: var(--muted); font-weight: 600;
    }
    .stat .val {
      font-size: 17px; font-weight: 700; margin-top: 2px; letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .stat .val small { font-size: 11px; font-weight: 600; color: var(--ink-2); margin-left: 2px; }

    .sockets { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 20px 8px; }
    .socket {
      border: 1px solid var(--grid); border-radius: 10px; padding: 12px 14px; min-height: 118px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .socket-head { display: flex; align-items: center; gap: 7px; }
    .socket-head .sname { font-size: 13px; font-weight: 700; }
    .chip {
      font-size: 10px; font-weight: 600; color: var(--ink-2);
      border: 1px solid var(--grid); border-radius: 5px; padding: 1px 6px;
    }
    .sstatus { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; }
    .sdot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--muted); }
    .ssub { font-size: 12px; color: var(--muted); }

    .socket.is-ready .sdot { background: var(--good); }
    .socket.is-ready .sstatus { color: var(--good-text); }

    .socket.is-charging { border-color: var(--accent); background: var(--accent-wash); }
    .socket.is-charging .sdot { background: var(--accent); animation: rev-ev-pulse 1.6s ease-in-out infinite; }
    .socket.is-charging .sstatus { color: var(--accent); }
    @keyframes rev-ev-pulse { 50% { opacity: 0.35; } }
    @media (prefers-reduced-motion: reduce) { .socket.is-charging .sdot { animation: none; } }

    .kwbig { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
    .kwbig small { font-size: 12px; font-weight: 600; color: var(--ink-2); }
    .sess-lines { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--ink-2); }
    .sess-lines b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }

    .socket.is-fault { border-color: var(--critical); background: var(--critical-wash); }
    .socket.is-fault .sdot { background: var(--critical); }
    .socket.is-fault .sstatus { color: var(--critical); }

    .socket.is-offline .sstatus { color: var(--muted); }

    .card-foot {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px 14px; font-size: 13px; font-weight: 600; color: var(--accent);
    }
    .card-foot .chev { transition: transform .12s ease; }
    .ev-card:hover .card-foot .chev { transform: translateX(3px); }
  `],
})
export class ChargerStatusCardComponent {
  @Input() charger!: ChargerCardViewModel;

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
  ) {}

  openHistory(): void {
    this.dialog.open(EvStationHistoryModalComponent, {
      panelClass: 'rev-evh-dialog',
      autoFocus: false,
      maxHeight: '92vh',
      // Resolve the dashboard-scoped ThingsBoardTelemetryService inside the dialog
      viewContainerRef: this.viewContainerRef,
      data: {
        deviceId: this.charger.deviceId,
        deviceName: this.charger.deviceName,
        deviceCode: this.charger.deviceCode,
      },
    });
  }

  trackByName(_index: number, socket: { name: string }): string {
    return socket.name;
  }
}
