
import { Component, Input } from '@angular/core';

/**
 * HistoricalSummaryCardComponent
 *
 * SOLID: Single Responsibility Principle - This component only handles the display of a single metric card.
 * KISS: Simple UI logic for rendering icons, labels, values, and optional subtitles.
 * DRY: This component is reused for Temperature, Humidity, CO2, and Presence.
 */
@Component({
  selector: 'revelton-historical-summary-card',
  templateUrl: './historical-summary-card.component.html',
  styleUrls: ['./historical-summary-card.component.scss'],
  standalone: false
})
export class HistoricalSummaryCardComponent {

  /**
   * Label of the metric (e.g., 'TEMPERATURE')
   */
  @Input() label: string;

  /**
   * Main value to display (e.g., '21.7')
   */
  @Input() value: string | number;

  /**
   * Unit of measurement (e.g., '°C', 'ppm', '%')
   */
  @Input() unit: string = '';

  /**
   * Subtitle text (e.g., 'Room: Living Room')
   */
  @Input() subtitle: string;

  /**
   * Material icon name or custom icon class
   */
  @Input() icon: string;

  /**
   * Optional color class for the icon background (e.g., 'temp-bg', 'hum-bg')
   */
  @Input() iconClass: string;

  constructor() {}

}
