import { Observable } from 'rxjs';
import { DiscoveredDevice, TimeWindow } from '../../../revelton-tb-extension-historical-dashboard/core/models/time-range.models';
import { EvChargerStats } from '../models/ev-charger.models';

/**
 * IUtilityProcessor — contract for utility device data processors.
 *
 * OCP: To add a new utility device type, implement this interface in a new class.
 *      The orchestrator loop never changes.
 */
export interface IUtilityProcessor {
  canHandle(availableKeys: string[], deviceName: string): boolean;
  process(device: DiscoveredDevice, keys: string[], timeWindow: TimeWindow): Observable<UtilityPanelResult>;
}

/** Discriminated union — add new result types when adding new utility device types */
export type UtilityPanelResult = EvChargerResult | null;

export interface EvChargerResult {
  panel: 'evCharger';
  stats: EvChargerStats;
}
