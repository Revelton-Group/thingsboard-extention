import { Component } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'tb-activity-logs',
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.scss'],
  standalone: false
})
export class ActivityLogsComponent {
  activeTab: 'logs' | 'auto' = 'logs';

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }
}
