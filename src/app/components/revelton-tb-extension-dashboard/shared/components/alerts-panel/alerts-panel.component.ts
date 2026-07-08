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

  parseAlert(a: any) {
    let title = a.title || '';
    let limitText = '';
    let message = a.message || '';

    // Standardize title and check if there is an active limit
    const maxMatch = message.match(/\(Max:\s*([^\)]+)\)/i);
    if (maxMatch) {
      limitText = `Max ${maxMatch[1]}`;
      message = message.replace(/\s*\(Max:\s*[^\)]+\)/i, '').trim();
    }
    
    // Format message separator
    message = message.replace(/is high:\s*/i, 'is high - ');
    message = message.replace(/level is high:\s*/i, 'level is high - ');
    message = message.replace(/exceeded:\s*/i, 'exceeded - ');

    if (title === 'Temperature' || title === 'Температура') {
      title = this.activeLang === 'RU' ? 'Температура' : 'Temperature';
    } else if (title === 'Humidity' || title === 'Влажность') {
      title = this.activeLang === 'RU' ? 'Влажность' : 'Humidity';
    } else if (title === 'PM2.5') {
      const valMatch = message.match(/high\s*-\s*([^\s]+)/i);
      const val = valMatch ? valMatch[1] : '';
      message = `PM2.5 Limit · ${val} µg/m³`;
    } else if (title.toLowerCase().includes('noise') || title.toLowerCase().includes('звук') || title.toLowerCase().includes('шум')) {
      title = this.activeLang === 'RU' ? 'Уровень шума' : 'Acoustic noise levels';
      message = this.activeLang === 'RU' 
        ? 'Предупреждение при превышении допустимого уровня звука'
        : 'Warn when continuous sound exceeds the limit';
    }

    return { title, limitText, message };
  }
}
