import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-alerts-panel',
  templateUrl: './alerts-panel.component.html',
  styleUrls: ['./alerts-panel.component.scss'],
  standalone: false
})
export class AlertsPanelComponent {
  @Input() alerts: any[] = [];
  @Input() archivedAlerts: any[] = [];
  @Output() acknowledge = new EventEmitter<any>();

  activeTab: 'active' | 'archive' = 'active';

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  get activeLang(): string {
    return this.translationService.activeLangCode;
  }

  trackById(index: number, item: any): any {
    return item.id || index;
  }

  onAcknowledge(alert: any) {
    this.acknowledge.emit(alert);
  }
}
