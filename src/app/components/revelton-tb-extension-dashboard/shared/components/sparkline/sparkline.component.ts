import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'tb-sparkline',
  template: `
    <svg class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" style="width: 100%; height: 40px; overflow: visible;">
      <defs>
        <linearGradient [id]="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.25"></stop>
          <stop offset="100%" [attr.stop-color]="color" stop-opacity="0.00"></stop>
        </linearGradient>
      </defs>
      <path [attr.d]="fillPath" [attr.fill]="'url(#' + gradientId + ')'" stroke="none"></path>
      <path [attr.d]="linePath" fill="none" [attr.stroke]="color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .sparkline {
      display: block;
    }
  `],
  standalone: false
})
export class SparklineComponent implements OnChanges {
  @Input() data: number[] = [];
  @Input() color: string = '#5c7cfa';
  @Input() id: string = '';

  linePath: string = '';
  fillPath: string = '';
  gradientId: string = 'spark-grad';

  ngOnChanges(changes: SimpleChanges): void {
    this.gradientId = 'spark-grad-' + this.id;
    this.generatePaths();
  }

  private generatePaths(): void {
    if (!this.data || this.data.length < 2) {
      this.linePath = '';
      this.fillPath = '';
      return;
    }

    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min === 0 ? 1 : max - min;

    const width = 100;
    const height = 28; // Leave a tiny margin at top/bottom (1px each)
    const topMargin = 1;

    const points = this.data.map((val, index) => {
      const x = (index / (this.data.length - 1)) * width;
      const y = height - ((val - min) / range) * height + topMargin;
      return { x, y };
    });

    // Generate line path
    this.linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    // Generate fill path (closed to bottom)
    this.fillPath = `${this.linePath} L 100 30 L 0 30 Z`;
  }
}
