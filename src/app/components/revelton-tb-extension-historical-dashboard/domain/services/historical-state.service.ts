import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil, tap, catchError, map, take } from 'rxjs/operators';
import {
  ThermostatStats, AirQualityStats, WindowStats, WaterLeakStats,
  NoiseStats, OccupancyStats, FloorGroup, RoomDetails, Room,
  DEFAULT_THERMOSTAT_STATS, DEFAULT_AIR_QUALITY_STATS, DEFAULT_WINDOW_STATS,
  DEFAULT_WATER_LEAK_STATS, DEFAULT_NOISE_STATS, DEFAULT_OCCUPANCY_STATS,
  DEFAULT_ROOM_DETAILS, EMPTY_AIR_QUALITY_CHART, AirQualityChartData,
  ChartSeries, TimeRangeKey, EntityId, TimeWindow,
} from '../../core/models';
import { DEFAULT_TIME_RANGE } from '../../core/constants';
import { TimeRangeService } from './time-range.service';
import { ThingsBoardTelemetryService } from '../../data/services/thingsboard-telemetry.service';
import { ThermostatProcessor } from '../processors/thermostat.processor';
import { AirQualityProcessor } from '../processors/air-quality.processor';
import { WindowProcessor } from '../processors/window.processor';
import { WaterLeakProcessor } from '../processors/water-leak.processor';
import { NoiseProcessor } from '../processors/noise.processor';
import { OccupancyProcessor } from '../processors/occupancy.processor';
import { SensorPanelResult } from '../../core/interfaces';

/** Complete view model snapshot delivered to the template via `vm$` */
export interface DashboardViewModel {
  isLoading: boolean;
  isLightMode: boolean;
  selectedLocation: string;
  selectedTimeRange: TimeRangeKey;
  availableLocations: string[];
  groupedLocations: FloorGroup[];
  selectedRoomDetails: RoomDetails;
  // Panel data
  thermostatStats: ThermostatStats;
  thermostatChartData: ChartSeries[];
  airQualityStats: AirQualityStats;
  airQualityChart: AirQualityChartData;
  windowStats: WindowStats;
  waterLeakStats: WaterLeakStats;
  waterLeakChartData: ChartSeries[];
  noiseStats: NoiseStats;
  noiseChartData: ChartSeries[];
  occupancyStats: OccupancyStats;
  occupancyChartData: ChartSeries[];
  /** Injected room temperature from env sensor (shared between AQ + Thermostat) */
  roomTempSeries: ChartSeries | null;
}

const DEFAULT_VM = (): DashboardViewModel => ({
  isLoading: true,
  isLightMode: false,
  selectedLocation: '',
  selectedTimeRange: DEFAULT_TIME_RANGE,
  availableLocations: [],
  groupedLocations: [],
  selectedRoomDetails: DEFAULT_ROOM_DETAILS(),
  thermostatStats: DEFAULT_THERMOSTAT_STATS(),
  thermostatChartData: [],
  airQualityStats: DEFAULT_AIR_QUALITY_STATS(),
  airQualityChart: EMPTY_AIR_QUALITY_CHART(),
  windowStats: DEFAULT_WINDOW_STATS(),
  waterLeakStats: DEFAULT_WATER_LEAK_STATS(),
  waterLeakChartData: [],
  noiseStats: DEFAULT_NOISE_STATS(),
  noiseChartData: [],
  occupancyStats: DEFAULT_OCCUPANCY_STATS(),
  occupancyChartData: [],
  roomTempSeries: null,
});

/**
 * HistoricalStateService
 *
 * SRP: Owns the complete dashboard state and coordinates all data fetches.
 * DIP: Depends on processor abstractions, not concrete ThingsBoard APIs.
 * Replaces all state properties + fetch logic from the 1,709-line God Component.
 */
@Injectable({ providedIn: 'any' })
export class HistoricalStateService implements OnDestroy {
  private readonly _vm$ = new BehaviorSubject<DashboardViewModel>(DEFAULT_VM());
  /** Observable that the template binds via `vm$ | async` */
  readonly viewModel$ = this._vm$.asObservable();

  private readonly destroy$ = new Subject<void>();
  /** Triggers a new fetch on every emission (location change, time range change) */
  private readonly fetchTrigger$ = new Subject<void>();

  private ctx: any;

  constructor(
    private timeRangeService: TimeRangeService,
    private telemetry: ThingsBoardTelemetryService,
    private thermostatProc: ThermostatProcessor,
    private airQualityProc: AirQualityProcessor,
    private windowProc: WindowProcessor,
    private waterLeakProc: WaterLeakProcessor,
    private noiseProc: NoiseProcessor,
    private occupancyProc: OccupancyProcessor,
  ) {
    this.setupFetchPipeline();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Called once from the widget component's ngOnInit */
  init(ctx: any): void {
    this.ctx = ctx;
    this.telemetry.init(ctx);

    if (ctx.defaultSubscription) {
      ctx.defaultSubscription.options.callbacks.onDataUpdated = () => this.onThingsBoardDataUpdated();
    }
    this.onThingsBoardDataUpdated();
  }

  setLocation(location: string): void {
    const vm = this._vm$.value;
    this.patch({
      selectedLocation: location,
      selectedRoomDetails: this.resolveRoomDetails(location, vm.groupedLocations),
    });
    this.triggerFetch();
  }

  setTimeRange(range: TimeRangeKey): void {
    this.patch({ selectedTimeRange: range, isLoading: true });
    this.triggerFetch();
    if (this.ctx?.timewindowFunctions) {
      const tw = this.timeRangeService.resolveWindow(range);
      this.ctx.timewindowFunctions.onUpdateTimewindow(tw.startTs, tw.endTs);
    }
  }

  setCustomTimeRange(startTs: number, endTs: number): void {
    const durationMs = endTs - startTs;
    // Pick a smart interval: aim for ~30 data points
    const intervalMs = this.calcSmartInterval(durationMs);
    const customTw: TimeWindow = { startTs, endTs, durationMs, intervalMs };
    this.timeRangeService.setCustomWindow(customTw);
    this.patch({ selectedTimeRange: 'custom', isLoading: true });
    this.triggerFetch();
    if (this.ctx?.timewindowFunctions) {
      this.ctx.timewindowFunctions.onUpdateTimewindow(startTs, endTs);
    }
  }

  private calcSmartInterval(durationMs: number): number {
    const MIN15 = 900_000;
    const HOUR  = 3_600_000;
    const DAY   = 86_400_000;
    if (durationMs <= DAY)           return MIN15;        // 15 min → up to 96 pts
    if (durationMs <= DAY * 3)       return HOUR;         // 1 h   → up to 72 pts
    if (durationMs <= DAY * 14)      return HOUR * 3;     // 3 h   → up to 112 pts
    if (durationMs <= DAY * 30)      return HOUR * 6;     // 6 h   → up to 120 pts
    return DAY;                                            // 1 d   → long ranges
  }

  toggleTheme(): void {
    const isLightMode = !this._vm$.value.isLightMode;
    this.patch({ isLightMode });
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private onThingsBoardDataUpdated(): void {
    const data: any[] = this.ctx?.data || [];
    const { locations, grouped } = this.extractLocations(data);

    const vm = this._vm$.value;
    let selectedLocation = vm.selectedLocation;
    if (!selectedLocation || !locations.includes(selectedLocation)) {
      selectedLocation = locations[0] || '';
    }

    this.patch({
      availableLocations: locations,
      groupedLocations: grouped,
      selectedLocation,
      selectedRoomDetails: this.resolveRoomDetails(selectedLocation, grouped),
      isLoading: false,
    });

    this.triggerFetch();
  }

  /** RxJS pipeline: switchMap cancels any in-flight fetch when a new trigger arrives */
  private setupFetchPipeline(): void {
    this.fetchTrigger$.pipe(
      switchMap(() => this.runFetch()),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  private triggerFetch(): void {
    this.fetchTrigger$.next();
  }

  private runFetch() {
    const vm = this._vm$.value;
    if (!vm.selectedLocation || !this.ctx?.attributeService) return of(null);

    const data: any[] = this.ctx.data || [];
    const selectedItem = data.find((item: any) => {
      const name = item.datasource?.entityName || item.datasource?.name
        || item.datasource?.entityLabel || item.datasource?.aliasName;
      return name === vm.selectedLocation;
    });

    if (!selectedItem?.datasource?.entityId) {
      console.warn('[HistoricalState] No entityId for', vm.selectedLocation);
      return of(null);
    }

    const roomId: EntityId = {
      id: selectedItem.datasource.entityId,
      entityType: selectedItem.datasource.entityType || 'ASSET',
    };
    const tw = this.timeRangeService.resolveWindow(vm.selectedTimeRange);

    // Reset panels before new fetch
    this.patch({
      isLoading: true,
      thermostatStats: DEFAULT_THERMOSTAT_STATS(),
      thermostatChartData: [],
      airQualityStats: DEFAULT_AIR_QUALITY_STATS(),
      airQualityChart: EMPTY_AIR_QUALITY_CHART(),
      windowStats: DEFAULT_WINDOW_STATS(),
      waterLeakStats: DEFAULT_WATER_LEAK_STATS(),
      waterLeakChartData: [],
      noiseStats: DEFAULT_NOISE_STATS(),
      noiseChartData: [],
      occupancyStats: DEFAULT_OCCUPANCY_STATS(),
      occupancyChartData: [],
    });
    this.windowProc.reset();

    return this.telemetry.getDeviceRelations(roomId).pipe(
      switchMap(devices => {
        if (devices.length === 0) {
          this.patch({ isLoading: false });
          return of([]);
        }

        // For each device: discover keys → pick processor(s) → fetch & process
        const deviceFetches = devices.map(device =>
          this.telemetry.getDeviceKeys(device.id).pipe(
            switchMap(rawKeys => {
              const lowerKeys = rawKeys.map((k: string) => k.toLowerCase());
              const processors = [
                this.thermostatProc, this.airQualityProc, this.windowProc,
                this.waterLeakProc, this.noiseProc, this.occupancyProc,
              ];
              const matchedProcessors = processors.filter(p => p.canHandle(lowerKeys, device.name));
              if (matchedProcessors.length === 0) {
                console.warn(`[HistoricalState] ⚠️ Unrecognized sensor: ${device.name}`, rawKeys);
                return of([]);
              }
              const obs = matchedProcessors.map(p => p.process(device, rawKeys, tw));
              return forkJoin(obs);
            }),
            catchError(() => of([]))
          )
        );

        return forkJoin(deviceFetches).pipe(
          tap(results => {
            const flatResults = (results || []).reduce((acc, val) => acc.concat(val || []), []);
            for (const result of flatResults) {
              if (result) this.applyResult(result as SensorPanelResult);
            }
            this.injectRoomTempIntoThermostatIfNeeded();
            this.patch({ isLoading: false });
            if (this.ctx?.detectChanges) this.ctx.detectChanges();
          }),
        );
      }),
      catchError(err => {
        console.error('[HistoricalState] fetch pipeline error:', err);
        this.patch({ isLoading: false });
        return of(null);
      }),
    );
  }

  /** Routes a processor result to the correct state slice */
  private applyResult(result: SensorPanelResult): void {
    switch (result.panel) {
      case 'thermostat':
        this.patch({ thermostatStats: result.stats, thermostatChartData: result.chartData });
        break;
      case 'airQuality':
        this.patch({
          airQualityStats: result.stats,
          airQualityChart: result.chartData as AirQualityChartData,
          // Cache room temp for thermostat fallback
          roomTempSeries: (result.chartData as AirQualityChartData).combined?.find(
            s => s.name.toLowerCase().includes('temp')
          ) ?? null,
        });
        break;
      case 'window':
        this.patch({ windowStats: result.stats });
        break;
      case 'waterLeak':
        this.patch({ waterLeakStats: result.stats, waterLeakChartData: result.chartData });
        break;
      case 'noise':
        this.patch({ noiseStats: result.stats, noiseChartData: result.chartData });
        break;
      case 'occupancy':
        this.patch({ occupancyStats: result.stats, occupancyChartData: result.chartData });
        break;
    }
  }

  /**
   * If thermostat chart has no temp line (TRV without built-in sensor),
   * inject the room temperature series captured from the env/AQ sensor.
   */
  private injectRoomTempIntoThermostatIfNeeded(): void {
    const vm = this._vm$.value;
    if (!vm.roomTempSeries) return;
    const hasOwnTemp = vm.thermostatChartData.some(
      s => s.name === 'Current Temp' && !(s as any)._fromEnvSensor
    );
    if (hasOwnTemp) return;

    const tempSeries = { ...vm.roomTempSeries, name: 'Current Temp', _fromEnvSensor: true } as any;
    const existing = vm.thermostatChartData.filter(s => s.name !== 'Current Temp');
    this.patch({ thermostatChartData: [tempSeries, ...existing] });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private patch(partial: Partial<DashboardViewModel>): void {
    this._vm$.next({ ...this._vm$.value, ...partial });
  }

  private extractLocations(data: any[]): { locations: string[]; grouped: FloorGroup[] } {
    const locationsSet = new Set<string>();
    for (const item of data) {
      const name = item.datasource?.entityName || item.datasource?.name
        || item.datasource?.entityLabel || item.datasource?.aliasName;
      if (name) locationsSet.add(name);
    }

    const locations = Array.from(locationsSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    const floorMap = new Map<string, Room[]>();
    locations.forEach((loc, index) => {
      const match = loc.match(/\d+/);
      let floorNum = match ? Math.floor(parseInt(match[0], 10) / 100) : 1;
      if (floorNum <= 0 || isNaN(floorNum)) floorNum = 1;
      const floorName = `Floor ${floorNum}F`;
      if (!floorMap.has(floorName)) floorMap.set(floorName, []);
      const type: Room['type'] = index % 3 === 0 ? 'Suite' : index % 2 === 0 ? 'Deluxe' : 'Standard';
      floorMap.get(floorName)!.push({ name: loc, type });
    });

    const grouped: FloorGroup[] = Array.from(floorMap.entries()).map(([floor, rooms]) => ({ floor, rooms }));
    return { locations, grouped };
  }

  private resolveRoomDetails(location: string, grouped: FloorGroup[]): RoomDetails {
    for (const group of grouped) {
      const room = group.rooms.find(r => r.name === location);
      if (room) return { name: room.name, floor: group.floor, type: room.type };
    }
    return { name: location, floor: 'Unknown', type: 'Standard' };
  }
}
