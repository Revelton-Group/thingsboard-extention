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

  private _isOpen$ = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen$.asObservable();

  private _activeSection$ = new BehaviorSubject<ControlPanelSectionId>('air_quality');
  readonly activeSection$ = this._activeSection$.asObservable();

  private _config$ = new BehaviorSubject<ControlPanelConfig>(this.loadConfig());
  readonly config$ = this._config$.asObservable();

  get isOpen(): boolean { return this._isOpen$.getValue(); }
  get activeSection(): ControlPanelSectionId { return this._activeSection$.getValue(); }
  get config(): ControlPanelConfig { return this._config$.getValue(); }

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
    } catch (e) {
      console.error('Failed to save control panel config to localStorage', e);
    }
  }
}
