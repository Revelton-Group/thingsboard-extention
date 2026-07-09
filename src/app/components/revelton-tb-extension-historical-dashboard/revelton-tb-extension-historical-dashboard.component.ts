import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetContext } from '@home/models/widget-component.models';
import { HistoricalStateService, DashboardViewModel } from './domain/services/historical-state.service';
import { TimeRangeService } from './domain/services/time-range.service';
import { DataAggregationService } from './domain/services/data-aggregation.service';
import { ThingsBoardTelemetryService } from './data/services/thingsboard-telemetry.service';
import { ThermostatProcessor } from './domain/processors/thermostat.processor';
import { AirQualityProcessor } from './domain/processors/air-quality.processor';
import { WindowProcessor } from './domain/processors/window.processor';
import { WaterLeakProcessor } from './domain/processors/water-leak.processor';
import { NoiseProcessor } from './domain/processors/noise.processor';
import { OccupancyProcessor } from './domain/processors/occupancy.processor';
import { TimeRangeKey } from './core/models/time-range.models';
import { TIME_RANGE_LIST, TimeRangeOption } from './core/constants/time-range.constants';

/**
 * ReveltonTbExtensionHistoricalDashboardComponent
 *
 * ✅ SOLID Orchestrator — delegates ALL logic to services.
 *    Responsibilities: wire up services, bind vm$ to template, forward user events.
 *
 * From 1,709 lines → ~80 lines.
 */
@Component({
  selector: 'revelton-tb-extension-historical-dashboard',
  templateUrl: './revelton-tb-extension-historical-dashboard.component.html',
  styleUrls: ['./revelton-tb-extension-historical-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  providers: [
    // Provide all services scoped to this widget instance
    HistoricalStateService,
    TimeRangeService,
    DataAggregationService,
    ThingsBoardTelemetryService,
    ThermostatProcessor,
    AirQualityProcessor,
    WindowProcessor,
    WaterLeakProcessor,
    NoiseProcessor,
    OccupancyProcessor,
  ],
})
export class ReveltonTbExtensionHistoricalDashboardComponent implements OnInit, OnDestroy {
  @Input() ctx: WidgetContext;

  private readonly destroy$ = new Subject<void>();

  /** Single view model stream — the template binds everything from here */
  vm: DashboardViewModel;

  /** Time range options exposed to template — driven by constants (no hardcoded arrays) */
  readonly timeRangeOptions: TimeRangeOption[] = TIME_RANGE_LIST;

  showCustomPicker = false;
  customStart = '';
  customEnd = '';
  appliedCustomStart = '';
  appliedCustomEnd = '';

  get hasCustomRangeChanged(): boolean {
    const startTs = this.parseDateStr(this.customStart);
    const endTs = this.parseDateStr(this.customEnd);
    if (!startTs || !endTs || startTs >= endTs) return false;
    return this.customStart !== this.appliedCustomStart || this.customEnd !== this.appliedCustomEnd;
  }

  cleanDate(str: string): string {
    if (!str) return '';
    const parts = str.split(/[-\s/:]+/);
    if (parts.length >= 5) {
      let y = parseInt(parts[2], 10) || new Date().getFullYear();
      if (y < 100) y += 2000;
      let m = parseInt(parts[1], 10) || 1;
      if (m < 1) m = 1; else if (m > 12) m = 12;
      let d = parseInt(parts[0], 10) || 1;
      if (d < 1) d = 1; else if (d > 31) d = 31;
      let h = parseInt(parts[3], 10) || 0;
      if (h < 0) h = 0; else if (h > 23) h = 23;
      let min = parseInt(parts[4], 10) || 0;
      if (min < 0) min = 0; else if (min > 59) min = 59;
      return `${d.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${y} ${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }
    return str;
  }

  formatDateStr(d: Date): string {
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  parseDateStr(str: string): number {
    const parts = (str || '').split(/[-\s/:]+/);
    if (parts.length >= 5) {
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[0], 10);
      const h = parseInt(parts[3], 10);
      const min = parseInt(parts[4], 10);
      if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h) || isNaN(min)) return 0;
      return new Date(y, m, d, h, min).getTime();
    }
    return 0;
  }

  constructor(
    private state: HistoricalStateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.ctx) return;
    this.state.viewModel$.pipe(takeUntil(this.destroy$)).subscribe(vm => {
      this.vm = vm;
      this.cdr.markForCheck();
    });
    this.state.init(this.ctx);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── User Event Handlers (thin pass-throughs only) ──────────────────────────

  onLocationChange(location: string): void {
    this.state.setLocation(location);
  }

  onTimeRangeChange(range: TimeRangeKey): void {
    if (range === 'custom') {
      // Pre-fill with current range bounds
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (!this.customStart) this.customStart = this.formatDateStr(weekAgo);
      if (!this.customEnd) this.customEnd = this.formatDateStr(now);
      this.showCustomPicker = !this.showCustomPicker;
      return;
    }
    this.showCustomPicker = false;
    this.state.setTimeRange(range);
  }

  applyCustomRange(): void {
    if (!this.customStart || !this.customEnd || !this.hasCustomRangeChanged) return;
    const startTs = this.parseDateStr(this.customStart);
    const endTs = this.parseDateStr(this.customEnd);
    if (!startTs || !endTs || startTs >= endTs) return;
    this.appliedCustomStart = this.customStart;
    this.appliedCustomEnd = this.customEnd;
    this.showCustomPicker = false;
    this.state.setCustomTimeRange(startTs, endTs);
    this.cdr.markForCheck();
  }



  toggleTheme(): void {
    this.state.toggleTheme();
  }

  toggleFullscreen(): void {
    const container = (this.ctx as any)?.$container;
    const el: HTMLElement = container?.[0] ?? document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch((err: Error) => console.warn('Fullscreen error:', err.message));
    } else {
      document.exitFullscreen();
    }
  }
}
