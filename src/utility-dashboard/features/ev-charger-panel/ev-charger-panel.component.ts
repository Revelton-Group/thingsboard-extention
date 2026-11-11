import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChargerCardViewModel, SocketState } from '../../core/models';

const STATE_ORDER: SocketState[] = ['charging', 'fault', 'ready', 'offline'];
const STATE_WORDS: Record<SocketState, string> = { charging: 'charging', fault: 'with a fault', ready: 'ready', offline: 'offline' };

@Component({
  selector: 'revelton-ev-charger-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    <div class="ev-page">
      <header class="ev-head">
        <h1>EV charging</h1>
        <p>{{ chargers?.length || 0 }} {{ chargers?.length === 1 ? 'charger' : 'chargers' }}, {{ totalSockets }} {{ totalSockets === 1 ? 'socket' : 'sockets' }}</p>
      </header>

      <section class="ev-kpis" aria-label="Key figures">
        <div class="ev-kpi">
          <div class="ev-kpi-label">Active power</div>
          <div class="ev-kpi-value"><b>{{ totalPower | number:'1.1-1' }}</b><span>kW</span></div>
          <div class="ev-kpi-sub">All chargers together, right now</div>
        </div>

        <div class="ev-kpi">
          <div class="ev-kpi-label">Sockets in use</div>
          <div class="ev-kpi-value"><b>{{ activeSockets }}</b><span>of {{ totalSockets }}</span></div>
          <div class="ev-strip" aria-hidden="true" *ngIf="socketStates.length">
            <i *ngFor="let state of socketStates; trackBy: trackIndex" [ngClass]="'is-' + state"></i>
          </div>
          <div class="ev-kpi-sub">{{ socketSummary }}</div>
        </div>

        <div class="ev-kpi">
          <div class="ev-kpi-label">Lifetime energy</div>
          <div class="ev-kpi-value"><b>{{ totalEnergy | number:'1.1-1' }}</b><span>kWh</span></div>
          <div class="ev-kpi-sub">Delivered by all chargers</div>
        </div>

        <div class="ev-kpi" [class.is-critical]="activeFaults > 0">
          <div class="ev-kpi-label">Faults</div>
          <div class="ev-kpi-value">
            <mat-icon *ngIf="activeFaults > 0">warning_amber</mat-icon>
            <b>{{ activeFaults }}</b>
          </div>
          <div class="ev-kpi-sub">{{ activeFaults > 0 ? 'A socket needs attention' : 'All sockets healthy' }}</div>
        </div>
      </section>

      <div class="ev-grid" *ngIf="chargers?.length">
        <revelton-charger-status-card
          *ngFor="let charger of chargers; trackBy: trackById"
          [charger]="charger">
        </revelton-charger-status-card>
      </div>

      <div class="ev-empty" *ngIf="!chargers?.length">
        <mat-icon>ev_station</mat-icon>
        <span>No EV charger was found for this property.</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .ev-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 1480px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.45;
      color: var(--ink);
    }

    .ev-head h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .ev-head p {
      margin: 0;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.45;
      letter-spacing: normal;
      color: var(--ink-2);
    }

    .ev-kpis { display: flex; flex-wrap: wrap; gap: 12px; }
    .ev-kpi {
      flex: 1 1 200px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      padding: 16px 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow);
    }
    .ev-kpi-label { color: var(--ink-2); font-weight: 500; }
    .ev-kpi-value { display: flex; align-items: baseline; gap: 6px; }
    .ev-kpi-value b {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .ev-kpi-value span { color: var(--ink-2); }
    .ev-kpi-value mat-icon { align-self: center; font-size: 20px; width: 20px; height: 20px; }
    .ev-kpi-sub { color: var(--ink-2); font-size: 12px; }
    .ev-kpi.is-critical .ev-kpi-value { color: var(--critical); }

    /* One segment per socket: the whole site at a glance. */
    .ev-strip { display: flex; gap: 3px; height: 8px; }
    .ev-strip i { flex: 1 1 0; max-width: 56px; border-radius: 3px; background: var(--baseline); }
    .ev-strip i.is-charging { background: var(--accent); }
    .ev-strip i.is-ready { background: var(--good); }
    .ev-strip i.is-fault { background: var(--critical); }

    .ev-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
      gap: 16px;
    }

    .ev-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--ink-2);
    }
    .ev-empty mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--muted); }
  `]
})
export class EvChargerPanelComponent {
  @Input() chargers: ChargerCardViewModel[] = [];
  @Input() activeSockets = 0;
  @Input() totalSockets = 0;
  @Input() totalPower = 0;
  @Input() totalEnergy = 0;
  @Input() activeSessions = 0;
  @Input() activeFaults = 0;

  get socketStates(): SocketState[] {
    const states = (this.chargers || []).flatMap(c => c.sockets.map(s => s.state));
    return states.sort((a, b) => STATE_ORDER.indexOf(a) - STATE_ORDER.indexOf(b));
  }

  /** "1 charging, 3 ready" — the same thing the strip shows, in words. */
  get socketSummary(): string {
    const states = this.socketStates;
    const parts = STATE_ORDER
      .map(state => ({ state, count: states.filter(s => s === state).length }))
      .filter(p => p.count > 0)
      .map(p => `${p.count} ${STATE_WORDS[p.state]}`);
    return parts.length ? parts.join(', ') : 'No socket reported';
  }

  trackById(_index: number, charger: ChargerCardViewModel): string {
    return charger.deviceId;
  }

  trackIndex(index: number): number {
    return index;
  }
}
