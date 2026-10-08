import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

interface AlertView {
  alert: any;
  title: string;
  limitText: string;
  message: string;
}

interface AlertGroup {
  key: 'critical' | 'warning';
  items: AlertView[];
}

@Component({
  selector: 'tb-alerts-panel',
  templateUrl: './alerts-panel.component.html',
  styleUrls: ['./alerts-panel.component.scss'],
  standalone: false
})
export class AlertsPanelComponent implements OnChanges {
  @Input() alerts: any[] = [];
  @Input() focusId: string | null = null;
  @Output() acknowledge = new EventEmitter<any>();
  @Output() acknowledgeAll = new EventEmitter<void>();
  @Output() focusChange = new EventEmitter<any | null>();

  /** Narrow dialogs collapse the list behind the header; wide ones always show it */
  open = false;
  groups: AlertGroup[] = [];
  hasCritical = false;

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  get activeLang(): string {
    return this.translationService.activeLangCode;
  }

  ngOnChanges(): void {
    const critical: AlertView[] = [];
    const warning: AlertView[] = [];
    for (const a of this.alerts || []) {
      (a.severity === 'critical' ? critical : warning).push({ alert: a, ...this.parseAlert(a) });
    }
    this.hasCritical = critical.length > 0;
    this.groups = [];
    if (critical.length) this.groups.push({ key: 'critical', items: critical });
    if (warning.length) this.groups.push({ key: 'warning', items: warning });
  }

  trackByKey(_index: number, g: AlertGroup): string {
    return g.key;
  }

  trackByAlert(_index: number, v: AlertView): any {
    return v.alert.id;
  }

  toggleFocus(a: any): void {
    this.focusChange.emit(a.id === this.focusId ? null : a);
  }

  parseAlert(a: any) {
    let title = a.title || '';
    let limitText = '';
    let message = a.message || '';

    // Standardize title and check if there is an active limit
    const maxMatch = message.match(/\(Max:\s*([^)]+)\)/i);
    if (maxMatch) {
      limitText = `Max ${maxMatch[1]}`;
      message = message.replace(/\s*\(Max:\s*[^)]+\)/i, '').trim();
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
