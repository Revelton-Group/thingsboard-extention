import { Injectable } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ISensorProcessor, WindowResult } from '../../core/interfaces';
import {
  DiscoveredDevice, TimeWindow, TimelineMarker, WindowDevice, WindowEvent,
  DEFAULT_WINDOW_STATS, WindowStats,
} from '../../core/models';
import {
  WINDOW_IDENTIFIER_KEYS,
  WINDOW_KEYS,
  WINDOW_EXCLUDE_NAME_FRAGMENTS,
  WINDOW_DEVICE_COLORS,
  THERMOSTAT_IDENTIFIER_KEYS,
} from '../../core/constants';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { DataAggregationService } from '../services/data-aggregation.service';

/**
 * WindowProcessor
 *
 * SRP: Owns all window/door sensor event parsing, timeline marker calculation,
 *      and multi-device state merging.
 */
@Injectable({ providedIn: 'any' })
export class WindowProcessor implements ISensorProcessor {
  /** Shared mutable state across multiple window devices in the same room fetch cycle */
  private roomWindowStats: WindowStats = DEFAULT_WINDOW_STATS();

  constructor(
    private telemetry: ThingsBoardTelemetryService,
    private agg: DataAggregationService,
  ) {}

  /** Reset between room/time-range changes — called by the orchestrator */
  reset(): void {
    this.roomWindowStats = DEFAULT_WINDOW_STATS();
  }

  canHandle(availableKeys: string[], deviceName: string): boolean {
    const isThermostat = THERMOSTAT_IDENTIFIER_KEYS.some(k => availableKeys.includes(k));
    if (isThermostat) return false;
    const lname = deviceName.toLowerCase();
    const excluded = WINDOW_EXCLUDE_NAME_FRAGMENTS.some(f => lname.includes(f));
    if (excluded) return false;
    return WINDOW_IDENTIFIER_KEYS.some(k => availableKeys.includes(k));
  }

  process(device: DiscoveredDevice, keys: string[], tw: TimeWindow): Observable<WindowResult> {
    const fetchKeys = keys.filter(k =>
      (WINDOW_KEYS as unknown as string[]).includes(k.toLowerCase())
    );
    const effectiveKeys = fetchKeys.length > 0
      ? fetchKeys
      : [...WINDOW_IDENTIFIER_KEYS];

    return this.telemetry.getSharedOrServerAttribute(device.id, 'location').pipe(
      switchMap(locAttr => {
        const locationName = locAttr?.value ? locAttr.value : 'Window';
        const displayName = locAttr?.value ? `${locAttr.value} (${device.name})` : device.name;
        // Fetch 30 days prior to the start to accurately capture long-running open states
        const extendedStartTs = tw.startTs - (30 * 24 * 60 * 60 * 1000);
        return this.telemetry.getTimeseries(device.id, effectiveKeys, extendedStartTs, tw.endTs, tw.intervalMs).pipe(
          switchMap(ts => {
            const hasData = WINDOW_IDENTIFIER_KEYS.some(k => (ts as any)[k]?.length);
            if (hasData) {
              return of(this.parseWindowData(ts, tw, displayName, locationName));
            }
            // Fallback to latest telemetry
            return this.telemetry.getLatestTelemetry(device.id, effectiveKeys).pipe(
              map(latest => this.parseWindowData(latest, tw, displayName, locationName)),
            );
          }),
        );
      }),
      catchError(() => of({ panel: 'window' as const, stats: this.roomWindowStats })),
    );
  }

  private parseWindowData(ts: any, tw: TimeWindow, deviceName: string, locationName: string): WindowResult {
    const posKey = (['position', 'contact', 'window', 'door', 'open', 'opened', 'state'] as const)
      .find(k => ts[k]?.length);

    if (!posKey) return { panel: 'window', stats: this.roomWindowStats };

    const raw: any[] = ts[posKey].sort((a: any, b: any) => a.ts - b.ts);
    const isContactSensor = posKey === 'contact';

    const isOpen = (val: any): boolean => this.agg.isActive(val, isContactSensor);

    const latest = raw[raw.length - 1].value;
    const isCurrentOpen = isOpen(latest);
    if (isCurrentOpen) this.roomWindowStats.current = 'Open';

    // Assign color
    const colorIdx = this.roomWindowStats.devices.length;
    const color = WINDOW_DEVICE_COLORS[colorIdx % WINDOW_DEVICE_COLORS.length];
    const deviceTrack: WindowDevice = { 
      name: deviceName, 
      locationName: locationName,
      currentStatus: isCurrentOpen ? 'Open' : 'Closed',
      color, 
      markers: [] 
    };
    this.roomWindowStats.devices.push(deviceTrack);

    // Parse open events
    const windowEvents: { start: number; end: number; isOngoing?: boolean }[] = [];
    const totalDuration = tw.endTs - tw.startTs;

    if (raw.length === 1) {
      if (isOpen(raw[0].value)) windowEvents.push({ start: tw.startTs, end: tw.endTs, isOngoing: true });
    } else {
      let currentEvent: { start: number; end: number; isOngoing?: boolean } | null = null;
      raw.forEach((point: any, idx: number) => {
        const open = isOpen(point.value);
        if (open && !currentEvent) {
          currentEvent = { start: point.ts, end: tw.endTs, isOngoing: true };
        } else if (!open && currentEvent) {
          currentEvent.end = point.ts;
          currentEvent.isOngoing = false;
          windowEvents.push(currentEvent);
          currentEvent = null;
        }
        if (idx === raw.length - 1 && currentEvent) windowEvents.push(currentEvent);
      });
    }

    let openTimeTotal = 0;
    
    // Filter to only include events that overlap with the user's requested time window
    const overlappingEvents = windowEvents.filter(ev => ev.end >= tw.startTs);
    
    for (const ev of overlappingEvents) {
      const dur = ev.end - ev.start;
      openTimeTotal += dur;

      const leftPct = Math.max(0, Math.min(100, ((ev.start - tw.startTs) / totalDuration) * 100));
      const widthPct = Math.max(0.5, Math.min(100 - leftPct, (dur / totalDuration) * 100));

      const startDate = new Date(ev.start);
      const startStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
      let tooltipStr = `Opened: ${startStr}`;
      
      const isOngoing = ev.isOngoing ?? (ev.end === tw.endTs);
      if (!isOngoing) {
        const endDate = new Date(ev.end);
        const endStr = (startDate.getDate() !== endDate.getDate()) 
          ? endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
          : endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        tooltipStr += ` - ${endStr}`;
      } else {
        tooltipStr += ` (Currently Open)`;
      }

      const marker: TimelineMarker = { left: `${leftPct}%`, width: `${widthPct}%`, tooltip: tooltipStr };
      deviceTrack.markers.push(marker);

      const event: WindowEvent = { 
        name: deviceName, 
        time: ev.start, 
        endTime: ev.end,
        isOngoing: ev.isOngoing ?? (ev.end === tw.endTs),
        durationMs: dur, 
        color 
      };
      this.roomWindowStats.events.push(event);
    }

    this.roomWindowStats.eventCount += overlappingEvents.length;
    this.roomWindowStats._totalOpenTime = (this.roomWindowStats._totalOpenTime || 0) + openTimeTotal;

    const devices = this.roomWindowStats.devices;
    const combinedAvgOpen = (this.roomWindowStats._totalOpenTime / (devices.length * totalDuration)) * 100;
    this.roomWindowStats.avgOpen = Math.min(100, Math.round(combinedAvgOpen));

    if (this.roomWindowStats.eventCount > 0) {
      const avgMs = this.roomWindowStats._totalOpenTime / this.roomWindowStats.eventCount;
      const totalMinutes = Math.round(avgMs / 60_000);
      if (totalMinutes === 0) {
        this.roomWindowStats.avgDuration = '< 1m';
      } else if (totalMinutes < 60) {
        this.roomWindowStats.avgDuration = `${totalMinutes}m`;
      } else {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours < 24) {
          this.roomWindowStats.avgDuration = `${hours}h ${minutes}m`;
        } else {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          this.roomWindowStats.avgDuration = `${days}d ${remainingHours}h`;
        }
      }
    }

    if (ts.tamper?.length) {
      this.roomWindowStats.tamper = ts.tamper[ts.tamper.length - 1].value;
    }

    // Sort events newest-first for the log
    this.roomWindowStats.events.sort((a, b) => b.time - a.time);

    return { panel: 'window', stats: { ...this.roomWindowStats } };
  }
}
