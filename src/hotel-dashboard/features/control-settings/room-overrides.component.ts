import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService, TranslationSet } from '../../core/services/translation.service';
import { Attrs, coerce, validate } from '../../core/settings/control-settings.core';
import { FIELD_BY_KEY, SettingValue } from '../../core/settings/control-settings.schema';
import { ControlSettingsService } from '../../core/settings/control-settings.service';

const ROOM_ROWS = [
  'heat_comfort_temp', 'heat_eco_temp', 'co2Max', 'tempMax', 'humMax',
  'noise_day_laeq', 'noise_night_laeq', 'batteryMin',
];

@Component({
  selector: 'tb-room-overrides',
  templateUrl: './room-overrides.component.html',
  styleUrls: ['./room-overrides.component.scss'],
  standalone: false,
})
export class RoomOverridesComponent {
  @Input() roomAssetId: string | null = null;
  @Input() overrides: Attrs = {};
  @Output() overridesChange = new EventEmitter<Attrs>();

  readonly rows = ROOM_ROWS;
  readonly F = FIELD_BY_KEY;

  expanded = false;
  busy = false;
  error = '';
  fieldError: Record<string, string> = {};

  constructor(
    private settings: ControlSettingsService,
    private translation: TranslationService,
    private cd: ChangeDetectorRef,
  ) {}

  get t(): TranslationSet { return this.translation.t; }
  get ready(): boolean { return !!this.roomAssetId; }

  get ownCount(): number {
    return [...this.rows, 'heat_enabled'].filter(k => this.own(k) !== null).length;
  }

  label(key: string): string { return this.t[this.F[key].labelKey] as string; }
  unit(key: string): string { return this.F[key].unit || ''; }
  hotel(key: string): SettingValue { return this.settings.value(key); }
  own(key: string): SettingValue { return coerce(this.F[key], this.overrides[key]); }
  heatOn(): boolean { return this.own('heat_enabled') !== false; }

  toggle(): void {
    this.expanded = !this.expanded;
  }

  async commit(key: string, raw: string): Promise<void> {
    if (!this.roomAssetId) return;
    if (raw.trim() === '') {
      if (this.own(key) !== null) await this.reset(key);
      return;
    }
    const value = Number(raw);
    const err = validate(this.F[key], value);
    if (err) {
      this.fieldError[key] = err;
      this.cd.markForCheck();
      return;
    }
    delete this.fieldError[key];
    await this.write(key, value);
  }

  async setHeating(on: boolean): Promise<void> {
    await this.write('heat_enabled', on);
  }

  async reset(key: string): Promise<void> {
    if (!this.roomAssetId || this.busy) return;
    this.busy = true;
    const ok = await this.settings.resetRoom(this.roomAssetId, [key]);
    this.busy = false;
    if (ok) {
      const next = { ...this.overrides };
      delete next[key];
      delete this.fieldError[key];
      this.error = '';
      this.overridesChange.emit(next);
    } else {
      this.error = this.t.csSaveFailed;
    }
    this.cd.markForCheck();
  }

  errText(code: string): string {
    return this.t[('csErr_' + code) as keyof TranslationSet] as string;
  }

  trackKey(_i: number, key: string): string { return key; }

  private async write(key: string, value: unknown): Promise<void> {
    if (!this.roomAssetId || this.busy) return;
    this.busy = true;
    const ok = await this.settings.saveRoom(this.roomAssetId, { [key]: value });
    this.busy = false;
    if (ok) {
      this.error = '';
      this.overridesChange.emit({ ...this.overrides, [key]: value });
    } else {
      this.error = this.t.csSaveFailed;
    }
    this.cd.markForCheck();
  }
}
