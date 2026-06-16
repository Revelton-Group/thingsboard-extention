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
  @Output() acknowledge = new EventEmitter<any>();

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  trackById(index: number, item: any): any {
    return item.id || index;
  }

  onAcknowledge(alert: any) {
    this.acknowledge.emit(alert);
  }
}
