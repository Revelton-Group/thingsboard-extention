import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewContainerRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChargerCardViewModel, SocketViewModel } from '../../../core/models';
import { EvStationHistoryModalComponent } from '../ev-station-history-modal/ev-station-history-modal.component';

@Component({
  selector: 'revelton-charger-status-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <button class="ev-card" type="button" (click)="openHistory()"
            aria-haspopup="dialog"
            [attr.aria-label]="charger.deviceName + ' charger, open charging history'">

      <div class="card-main">
        <div class="card-head">
          <div class="identity">
            <div class="name">{{ charger.deviceName }}</div>
            <div class="model">{{ charger.deviceCode }}</div>
          </div>
          <div class="badges">
            <span class="status-pill" [class.online]="charger.online" [class.offline]="!charger.online">
              <span class="dot"></span>{{ charger.onlineLabel }}
            </span>
            <span class="fresh">synced {{ syncedAgo }}</span>
          </div>
        </div>

        <div class="stats">
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
      </div>

      <div class="sockets">
        <div class="socket" *ngFor="let s of charger.sockets; trackBy: trackByName"
             [ngClass]="'is-' + s.state">
          <span class="plug"><mat-icon>{{ socketIcon(s) }}</mat-icon></span>

          <div class="socket-body">
            <div class="socket-head">
              <span class="sname">{{ s.name }}</span>
              <span class="chip">{{ s.typeLabel }}</span>
            </div>

            <div class="sstatus">{{ s.statusLabel }}</div>

            <ng-container *ngIf="s.state === 'charging'; else socketSub">
              <div class="kwbig" *ngIf="s.sessionKw !== null && s.sessionKw !== undefined">
                {{ s.sessionKw | number:'1.1-1' }} <small>kW</small>
              </div>
              <div class="sess-lines">
                <span *ngIf="s.sessionUser">
                  <b>{{ s.sessionUser }}</b><ng-container *ngIf="socketDuration(s) as dur">, {{ dur }}</ng-container>
                </span>
                <span *ngIf="s.sessionKwh !== null && s.sessionKwh !== undefined">
                  <b>{{ s.sessionKwh | number:'1.1-1' }} kWh</b> delivered<ng-container
                    *ngIf="s.usedCurrentA !== null && s.usedCurrentA !== undefined">, <b>{{ s.usedCurrentA | number:'1.0-0' }} A</b> draw</ng-container>
                </span>
              </div>
            </ng-container>
            <ng-template #socketSub>
              <div class="ssub" *ngIf="s.subLabel">{{ s.subLabel }}</div>
            </ng-template>
          </div>
        </div>
      </div>

      <div class="card-foot"><mat-icon>history</mat-icon><span>Charging history</span><mat-icon class="chev">chevron_right</mat-icon></div>
    </button>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }

    .ev-card {
      display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "main" "sockets" "foot"; width: 100%;
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      box-shadow: var(--shadow); cursor: pointer; text-align: left; padding: 0;
      font: inherit; font-size: 13px; line-height: 1.45; color: var(--ink);
      transition: border-color .12s ease;
    }
    .ev-card:hover { border-color: var(--baseline); }
    .ev-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .card-main { grid-area: main; min-width: 0; }

    .card-head {
      display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between;
      gap: 8px 12px; padding: 18px 20px 14px;
    }
    .identity { min-width: 0; }
    .name { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3; }
    .model { font-size: 12px; color: var(--ink-2); }

    .badges { display: flex; align-items: center; gap: 8px; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
      border: 1px solid var(--border);
    }
    .status-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--good); }
    .status-pill.online { color: var(--good-text); }
    .status-pill.offline { color: var(--ink-2); }
    .status-pill.offline .dot { background: var(--muted); }
    .fresh { font-size: 12px; color: var(--ink-2); white-space: nowrap; }

    .stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
      gap: 14px 16px; padding: 0 20px 16px;
    }
    .stat .lbl { font-size: 12px; color: var(--ink-2); }
    .stat .val {
      font-size: 18px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3;
      font-variant-numeric: tabular-nums;
    }
    .stat .val small { font-size: 12px; font-weight: 600; color: var(--ink-2); margin-left: 2px; }

    .card-foot {
      grid-area: foot; display: flex; align-items: center; gap: 6px; align-self: end;
      padding: 12px 20px; border-top: 1px solid var(--grid);
      font-weight: 600; color: var(--accent);
    }
    .card-foot mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .card-foot .chev { margin-left: auto; transition: transform .12s ease; }
    .ev-card:hover .card-foot .chev { transform: translateX(3px); }

    .sockets {
      grid-area: sockets; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px; padding: 16px 20px; border-top: 1px solid var(--grid);
    }
    .socket {
      display: flex; align-items: flex-start; gap: 12px; min-height: 96px;
      border: 1px solid var(--grid); border-radius: 12px; padding: 14px;
    }
    .plug {
      display: flex; align-items: center; justify-content: center; flex: none;
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--grid); color: var(--muted);
    }
    .plug mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .socket-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .socket-head { display: flex; align-items: center; gap: 7px; }
    .sname { font-weight: 600; color: var(--ink-2); }
    .chip {
      font-size: 11px; font-weight: 600; color: var(--ink-2);
      border: 1px solid var(--grid); border-radius: 5px; padding: 0 6px;
    }
    .sstatus { font-size: 15px; font-weight: 700; line-height: 1.3; }
    .ssub { font-size: 12px; color: var(--ink-2); }

    .socket.is-ready .plug { background: color-mix(in srgb, var(--good) 16%, transparent); color: var(--good-text); }
    .socket.is-ready .sstatus { color: var(--good-text); }

    .socket.is-charging { border-color: var(--accent); background: var(--accent-wash); }
    .socket.is-charging .plug { background: var(--accent); color: #fff; animation: rev-ev-pulse 1.8s ease-out infinite; }
    .socket.is-charging .sstatus { color: var(--accent); }
    @keyframes rev-ev-pulse {
      from { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 45%, transparent); }
      to { box-shadow: 0 0 0 10px transparent; }
    }

    .kwbig { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .kwbig small { font-size: 12px; font-weight: 600; color: var(--ink-2); }
    .sess-lines { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--ink-2); }
    .sess-lines b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

    .socket.is-fault { border-color: var(--critical); background: var(--critical-wash); }
    .socket.is-fault .plug { background: var(--critical); color: #fff; }
    .socket.is-fault .sstatus { color: var(--critical); }

    .socket.is-offline .sstatus { color: var(--ink-2); }

    /* A card with room to spare puts the sockets beside the charger instead of below it. */
    @container (min-width: 760px) {
      .ev-card { grid-template-columns: minmax(300px, 1fr) minmax(0, 2fr); grid-template-areas: "main sockets" "foot sockets"; }
      .sockets { border-top: 0; border-left: 1px solid var(--grid); align-content: start; }
    }

    @media (prefers-reduced-motion: reduce) {
      .ev-card, .card-foot .chev { transition: none; }
      .ev-card:hover .card-foot .chev { transform: none; }
      .socket.is-charging .plug { animation: none; }
    }
  `],
})
export class ChargerStatusCardComponent implements OnInit, OnDestroy {
  @Input() charger!: ChargerCardViewModel;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Re-render once a second so "synced X ago" and the live session duration keep
    // ticking between ThingsBoard telemetry pushes — without any backend re-fetch.
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Live "X ago" label derived from the stored sync timestamp. */
  get syncedAgo(): string {
    return this.formatTimeAgo(this.charger?.syncTime ?? null);
  }

  /** Live session duration: ticks from the start anchor, else the static fallback string. */
  socketDuration(socket: SocketViewModel): string | undefined {
    if (socket.sessionStartTime != null) {
      return this.formatMinutes((Date.now() - socket.sessionStartTime) / 60000);
    }
    return socket.sessionDuration;
  }

  private formatTimeAgo(time: number | null): string {
    if (time == null || isNaN(time)) return 'unknown';
    const diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 0) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  private formatMinutes(totalMin: number): string {
    const min = Math.max(0, Math.round(totalMin));
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} m`;
    return `${m} min`;
  }

  openHistory(): void {
    this.dialog.open(EvStationHistoryModalComponent, {
      panelClass: 'rev-evh-dialog',
      autoFocus: false,
      maxHeight: '92vh',
      // Let the modal use its own responsive width (min(760px, 92vw)); the MatDialog
      // default maxWidth of 80vw would otherwise clip it on phones and tablets.
      maxWidth: '96vw',
      // Resolve the dashboard-scoped ThingsBoardTelemetryService inside the dialog
      viewContainerRef: this.viewContainerRef,
      data: {
        deviceId: this.charger.deviceId,
        deviceName: this.charger.deviceName,
        deviceCode: this.charger.deviceCode,
      },
    });
  }

  socketIcon(socket: SocketViewModel): string {
    switch (socket.state) {
      case 'charging': return 'bolt';
      case 'fault': return 'warning_amber';
      case 'offline': return 'power_off';
      default: return 'power';
    }
  }

  trackByName(_index: number, socket: { name: string }): string {
    return socket.name;
  }
}
