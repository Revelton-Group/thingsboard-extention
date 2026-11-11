import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DiscoveredDevice, EntityId, TelemetryMap } from '../models/telemetry.models';

/**
 * ThingsBoardTelemetryService
 *
 * DIP: Wraps the raw ThingsBoard attributeService + http cast behind a clean interface.
 * All raw `(ctx as any).http` calls are isolated here — never in the component.
 * SRP: Owns only the I/O layer to ThingsBoard APIs.
 */
@Injectable()
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

  private get attrs(): any {
    return this.attributeService;
  }

  private get httpClient(): any {
    return this.http;
  }

  /**
   * Fetches all "Contains" device relations for a given room/asset entity.
   * Returns deduplicated list of discovered devices.
   */
  getDeviceRelations(entityId: EntityId, passErrors = false): Observable<DiscoveredDevice[]> {
    const url = `/api/relations/info?fromId=${entityId.id}&fromType=${entityId.entityType}`;
    const relations$ = (this.httpClient.get(url, { ignoreErrors: true, ignoreLoading: true } as any) as Observable<any[]>).pipe(
      map((relations: any[]) => {
        const uniqueMap = new Map<string, DiscoveredDevice>();
        for (const r of (relations || [])) {
          if (r.to?.entityType === 'DEVICE' && r.type === 'Contains') {
            uniqueMap.set(r.to.id, { id: { id: r.to.id, entityType: 'DEVICE' }, name: r.toName || 'Unknown' });
          }
        }
        return Array.from(uniqueMap.values());
      }),
    );
    return passErrors ? relations$ : relations$.pipe(
      catchError(err => {
        console.error('[TelemetryService] getDeviceRelations failed:', err);
        return of([]);
      }),
    );
  }

  /**
   * Discovers the available telemetry keys for a device (lowercase).
   */
  getDeviceKeys(deviceId: EntityId): Observable<string[]> {
    const url = `/api/plugins/telemetry/DEVICE/${deviceId.id}/keys/timeseries`;
    return (this.httpClient.get(url, { ignoreErrors: true, ignoreLoading: true } as any) as Observable<string[]>).pipe(
      map((keys: string[]) => keys || []),
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
    agg: 'NONE' | 'AVG' | 'MIN' | 'MAX' | 'SUM' | 'COUNT' = 'NONE',
  ): Observable<TelemetryMap> {
    if (!keys || keys.length === 0) return of({});
    if (!this.attrs) {
      console.error('[TelemetryService] getTimeseries called before init(ctx) — no attributeService available');
      return of({});
    }
    return this.attrs.getEntityTimeseries(
      deviceId as any,
      keys,
      startTs,
      endTs,
      limit,
      agg as any,
      interval,
      'ASC' as any,
    ).pipe(
      map((ts: any) => {
        if (!ts) return {};
        const lowerTs: TelemetryMap = {};
        for (const k of Object.keys(ts)) {
          lowerTs[k.toLowerCase()] = ts[k];
        }
        return lowerTs;
      }),
      catchError(err => {
        console.error(`[TelemetryService] getTimeseries failed:`, err);
        return of({});
      })
    );
  }

  /** Runs an entity data query. Errors are passed on to the caller. */
  findEntities(query: unknown): Observable<any> {
    return this.httpClient.post('/api/entitiesQuery/find', query, { ignoreErrors: true, ignoreLoading: true } as any);
  }

  /** Raw points of several keys in `[startTs, endTs)`, oldest first. Errors are passed on, so a failed request is not mistaken for an empty range. */
  getRawTimeseries(deviceId: string, keys: string[], startTs: number, endTs: number, limit: number): Observable<TelemetryMap> {
    const url = `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`
      + `?keys=${keys.join(',')}&startTs=${startTs}&endTs=${endTs}&agg=NONE&limit=${limit}&orderBy=ASC`;
    return (this.httpClient.get(url, { ignoreErrors: true, ignoreLoading: true } as any) as Observable<TelemetryMap>).pipe(
      map(res => res || {}),
    );
  }

  /**
   * Fetches the latest telemetry values (fallback when no history exists).
   */
  getLatestTelemetry(deviceId: EntityId, keys: string[]): Observable<TelemetryMap> {
    if (!keys || keys.length === 0) return of({});
    if (!this.attrs) {
      console.error('[TelemetryService] getLatestTelemetry called before init(ctx) — no attributeService available');
      return of({});
    }
    return this.attrs.getEntityTimeseriesLatest(deviceId as any, keys).pipe(
      map((ts: any) => {
        if (!ts) return {};
        const lowerTs: TelemetryMap = {};
        for (const k of Object.keys(ts)) {
          lowerTs[k.toLowerCase()] = ts[k];
        }
        return lowerTs;
      }),
      catchError(() => of({}))
    );
  }

  /**
   * Fetches SHARED_SCOPE attributes, falling back to SERVER_SCOPE if not found.
   */
  getSharedOrServerAttribute(deviceId: EntityId, key: string): Observable<any | null> {
    return this.attrs.getEntityAttributes(deviceId as any, 'SERVER_SCOPE' as any, [key]).pipe(
      switchMap((serverAttrs: any[]) => {
        const found = serverAttrs?.find((a: any) => a.key === key);
        if (found) return of(found);
        return this.attrs.getEntityAttributes(deviceId as any, 'SHARED_SCOPE' as any, [key]).pipe(
          map((sharedAttrs: any[]) => sharedAttrs?.find((a: any) => a.key === key) ?? null)
        );
      }),
      catchError(() => of(null))
    );
  }
}
