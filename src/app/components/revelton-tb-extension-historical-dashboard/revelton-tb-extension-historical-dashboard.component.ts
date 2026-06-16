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

  /** Controls whether the custom date picker dropdown is visible */
  showCustomPicker = false;
  customStart = '';
  customEnd = '';

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
      if (!this.customStart) this.customStart = this.toDatetimeLocal(weekAgo);
      if (!this.customEnd) this.customEnd = this.toDatetimeLocal(now);
      this.showCustomPicker = !this.showCustomPicker;
      return;
    }
    this.showCustomPicker = false;
    this.state.setTimeRange(range);
  }

  applyCustomRange(): void {
    if (!this.customStart || !this.customEnd) return;
    const startTs = new Date(this.customStart).getTime();
    const endTs = new Date(this.customEnd).getTime();
    if (isNaN(startTs) || isNaN(endTs) || startTs >= endTs) return;
    this.showCustomPicker = false;
    this.state.setCustomTimeRange(startTs, endTs);
    this.cdr.markForCheck();
  }

  private toDatetimeLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
