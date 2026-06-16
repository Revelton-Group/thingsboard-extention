import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { FloorGroup, RoomDetails } from '../../../core/models/room.models';
import { TimeRangeKey } from '../../../core/models/time-range.models';
import { TIME_RANGE_LIST, TimeRangeOption } from '../../../core/constants/time-range.constants';

/**
 * HistoricalFilterBarComponent
 *
 * FIXED BUG: Previously mutated `this.selectedLocation` locally before emitting,
 * causing stale state on OnPush parents. Now emits only — parent owns state.
 *
 * SRP: Purely responsible for user filter interactions (location + time range).
 * OCP: New time ranges are added via TIME_RANGE_LIST constant, no code changes needed here.
 */
@Component({
  selector: 'revelton-historical-filter-bar',
  templateUrl: './historical-filter-bar.component.html',
  styleUrls: ['./historical-filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class HistoricalFilterBarComponent {

  /** Grouped room list for the sidebar */
  @Input() groupedLocations: FloorGroup[] = [];

  /** Currently selected location — controlled externally (parent owns state) */
  @Input() selectedLocation: string = '';

  /** Currently selected time range — controlled externally */
  @Input() selectedTimeRange: TimeRangeKey = '24h';

  /** Currently selected room metadata */
  @Input() selectedRoomDetails: RoomDetails;

  @Output() locationChange = new EventEmitter<string>();
  @Output() timeRangeChange = new EventEmitter<TimeRangeKey>();

  /** Driven by constants — no hardcoded array here */
  readonly timeRanges: TimeRangeOption[] = TIME_RANGE_LIST;

  onLocationSelect(location: string): void {
    // Do NOT mutate local state — emit only, parent controls state
    this.locationChange.emit(location);
  }

  onTimeRangeSelect(range: TimeRangeKey): void {
    this.timeRangeChange.emit(range);
  }
}
