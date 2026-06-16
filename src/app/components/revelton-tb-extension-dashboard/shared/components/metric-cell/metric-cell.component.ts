import { Component, Input } from '@angular/core';

@Component({
  selector: 'tb-metric-cell',
  templateUrl: './metric-cell.component.html',
  styleUrls: ['./metric-cell.component.scss'],
  standalone: false
})
export class MetricCellComponent {
  @Input() containerClass: string = '';
  @Input() dynamicClass: string = '';
  @Input() icon: string = '';
  @Input() iconClass: string = '';
  @Input() label: string = '';
  @Input() value: string = '--';
  @Input() valueClass: string = 'primary-text';
}
