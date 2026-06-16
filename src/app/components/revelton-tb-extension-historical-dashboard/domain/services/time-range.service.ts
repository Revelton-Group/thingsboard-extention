import { Injectable } from '@angular/core';
import { TimeRangeKey, TimeWindow } from '../../core/models/time-range.models';
import { TIME_RANGE_OPTIONS, TimeRangeOption } from '../../core/constants/time-range.constants';

/**
 * TimeRangeService
 *
 * SRP: Owns all time-range resolution logic.
 * OCP: Adding a new range = adding a new entry to TIME_RANGE_OPTIONS constant.
 * Pure — no side effects, fully unit-testable.
 */
@Injectable({ providedIn: 'any' })
export class TimeRangeService {

  private customWindow: TimeWindow | null = null;

  getOption(key: TimeRangeKey): TimeRangeOption {
    return TIME_RANGE_OPTIONS[key];
  }

  setCustomWindow(window: TimeWindow): void {
    this.customWindow = window;
  }

  /**
   * Resolves a complete TimeWindow for an API fetch call.
   */
  resolveWindow(key: TimeRangeKey): TimeWindow {
    if (key === 'custom' && this.customWindow) {
      return this.customWindow;
    }
    const option = this.getOption(key);
    const endTs = Date.now();
    return {
      startTs: endTs - option.durationMs,
      endTs,
      intervalMs: option.intervalMs,
      durationMs: option.durationMs,
    };
  }

  getDurationMs(key: TimeRangeKey): number {
    return TIME_RANGE_OPTIONS[key].durationMs;
  }

  getIntervalMs(key: TimeRangeKey): number {
    return TIME_RANGE_OPTIONS[key].intervalMs;
  }

  getAggregationLabel(key: TimeRangeKey): string {
    return TIME_RANGE_OPTIONS[key].aggregationLabel;
  }

  getStartLabel(key: TimeRangeKey): string {
    return TIME_RANGE_OPTIONS[key].startLabel;
  }
}
