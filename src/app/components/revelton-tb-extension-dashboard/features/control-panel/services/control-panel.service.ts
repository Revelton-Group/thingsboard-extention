import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ControlPanelSectionId,
  CONTROL_PANEL_SECTIONS,
  ControlPanelSection,
} from '../models/control-panel.models';

@Injectable({ providedIn: 'root' })
export class ControlPanelService {
  readonly sections: ControlPanelSection[] = CONTROL_PANEL_SECTIONS;

  private _isOpen$ = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen$.asObservable();

  private _activeSection$ = new BehaviorSubject<ControlPanelSectionId>('thermostat');
  readonly activeSection$ = this._activeSection$.asObservable();

  get isOpen(): boolean { return this._isOpen$.getValue(); }
  get activeSection(): ControlPanelSectionId { return this._activeSection$.getValue(); }

  open(section: ControlPanelSectionId = 'thermostat'): void {
    this._activeSection$.next(section);
    this._isOpen$.next(true);
  }

  close(): void { this._isOpen$.next(false); }

  toggle(): void { this.isOpen ? this.close() : this.open(); }

  navigateTo(section: ControlPanelSectionId): void {
    this._activeSection$.next(section);
  }
}
