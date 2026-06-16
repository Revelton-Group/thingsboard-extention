/**
 * Time range configuration constants.
 * Single source of truth for durations, intervals, and display labels.
 */
import { TimeRangeKey } from '../models';

export interface TimeRangeOption {
  key: TimeRangeKey;
  /** Label shown in the time-range button strip */
  buttonLabel: string;
  /** Label for the start of timeline (e.g. "24h ago") */
  startLabel: string;
  /** Duration of the window in milliseconds */
  durationMs: number;
  /** Aggregation interval in milliseconds targeting ~24-30 data points */
  intervalMs: number;
  /** Short human-readable aggregation label */
  aggregationLabel: string;
}

export const TIME_RANGE_OPTIONS: Record<TimeRangeKey, TimeRangeOption> = {
  '24h': {
    key: '24h',
    buttonLabel: 'Last Day',
    startLabel: '24h ago',
    durationMs: 86_400_000,          // 24 h
    intervalMs: 900_000,             // 15 min → 96 pts
    aggregationLabel: '15m avg',
  },
  '7d': {
    key: '7d',
    buttonLabel: '7 Days',
    startLabel: '7 Days ago',
    durationMs: 86_400_000 * 7,      // 7 d
    intervalMs: 3_600_000,           // 1 h  → 168 pts
    aggregationLabel: '1h avg',
  },
  '30d': {
    key: '30d',
    buttonLabel: 'Month',
    startLabel: '1 Month ago',
    durationMs: 86_400_000 * 30,     // 30 d
    intervalMs: 3_600_000 * 6,       // 6 h  → 120 pts
    aggregationLabel: '6h avg',
  },
  'custom': {
    key: 'custom',
    buttonLabel: 'Custom',
    startLabel: 'Custom range',
    durationMs: 0,
    intervalMs: 3_600_000,
    aggregationLabel: 'Custom avg',
  },
};

export const DEFAULT_TIME_RANGE: TimeRangeKey = '24h';

/** Ordered list for rendering the button strip */
export const TIME_RANGE_LIST: TimeRangeOption[] = [
  TIME_RANGE_OPTIONS['24h'],
  TIME_RANGE_OPTIONS['7d'],
  TIME_RANGE_OPTIONS['30d'],
  TIME_RANGE_OPTIONS['custom'],
];
