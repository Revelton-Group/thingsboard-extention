import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ControlPanelSectionId,
  CONTROL_PANEL_SECTIONS,
  ControlPanelSection,
  ControlPanelConfig,
  DEFAULT_CONTROL_PANEL_CONFIG,
} from '../models/control-panel.models';

@Injectable({ providedIn: 'root' })
export class ControlPanelService {
  readonly sections: ControlPanelSection[] = CONTROL_PANEL_SECTIONS;
  private readonly STORAGE_KEY = 'revelton_control_panel_config';

  /** ThingsBoard widget context — provides ctx.http for REST calls */
  private ctx: any = null;

  private _isOpen$ = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen$.asObservable();

  private _activeSection$ = new BehaviorSubject<ControlPanelSectionId>('air_quality');
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

  open(section: ControlPanelSectionId = 'air_quality'): void {
    this._activeSection$.next(section);
    this._isOpen$.next(true);
  }

  close(): void { this._isOpen$.next(false); }

  toggle(): void { this.isOpen ? this.close() : this.open(); }

  navigateTo(section: ControlPanelSectionId): void {
    this._activeSection$.next(section);
  }

  loadConfig(): ControlPanelConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_CONTROL_PANEL_CONFIG,
          ...parsed,
          airQuality: { ...DEFAULT_CONTROL_PANEL_CONFIG.airQuality, ...parsed.airQuality },
          thermostat: { ...DEFAULT_CONTROL_PANEL_CONFIG.thermostat, ...parsed.thermostat },
          noise: { ...DEFAULT_CONTROL_PANEL_CONFIG.noise, ...parsed.noise },
          window: { ...DEFAULT_CONTROL_PANEL_CONFIG.window, ...parsed.window },
          mews: { ...DEFAULT_CONTROL_PANEL_CONFIG.mews, ...parsed.mews },
          telegram: { ...DEFAULT_CONTROL_PANEL_CONFIG.telegram, ...parsed.telegram },
        };
      }
    } catch (e) {
      console.warn('Failed to load control panel config from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONTROL_PANEL_CONFIG));
  }

  saveConfig(newConfig: ControlPanelConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newConfig));
      this._config$.next(newConfig);

      // Also persist to ThingsBoard server attributes for Rule Engine access
      this.persistToThingsBoard(newConfig);
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
            const merged: ControlPanelConfig = {
              ...DEFAULT_CONTROL_PANEL_CONFIG,
              ...serverConfig,
              airQuality: { ...DEFAULT_CONTROL_PANEL_CONFIG.airQuality, ...serverConfig.airQuality },
              thermostat: { ...DEFAULT_CONTROL_PANEL_CONFIG.thermostat, ...serverConfig.thermostat },
              noise: { ...DEFAULT_CONTROL_PANEL_CONFIG.noise, ...serverConfig.noise },
              window: { ...DEFAULT_CONTROL_PANEL_CONFIG.window, ...serverConfig.window },
              mews: { ...DEFAULT_CONTROL_PANEL_CONFIG.mews, ...serverConfig.mews },
              telegram: { ...DEFAULT_CONTROL_PANEL_CONFIG.telegram, ...serverConfig.telegram },
            };
            this._config$.next(merged);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
            console.log('[ControlPanel] ✅ Loaded config from ThingsBoard server');
          } catch (e) {
            console.warn('[ControlPanel] Failed to parse server config', e);
          }
        }
      },
      (err: any) => console.warn('[ControlPanel] Could not load server config', err)
    );
  }

  /** Persist entire config as a SERVER_SCOPE attribute on all resolved Assets */
  private persistToThingsBoard(config: ControlPanelConfig): void {
    console.log('[ControlPanel] persistToThingsBoard starting...', { ctx: this.ctx });
    if (!this.ctx?.http) {
      console.warn('[ControlPanel] No ctx.http available — config saved locally only');
      return;
    }

    const entityIds = this.resolveAllAssetEntityIds();
    if (entityIds.length === 0) {
      console.warn('[ControlPanel] Could not resolve any asset entity IDs. Datasources:', this.ctx?.datasources);
      return;
    }

    const payload: any = {
      controlPanelConfig: JSON.stringify(config),

      // Flat Air Quality thresholds
      co2Max: config.airQuality.co2Max,
      pm25Max: config.airQuality.pm25Max,
      pm10Max: config.airQuality.pm10Max,
      tvocMax: config.airQuality.tvocMax,
      tempMax: config.airQuality.tempMax,
      humMax: config.airQuality.humMax,
      pressMax: config.airQuality.pressMax,
      airQuality_enabled: config.airQuality.enabled,

      // Flat Noise thresholds
      noiseMax: config.noise.noiseMax,
      laeqMax: config.noise.laeqMax,
      laiMax: config.noise.laiMax,
      laimaxMax: config.noise.laimaxMax,
      noise_enabled: config.noise.enabled,

      // Flat Telegram settings
      telegram_enabled: config.telegram.enabled,
      telegram_botToken: config.telegram.botToken,
      telegram_chatId: config.telegram.chatId,
      telegram_topicId: config.telegram.topicId,

      // Flat Thermostat settings
      thermostat_enabled: config.thermostat.enabled,
      thermostat_startTime: config.thermostat.startTime,
      thermostat_endTime: config.thermostat.endTime,
      thermostat_exerciseTemp: config.thermostat.exerciseTemp,

      // Flat Window settings
      window_enabled: config.window.enabled,
      window_thresholdHours: config.window.thresholdHours
    };

    for (const entityId of entityIds) {
      console.log(`[ControlPanel] Attempting POST to /api/plugins/telemetry/ASSET/${entityId}/SERVER_SCOPE`, payload);
      this.ctx.http.post(
        `/api/plugins/telemetry/ASSET/${entityId}/SERVER_SCOPE`,
        payload
      ).subscribe(
        () => console.log(`[ControlPanel] ✅ Config persisted successfully to Asset ${entityId}`),
        (err: any) => console.error(`[ControlPanel] ❌ Failed to persist config to Asset ${entityId}`, err)
      );
    }
  }

  /** Find the first ASSET entity ID from the widget context datasources for loading */
  private resolveHotelEntityId(): string | null {
    const ids = this.resolveAllAssetEntityIds();
    return ids.length > 0 ? ids[0] : null;
  }

  /** Get all ASSET entity IDs from the widget context datasources */
  private resolveAllAssetEntityIds(): string[] {
    if (!this.ctx?.datasources) {
      console.warn('[ControlPanel] resolveAllAssetEntityIds: No datasources found on ctx');
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
    console.log('[ControlPanel] resolveAllAssetEntityIds found assets:', assetIds);
    return assetIds;
  }
}
