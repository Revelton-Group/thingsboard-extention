import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-smart-sockets-panel',
  templateUrl: './smart-sockets-panel.component.html',
  styleUrls: ['./smart-sockets-panel.component.scss'],
  standalone: false
})
export class SmartSocketsPanelComponent {
  @Input() smartSockets: any[] = [];
  @Output() socketToggled = new EventEmitter<any>();

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  isSocketOn(socket: any): boolean {
    if (!socket || socket.state == null) return false;
    const s = String(socket.state).toLowerCase();
    return s === 'on' || s === 'true' || s === '1';
  }

  isTelemetryOn(socket: any): boolean {
    if (!socket || socket.telemetryState == null) return false;
    const s = String(socket.telemetryState).toLowerCase();
    return s === 'on' || s === 'true' || s === '1';
  }

  getOnSocketsCount(): number {
    return this.smartSockets.filter(s => this.isSocketOn(s)).length;
  }

  getSocketIcon(socket: any): string {
    const name = (socket.displayName || '').toLowerCase();
    if (name.includes('bedside') || name.includes('lamp')) return 'nightlight';
    if (name.includes('tv')) return 'tv';
    if (name.includes('kettle')) return 'coffee_maker';
    if (name.includes('fridge')) return 'kitchen';
    if (name.includes('iron')) return 'iron';
    if (name.includes('charging')) return 'bolt';
    if (name.includes('purifier')) return 'air';
    return 'power';
  }

  toggleSocket(socket: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.socketToggled.emit(socket);
  }

  getLinkQualityText(lqi: number | null | undefined): string {
    if (lqi == null) return 'N/A';
    if (lqi >= 100) return 'Good';
    if (lqi >= 50) return 'Fair';
    return 'Poor';
  }

  getSignalColor(lqi: number | null | undefined): string {
    if (lqi == null) return 'var(--t3, #5c6675)';
    if (lqi >= 100) return 'var(--ok, #34d399)';
    if (lqi >= 50) return 'var(--warn, #f5b54a)';
    return 'var(--alert, #f87171)';
  }

  trackByEntityName(index: number, item: any): string {
    return item.entityName;
  }
}
