import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DiscoveredDevice, EntityId, TelemetryMap } from '../../core/models/time-range.models';

/**
 * ThingsBoardTelemetryService
 *
 * DIP: Wraps the raw ThingsBoard attributeService + http cast behind a clean interface.
 * All raw `(ctx as any).http` calls are isolated here — never in the component.
 * SRP: Owns only the I/O layer to ThingsBoard APIs.
 */
@Injectable({ providedIn: 'any' })
export class ThingsBoardTelemetryService {
  private attributeService: any;
  private http: any;

  /**
   * Must be called once after the ThingsBoard ctx is available.
   * Follows the ThingsBoard widget lifecycle pattern.
   */
  init(ctx: any): void {
    this.attributeService = ctx.attributeService;
    this.http = (ctx as any).http;
  }

  /**
   * Fetches all "Contains" device relations for a given room/asset entity.
   * Returns deduplicated list of discovered devices.
   */
  getDeviceRelations(entityId: EntityId): Observable<DiscoveredDevice[]> {
    const url = `/api/relations/info?fromId=${entityId.id}&fromType=${entityId.entityType}`;
    return (this.http.get(url) as Observable<any[]>).pipe(
      map((relations: any[]) => {
        const uniqueMap = new Map<string, DiscoveredDevice>();
        for (const r of (relations || [])) {
          if (r.to?.entityType === 'DEVICE' && r.type === 'Contains') {
            uniqueMap.set(r.to.id, { id: { id: r.to.id, entityType: 'DEVICE' }, name: r.toName || 'Unknown' });
          }
        }
        return Array.from(uniqueMap.values());
      }),
      catchError(err => {
        console.error('[TelemetryService] getDeviceRelations failed:', err);
        return of([]);
      })
    );
  }

  /**
   * Discovers the available telemetry keys for a device (lowercase).
   */
  getDeviceKeys(deviceId: EntityId): Observable<string[]> {
    const url = `/api/plugins/telemetry/DEVICE/${deviceId.id}/keys/timeseries`;
    return (this.http.get(url) as Observable<string[]>).pipe(
      map((keys: string[]) => (keys || []).map(k => k.toLowerCase())),
      catchError(err => {
        console.error(`[TelemetryService] getDeviceKeys failed for ${deviceId.id}:`, err);
        return of([]);
      })
    );
  }

  /**
   * Fetches historical timeseries for a device with NONE aggregation (raw points).
   */
  getTimeseries(
    deviceId: EntityId,
    keys: string[],
    startTs: number,
    endTs: number,
    interval: number,
    limit = 50_000,
  ): Observable<TelemetryMap> {
    if (!keys || keys.length === 0) return of({});
    return this.attributeService.getEntityTimeseries(
      deviceId as any,
      keys,
      startTs,
      endTs,
      limit,
      'NONE' as any,
      interval,
      'ASC' as any,
    ).pipe(
      map((ts: any) => (ts as TelemetryMap) || {}),
      catchError(err => {
        console.error(`[TelemetryService] getTimeseries failed:`, err);
        return of({});
      })
    );
  }

  /**
   * Fetches the latest telemetry values (fallback when no history exists).
   */
  getLatestTelemetry(deviceId: EntityId, keys: string[]): Observable<TelemetryMap> {
    if (!keys || keys.length === 0) return of({});
    return this.attributeService.getEntityTimeseriesLatest(deviceId as any, keys).pipe(
      map((ts: any) => (ts as TelemetryMap) || {}),
      catchError(() => of({}))
    );
  }

  /**
   * Fetches SHARED_SCOPE attributes, falling back to SERVER_SCOPE if not found.
   */
  getSharedOrServerAttribute(deviceId: EntityId, key: string): Observable<any | null> {
    return this.attributeService.getEntityAttributes(deviceId as any, 'SERVER_SCOPE' as any, [key]).pipe(
      switchMap((serverAttrs: any[]) => {
        const found = serverAttrs?.find((a: any) => a.key === key);
        if (found) return of(found);
        return this.attributeService.getEntityAttributes(deviceId as any, 'SHARED_SCOPE' as any, [key]).pipe(
          map((sharedAttrs: any[]) => sharedAttrs?.find((a: any) => a.key === key) ?? null)
        );
      }),
      catchError(() => of(null))
    );
  }
}
