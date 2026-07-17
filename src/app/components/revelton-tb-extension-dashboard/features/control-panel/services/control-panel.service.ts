import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ControlPanelSectionId,
  CONTROL_PANEL_SECTIONS,
  ControlPanelSection,
  ControlPanelConfig,
  DEFAULT_CONTROL_PANEL_CONFIG,
} from '../models/control-panel.models';

/** Flip to true to surface informational warnings during development. */
const DEBUG = false;
function debugWarn(...args: any[]): void {
  if (DEBUG) console.warn(...args);
}

@Injectable({ providedIn: 'root' })
export class ControlPanelService {
  readonly sections: ControlPanelSection[] = CONTROL_PANEL_SECTIONS;
  private readonly STORAGE_KEY = 'revelton_control_panel_config';

  /** ThingsBoard widget context — provides ctx.http for REST calls */
  private ctx: any = null;

  private _isOpen$ = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen$.asObservable();

  private _activeSection$ = new BehaviorSubject<ControlPanelSectionId>('noise');
  readonly activeSection$ = this._activeSection$.asObservable();

  private _config$ = new BehaviorSubject<ControlPanelConfig>(this.loadConfig());
  readonly config$ = this._config$.asObservable();

  get isOpen(): boolean { return this._isOpen$.getValue(); }
  get activeSection(): ControlPanelSectionId { return this._activeSection$.getValue(); }
  get config(): ControlPanelConfig { return this._config$.getValue(); }

  /** Store widget context so we can use ctx.http for ThingsBoard REST calls */
  setCtx(ctx: any): void {
    this.ctx = ctx;
  }

  open(section: ControlPanelSectionId = 'noise'): void {
    this._activeSection$.next(section);
    this._isOpen$.next(true);
  }

  close(): void { this._isOpen$.next(false); }

  toggle(): void { this.isOpen ? this.close() : this.open(); }

  navigateTo(section: ControlPanelSectionId): void {
    this._activeSection$.next(section);
  }

  /** Deep merge stored config over defaults, preserving nested objects */
  private deepMerge(defaults: any, stored: any): any {
    if (!stored || typeof stored !== 'object') return JSON.parse(JSON.stringify(defaults));
    const result: any = {};
    for (const key of Object.keys(defaults)) {
      if (stored[key] === undefined) {
        // Use default
        result[key] = JSON.parse(JSON.stringify(defaults[key]));
      } else if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key]) && defaults[key] !== null) {
        // Nested object — merge
        result[key] = this.deepMerge(defaults[key], stored[key]);
      } else if (Array.isArray(defaults[key])) {
        // Array — use stored if non-empty, otherwise default
        result[key] = Array.isArray(stored[key]) && stored[key].length > 0
          ? JSON.parse(JSON.stringify(stored[key]))
          : JSON.parse(JSON.stringify(defaults[key]));
      } else {
        // Primitive — use stored value
        result[key] = stored[key];
      }
    }
    return result;
  }

  loadConfig(): ControlPanelConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return this.deepMerge(DEFAULT_CONTROL_PANEL_CONFIG, parsed) as ControlPanelConfig;
      }
    } catch (e) {
      console.warn('Failed to load control panel config from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONTROL_PANEL_CONFIG));
  }

  saveConfig(newConfig: ControlPanelConfig, roomEntityIds?: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newConfig));
      this._config$.next(newConfig);

      // Also persist to ThingsBoard server attributes for Rule Engine access
      this.persistToThingsBoard(newConfig, roomEntityIds);

      // Persist syncIntervalMinutes to Mews gateway shared attributes
      this.persistMewsSyncInterval(newConfig.mews.intervalMinutes);
    } catch (e) {
      console.error('Failed to save control panel config', e);
    }
  }

  /**
   * Load config from ThingsBoard server attributes.
   * Call after setCtx() to sync config across browser sessions.
   */
  loadFromThingsBoard(): void {
    if (!this.ctx?.http) return;

    const entityId = this.resolveHotelEntityId();
    if (!entityId) return;

    this.ctx.http.get(
      `/api/plugins/telemetry/ASSET/${entityId}/values/attributes/SERVER_SCOPE?keys=controlPanelConfig`
    ).subscribe(
      (attrs: any[]) => {
        if (attrs?.length > 0 && attrs[0].value) {
          try {
            const serverConfig = typeof attrs[0].value === 'string'
              ? JSON.parse(attrs[0].value)
              : attrs[0].value;
            const merged = this.deepMerge(DEFAULT_CONTROL_PANEL_CONFIG, serverConfig) as ControlPanelConfig;
            this._config$.next(merged);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {
            console.warn('[ControlPanel] Failed to parse server config', e);
          }
        }
      },
      (err: any) => debugWarn('[ControlPanel] Could not load server config', err)
    );
  }

  /** Persist entire config as a SERVER_SCOPE attribute on the target room Assets */
  private persistToThingsBoard(config: ControlPanelConfig, roomEntityIds?: string[]): void {
    if (!this.ctx?.http) {
      debugWarn('[ControlPanel] No ctx.http available — config saved locally only');
      return;
    }

    // Use provided entity IDs (respecting room scope), or fall back to all datasource assets
    const entityIds = roomEntityIds && roomEntityIds.length > 0
      ? roomEntityIds
      : this.resolveAllAssetEntityIds();

    if (entityIds.length === 0) {
      debugWarn('[ControlPanel] Could not resolve any asset entity IDs.');
      return;
    }

    const payload = this.buildFlatPayload(config);

    for (const entityId of entityIds) {
      this.ctx.http.post(
        `/api/plugins/telemetry/ASSET/${entityId}/SERVER_SCOPE`,
        payload
      ).subscribe(
        () => {},
        (err: any) => console.error(`[ControlPanel] ❌ Failed to persist config to Asset ${entityId}`, err)
      );
    }
  }

  /** Build the complete flat key-value attribute payload from a ControlPanelConfig */
  private buildFlatPayload(config: ControlPanelConfig): Record<string, any> {
    return {
      // Full config JSON (backward compatibility)
      controlPanelConfig: JSON.stringify(config),

      // ── Air Quality ──
      co2Max: config.airQuality.co2Max,
      co2Min: config.airQuality.co2Min,
      pm25Max: config.airQuality.pm25Max,
      pm25Min: config.airQuality.pm25Min,
      pm10Max: config.airQuality.pm10Max,
      pm10Min: config.airQuality.pm10Min,
      tvocMax: config.airQuality.tvocMax,
      tvocMin: config.airQuality.tvocMin,
      tempMax: config.airQuality.tempMax,
      tempMin: config.airQuality.tempMin,
      humMax: config.airQuality.humMax,
      humMin: config.airQuality.humMin,
      pressMax: config.airQuality.pressMax,
      pressMin: config.airQuality.pressMin,

      // ── Thermostat ──
      thermostat_valveOpen: config.thermostat.valveOpen,
      thermostat_preheatingTemp: config.thermostat.preheatingTemp,
      thermostat_preheatingMinutes: config.thermostat.preheatingMinutes,
      thermostat_schedule: JSON.stringify(config.thermostat.schedule),
      thermostat_maintenance_enabled: config.thermostat.maintenance.enabled,
      thermostat_maintenance_tests: JSON.stringify(config.thermostat.maintenance.tests),
      thermostat_winterSeason_start: config.thermostat.winterSeason.start,
      thermostat_winterSeason_end: config.thermostat.winterSeason.end,

      // ── Noise ──
      noise_day_laeq: config.noise.day.laeq,
      noise_day_lai: config.noise.day.lai,
      noise_day_laimax: config.noise.day.laimax,
      noise_night_laeq: config.noise.night.laeq,
      noise_night_lai: config.noise.night.lai,
      noise_night_laimax: config.noise.night.laimax,
      noise_dayPeriod_start: config.noise.dayPeriod.start,
      noise_dayPeriod_end: config.noise.dayPeriod.end,
      noise_nightPeriod_start: config.noise.nightPeriod.start,
      noise_nightPeriod_end: config.noise.nightPeriod.end,

      // ── Window ──
      window_thresholdMinutes: config.window.thresholdMinutes,
      window_autoPauseHeating: config.window.autoPauseHeating,
    };
  }

  /** Find the first ASSET entity ID from the widget context datasources for loading */
  private resolveHotelEntityId(): string | null {
    const ids = this.resolveAllAssetEntityIds();
    return ids.length > 0 ? ids[0] : null;
  }

  /** Get all ASSET entity IDs from the widget context datasources */
  private resolveAllAssetEntityIds(): string[] {
    if (!this.ctx?.datasources) {
      return [];
    }

    const assetIds: string[] = [];
    for (const ds of this.ctx.datasources) {
      if (ds.entityType === 'ASSET') {
        const rawId = ds.entityId;
        const resolvedId = typeof rawId === 'string' ? rawId : rawId?.id;
        if (resolvedId && !assetIds.includes(resolvedId)) {
          assetIds.push(resolvedId);
        }
      }
    }
    return assetIds;
  }

  private resolveMewsDeviceId(): string | null {
    if (!this.ctx?.datasources) return null;
    for (const ds of this.ctx.datasources) {
      if (ds.entityType === 'DEVICE') {
        const entityName = ds.entityName || '';
        const lowerName = entityName.toLowerCase();
        const isMews = lowerName.includes('mews') && !lowerName.includes('room');
        if (isMews) {
          const rawId = ds.entityId;
          return typeof rawId === 'string' ? rawId : rawId?.id;
        }
      }
    }
    return null;
  }

  private persistMewsSyncInterval(interval: number): void {
    if (!this.ctx?.http) {
      debugWarn('[ControlPanel] No ctx.http available — cannot persist syncIntervalMinutes to ThingsBoard');
      return;
    }
    const mewsDeviceId = this.resolveMewsDeviceId();
    if (mewsDeviceId) {
      const payload = {
        syncIntervalMinutes: interval
      };
      this.ctx.http.post(
        `/api/plugins/telemetry/DEVICE/${mewsDeviceId}/SHARED_SCOPE`,
        payload
      ).subscribe(
        () => {},
        (err: any) => console.error(`[ControlPanel] ❌ Failed to persist syncIntervalMinutes to Mews Gateway (${mewsDeviceId})`, err)
      );
    } else {
      debugWarn('[ControlPanel] Could not find Mews gateway device in datasources to persist syncIntervalMinutes');
    }
  }
}
