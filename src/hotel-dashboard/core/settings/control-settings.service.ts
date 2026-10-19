import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { Attrs, buildBulk, buildReset, buildSave, dayNight, effective } from './control-settings.core';
import { FIELD_BY_KEY, HOTEL_KEYS, ROOM_KEYS, SettingValue } from './control-settings.schema';

export interface ControlSettingsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  hotel: Attrs;
  saving: boolean;
}

export interface NoiseLimits {
  enabled: boolean;
  laeq: number | null;
  lai: number | null;
  laimax: number | null;
}

const HTTP_OPTS = { ignoreErrors: true, ignoreLoading: true };

@Injectable()
export class ControlSettingsService implements OnDestroy {
  private ctx: any = null;
  private hotelAssetId: string | null = null;
  private bridgeId: () => string | null = () => null;
  private lastBulkTs = 0;
  private bulkBusy = false;
  private epoch = 0;

  private readonly _state$ = new BehaviorSubject<ControlSettingsState>({ status: 'idle', hotel: {}, saving: false });
  readonly state$ = this._state$.asObservable();
  readonly hotel$ = this._state$.pipe(map(s => s.hotel));

  get hotel(): Attrs { return this._state$.value.hotel; }
  get hasBridge(): boolean { return !!this.bridgeId(); }

  setCtx(ctx: any): void { this.ctx = ctx; }

  setBridgeIdProvider(provider: () => string | null): void { this.bridgeId = provider; }

  setHotelAssetId(id: string | null): void {
    if (id === this.hotelAssetId) return;
    this.hotelAssetId = id;
    this.epoch++;
    this._state$.next({ status: 'idle', hotel: {}, saving: false });
    if (id) void this.load();
  }

  /** For a lone room widget: the hotel is the asset that Contains the room asset. */
  async resolveHotelFrom(roomAssetId: string): Promise<void> {
    const http = this.ctx?.http;
    if (!http) return;
    try {
      const rels: any[] = await firstValueFrom(
        http.get(`/api/relations/info?toId=${roomAssetId}&toType=ASSET`, HTTP_OPTS));
      const parent = (rels || []).find(r => r.type === 'Contains' && r.from?.entityType === 'ASSET');
      if (parent?.from?.id) this.setHotelAssetId(parent.from.id);
    } catch {
      this.patch({ status: 'error' });
    }
  }

  async load(): Promise<void> {
    const http = this.ctx?.http;
    if (!http || !this.hotelAssetId) return;
    const epoch = this.epoch;
    this.patch({ status: 'loading' });
    try {
      const rows: { key: string; value: unknown }[] = await firstValueFrom(
        http.get(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/values/attributes/SERVER_SCOPE?keys=${HOTEL_KEYS.join(',')}`, HTTP_OPTS));
      if (epoch !== this.epoch) return;
      const hotel: Attrs = {};
      for (const r of rows || []) hotel[r.key] = r.value;
      const ts = Number(hotel['heat_bulk_ts']);
      if (Number.isFinite(ts)) this.lastBulkTs = Math.max(this.lastBulkTs, ts);
      this._state$.next({ status: 'ready', hotel, saving: false });
    } catch {
      if (epoch === this.epoch) this.patch({ status: 'error' });
    }
  }

  async save(changes: Record<string, unknown>): Promise<{ ok: boolean; errors: Record<string, string> }> {
    const http = this.ctx?.http;
    if (!http || !this.hotelAssetId) return { ok: false, errors: { _: 'not-ready' } };

    const clear: string[] = [];
    const write: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) clear.push(k); else write[k] = v;
    }
    const { set, errors } = buildSave(write, this.hotel);
    if (Object.keys(errors).length) return { ok: false, errors };

    const hotelSet: Attrs = {};
    const bridgeSet: Attrs = {};
    for (const [k, v] of Object.entries(set)) (FIELD_BY_KEY[k].scope === 'BRIDGE' ? bridgeSet : hotelSet)[k] = v;
    const hotelClear = clear.filter(k => FIELD_BY_KEY[k] && FIELD_BY_KEY[k].scope !== 'BRIDGE');

    this.patch({ saving: true });
    try {
      if (Object.keys(hotelSet).length) {
        await firstValueFrom(http.post(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/SERVER_SCOPE`, hotelSet, HTTP_OPTS));
      }
      if (hotelClear.length) {
        await firstValueFrom(http.delete(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/SERVER_SCOPE?keys=${hotelClear.join(',')}`, HTTP_OPTS));
      }
      if (Object.keys(bridgeSet).length) {
        const id = this.bridgeId();
        if (!id) throw new Error('no-bridge');
        await firstValueFrom(http.post(`/api/plugins/telemetry/DEVICE/${id}/SHARED_SCOPE`, bridgeSet, HTTP_OPTS));
      }
      const next: Attrs = { ...this.hotel, ...hotelSet };
      for (const k of hotelClear) delete next[k];
      this._state$.next({ ...this._state$.value, hotel: next, saving: false });
      return { ok: true, errors: {} };
    } catch {
      this.patch({ saving: false });
      return { ok: false, errors: { _: 'save' } };
    }
  }

  async loadRoom(roomAssetId: string): Promise<Attrs> {
    const http = this.ctx?.http;
    if (!http) return {};
    const rows: { key: string; value: unknown }[] = await firstValueFrom(
      http.get(`/api/plugins/telemetry/ASSET/${roomAssetId}/values/attributes/SERVER_SCOPE?keys=${ROOM_KEYS.join(',')}`, HTTP_OPTS));
    const out: Attrs = {};
    for (const r of rows || []) out[r.key] = r.value;
    return out;
  }

  async saveRoom(roomAssetId: string, changes: Record<string, unknown>): Promise<boolean> {
    const http = this.ctx?.http;
    const { set, errors } = buildSave(changes, this.hotel);
    if (!http || Object.keys(errors).length || !Object.keys(set).length) return false;
    try {
      await firstValueFrom(http.post(`/api/plugins/telemetry/ASSET/${roomAssetId}/SERVER_SCOPE`, set, HTTP_OPTS));
      return true;
    } catch {
      return false;
    }
  }

  async resetRoom(roomAssetId: string, keys: string[]): Promise<boolean> {
    const http = this.ctx?.http;
    const list = buildReset(keys);
    if (!http || !list.length) return false;
    try {
      await firstValueFrom(http.delete(`/api/plugins/telemetry/ASSET/${roomAssetId}/SERVER_SCOPE?keys=${list.join(',')}`, HTTP_OPTS));
      return true;
    } catch {
      return false;
    }
  }

  async bulkThermostats(mode: 'auto' | 'manual'): Promise<boolean> {
    const http = this.ctx?.http;
    if (!http || !this.hotelAssetId || this.bulkBusy) return false;
    this.bulkBusy = true;
    const body = buildBulk(mode, Date.now(), this.lastBulkTs);
    try {
      await firstValueFrom(http.post(`/api/plugins/telemetry/ASSET/${this.hotelAssetId}/SERVER_SCOPE`, body, HTTP_OPTS));
      this.lastBulkTs = body['heat_bulk_ts'] as number;
      return true;
    } catch {
      return false;
    } finally {
      this.bulkBusy = false;
    }
  }

  value(key: string, room?: Attrs): SettingValue {
    const field = FIELD_BY_KEY[key];
    return field ? effective(field, this.hotel, room).value : null;
  }

  number(key: string, room?: Attrs): number | null {
    const v = this.value(key, room);
    return typeof v === 'number' ? v : null;
  }

  enabled(key: string, room?: Attrs): boolean {
    return this.value(key, room) !== false;
  }

  noiseLimits(nowMs: number, room?: Attrs): NoiseLimits {
    const tz = String(this.value('heat_timezone') ?? 'Europe/Prague');
    const start = String(this.value('noise_dayPeriod_start', room) ?? '07:00');
    const end = String(this.value('noise_dayPeriod_end', room) ?? '22:00');
    const period = dayNight(nowMs, tz, start, end);
    return {
      enabled: this.enabled('noise_enabled', room),
      laeq: this.number(`noise_${period}_laeq`, room),
      lai: this.number(`noise_${period}_lai`, room),
      laimax: this.number(`noise_${period}_laimax`, room),
    };
  }

  ngOnDestroy(): void {
    this.ctx = null;
    this.bridgeId = () => null;
    this.epoch++;
  }

  private patch(p: Partial<ControlSettingsState>): void {
    this._state$.next({ ...this._state$.value, ...p });
  }
}
