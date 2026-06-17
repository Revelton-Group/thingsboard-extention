import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

interface MetricTab {
  key: string;
  label: string;
  unit: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'tb-room-historical-data',
  templateUrl: './room-historical-data.component.html',
  styleUrls: ['./room-historical-data.component.scss'],
  standalone: false
})
export class RoomHistoricalDataComponent implements OnInit, OnChanges {
  @Input() ctx: any;
  @Input() deviceEntityIdMap: Record<string, string> = {};
  @Input() thermostats: any[] = [];
  @Input() aqSensors: any[] = [];
  @Input() tempDevices: Record<string, any> = {};
  @Input() humDevices: Record<string, any> = {};
  @Input() windowDevices: Record<string, any> = {};
  @Input() leakDevices: Record<string, any> = {};
  @Input() noiseDevices: Record<string, any> = {};
  @Input() checkedIn: boolean = false;
  @Input() timeRangeHours: number = 24;

  loading = false;
  error: string | null = null;

  // Summary stats (latest values)
  stats: Record<string, any> = {};
  
  // Custom stats for the new panels
  noiseStats: any = { current: 0, min: 0, avg: 0, peak: 0 };
  windowStats: any = { current: 'Closed', avgOpen: 0, tamper: 'None', eventCount: 0, avgDuration: '0m', events: [], devices: [] };
  waterLeakStats: any = { current: 'No Leak', events: 0 };
  occupancyStats: any = { current: 'Unoccupied', avg: 0, checkedIn: 'No' };

  // Chart data per metric key
  chartDataMap: Record<string, [number, number][]> = {};
  noiseChartData: any[] = [];
  waterLeakChartData: any[] = [];
  occupancyChartData: any[] = [];

  // Active tab
  selectedKey = 'co2';

  allTabs: MetricTab[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
  ) {}

  get t() { return this.translationService.t; }

  ngOnInit() {
    this.initTabs();
    this.fetchData();
  }

  private initTabs() {
    this.allTabs = [
      { key: 'co2',         label: 'CO₂',          unit: this.t.histUnitPpm,   color: 'var(--purple)', icon: 'co2'        },
      { key: 'tvoc',        label: 'TVOC',         unit: this.t.histUnitPpb,   color: 'var(--green)', icon: 'science'    },
      { key: 'pm25',        label: 'PM2.5',        unit: this.t.histUnitUgM3, color: 'var(--orange)', icon: 'grain'      },
      { key: 'iaq',         label: 'AQI',          unit: '',      color: 'var(--yellow)', icon: 'air'        },
    ];
  }

  trackByTab(index: number, tab: MetricTab) {
    return tab.key;
  }

  ngOnChanges(changes: SimpleChanges) {
    const mapChange = changes['deviceEntityIdMap'];
    const timeChange = changes['timeRangeHours'];
    
    if ((mapChange && !mapChange.firstChange && JSON.stringify(mapChange.currentValue) !== JSON.stringify(mapChange.previousValue)) ||
        (timeChange && !timeChange.firstChange)) {
      this.fetchData();
    }
  }

  setTimeRange(hours: number) {
    if (this.timeRangeHours === hours) return;
    this.timeRangeHours = hours;
    this.fetchData();
  }

  selectTab(key: string) {
    this.selectedKey = key;
    this.cdr.detectChanges();
  }

  get activeTab(): MetricTab {
    return this.allTabs.find(t => t.key === this.selectedKey) ?? this.allTabs[0];
  }

  get activeChartData(): any[] {
    const vals = this.chartDataMap[this.selectedKey];
    if (!vals?.length) return [];
    return [{ name: this.activeTab.label, values: vals }];
  }

  /** Combined Temperature + Humidity for the dual-axis chart */
  get combinedChartData(): any[] {
    const series: any[] = [];
    const tempVals = this.chartDataMap['temperature'];
    if (tempVals?.length) {
      series.push({ name: this.t.histTemp + ' (' + this.t.histUnitC + ')', values: tempVals });
    }
    const humVals = this.chartDataMap['humidity'];
    if (humVals?.length) {
      series.push({ name: this.t.histHumidity + ' (' + this.t.histUnitPercent + ')', values: humVals });
    }
    return series;
  }

  get currentValue(): string {
    const vals = this.chartDataMap[this.selectedKey];
    if (!vals?.length) return '0';
    const last = vals[vals.length - 1][1];
    return last != null ? String(Math.round(last * 10) / 10) : '0';
  }

  get currentValueNum(): number {
    const vals = this.chartDataMap[this.selectedKey];
    if (!vals?.length) return 0;
    const last = vals[vals.length - 1][1];
    return last != null ? Math.round(last * 10) / 10 : 0;
  }

  get safeMax(): { value: number; label: string } {
    switch (this.selectedKey) {
      case 'co2':  return { value: 1000, label: 'Safe max: 1000ppm' };
      case 'tvoc': return { value: 500,  label: 'Safe max: 500ppb' };
      case 'pm25': return { value: 25,   label: 'Safe max: 25µg/m³' };
      case 'iaq':  return { value: 100,  label: 'Safe max: AQI 100' };
      default:     return { value: 1000, label: 'Safe max: 1000ppm' };
    }
  }

  get gaugePercent(): number {
    if (this.safeMax.value <= 0) return 0;
    return Math.min(100, Math.round((this.currentValueNum / this.safeMax.value) * 100));
  }

  get gaugeColor(): string {
    if (this.gaugePercent <= 30) return '#22C55E';
    if (this.gaugePercent <= 60) return '#F97316';
    return '#EF4444';
  }

  get statusLabel(): { text: string; cssClass: string } {
    if (this.gaugePercent <= 30) return { text: 'GOOD — within safe limits', cssClass: 'good' };
    if (this.gaugePercent <= 60) return { text: 'MODERATE — approaching limits', cssClass: 'moderate' };
    return { text: 'POOR — exceeds safe limits', cssClass: 'bad' };
  }

  async fetchData() {
    const http = this.ctx?.http;
    if (!http) {
      this.error = 'No HTTP client available.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = null;
    this.chartDataMap = {};
    this.stats = {};
    this.cdr.detectChanges();

    const endTs = Date.now();
    const startTs = endTs - (this.timeRangeHours * 60 * 60 * 1000);
    const limit = 2000;

    try {
      // ── Step 1: Identify Device IDs ──────────────────────────────────
      let aqDeviceId: string | null = null;
      let tempDeviceId: string | null = null;
      let humDeviceId: string | null = null;

      // Find AQ Sensor
      if (this.aqSensors?.length > 0) {
        aqDeviceId = this.deviceEntityIdMap?.[this.aqSensors[0].entityName] ?? null;
      } else {
        const aqKey = Object.keys(this.deviceEntityIdMap || {}).find(name => /^(aq|am|air)/i.test(name));
        if (aqKey) aqDeviceId = this.deviceEntityIdMap[aqKey];
      }

      // Find Temp Sensor (prefer dedicated sensors over TRVs)
      const tempKeys = Object.keys(this.tempDevices || {}).filter(k => !/trv/i.test(k) && !/thermostat/i.test(k));
      if (tempKeys.length > 0) tempDeviceId = this.deviceEntityIdMap?.[tempKeys[0]] ?? null;
      
      // Find Humidity Sensor
      const humKeys = Object.keys(this.humDevices || {});
      if (humKeys.length > 0) humDeviceId = this.deviceEntityIdMap?.[humKeys[0]] ?? null;

      // Find additional sensors
      const noiseKeys = Object.keys(this.noiseDevices || {});
      const noiseDeviceId = noiseKeys.length > 0 ? this.deviceEntityIdMap?.[noiseKeys[0]] ?? null : null;

      const windowKeys = Object.keys(this.windowDevices || {});
      const windowDeviceId = windowKeys.length > 0 ? this.deviceEntityIdMap?.[windowKeys[0]] ?? null : null;

      const leakKeys = Object.keys(this.leakDevices || {});
      const leakDeviceId = leakKeys.length > 0 ? this.deviceEntityIdMap?.[leakKeys[0]] ?? null : null;

      const occKeys = Object.keys(this.deviceEntityIdMap || {}).filter(k => /occupancy|presence|motion|pir/i.test(k));
      const occDeviceId = occKeys.length > 0 ? this.deviceEntityIdMap[occKeys[0]] : null;

      // ── Step 2: Fetch telemetry for all devices concurrently ───────
      const fetchPromises: Promise<any>[] = [];
      const keysToFetch = 'temperature,humidity,co2,tvoc,iaq,pm25,pm10,pressure,temp,hum,noise,data_LAeq,contact,waterLeak,occupancy,presence,motion,pir';
      
      // We wrap the requests in a try/catch so if one fails it doesn't break the others
      const safeFetch = async (id: string | null) => {
        if (!id) return null;
        try {
          return await this.httpGet(http, `/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${keysToFetch}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);
        } catch { return null; }
      };

      // Ensure we only fetch unique device IDs
      const uniqueIds = [...new Set([aqDeviceId, tempDeviceId, humDeviceId, noiseDeviceId, windowDeviceId, leakDeviceId, occDeviceId].filter(Boolean))];
      const results = await Promise.all(uniqueIds.map(id => safeFetch(id)));

      // ── Step 3: Process and merge data ──────────────────────────────
      const normalized: Record<string, any[]> = { temperature: [], humidity: [], co2: [], tvoc: [], iaq: [], pm25: [], pressure: [], noise: [], contact: [], waterLeak: [], occupancy: [] };

      // Map device results back to their roles
      uniqueIds.forEach((id, index) => {
        const data = results[index];
        if (!data) return;

        // If this is the temperature device, grab its temp
        if (id === tempDeviceId || (!tempDeviceId && id === aqDeviceId)) {
          if (data['temperature']?.length) normalized['temperature'] = data['temperature'];
          else if (data['temp']?.length) normalized['temperature'] = data['temp'];
        }

        // If this is the humidity device, grab its humidity
        if (id === humDeviceId || (!humDeviceId && id === aqDeviceId)) {
          if (data['humidity']?.length) normalized['humidity'] = data['humidity'];
          else if (data['hum']?.length) normalized['humidity'] = data['hum'];
        }

        // If this is the AQ device, grab the pollutants
        if (id === aqDeviceId) {
          if (data['co2']?.length) normalized['co2'] = data['co2'];
          if (data['tvoc']?.length) normalized['tvoc'] = data['tvoc'];
          if (data['iaq']?.length) normalized['iaq'] = data['iaq'];
          if (data['pm25']?.length) normalized['pm25'] = data['pm25'];
          if (data['pressure']?.length) normalized['pressure'] = data['pressure'];
        }

        // Noise
        if (id === noiseDeviceId) {
          if (data['noise']?.length) {
            normalized['noise'] = data['noise'];
          } else if (data['data_LAeq']?.length) {
            normalized['noise'] = data['data_LAeq'];
          }
        }

        // Window
        if (id === windowDeviceId && data['contact']?.length) {
          normalized['contact'] = data['contact'];
        }

        // Leak
        if (id === leakDeviceId && data['waterLeak']?.length) {
          normalized['waterLeak'] = data['waterLeak'];
        }

        // Occupancy
        if (id === occDeviceId) {
          const occKey = ['occupancy', 'presence', 'motion', 'pir'].find(k => data[k]?.length);
          if (occKey) normalized['occupancy'] = data[occKey];
        }
      });

      // Update Chart Data Map
      for (const key of ['temperature', 'humidity', 'co2', 'tvoc', 'iaq', 'pm25', 'pressure']) {
        if (normalized[key]?.length) {
          this.chartDataMap[key] = this.toSeries(normalized[key]);
        }
      }

      // AQI Alias: if iaq missing but tvoc present
      if (!this.chartDataMap['iaq'] && this.chartDataMap['tvoc']) {
        this.chartDataMap['iaq'] = this.chartDataMap['tvoc'];
      }

      // Update summary stats
      this.stats['temperature'] = this.latest(normalized['temperature']);
      this.stats['humidity']    = this.latest(normalized['humidity']);
      this.stats['co2']         = this.latest(normalized['co2']);
      this.stats['iaq']         = this.latest(normalized['iaq'] || normalized['tvoc']);

      // ── Process new panel stats ──
      // Noise
      if (normalized['noise'].length) {
        this.noiseChartData = [{ name: this.t.histAcoustics, values: this.toSeries(normalized['noise']) }];
        const vals = normalized['noise'].map(d => parseFloat(d.value)).filter(v => !isNaN(v));
        if (vals.length) {
          this.noiseStats.current = Math.round(vals[vals.length - 1]);
          this.noiseStats.min = Math.round(Math.min(...vals));
          this.noiseStats.peak = Math.round(Math.max(...vals));
          this.noiseStats.avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      }

      // Water Leak
      if (normalized['waterLeak'].length) {
        const series = normalized['waterLeak'].map(d => [d.ts, d.value === 'true' || d.value === true ? 1 : 0] as [number, number]);
        this.waterLeakChartData = [{ name: this.t.histLeakDetected, values: series }];
        this.waterLeakStats.current = series[series.length - 1][1] === 1 ? this.t.histLeakDetected : this.t.noLeak;
        this.waterLeakStats.events = series.filter(s => s[1] === 1).length;
      }

      // Window (calculate real events)
      if (normalized['contact'].length) {
        const raw = normalized['contact'];
        
        const events = [];
        let openTime = 0;
        let totalOpenDuration = 0;
        const totalDuration = (raw[raw.length - 1].ts - raw[0].ts) || 1;
        
        for (let i = 0; i < raw.length; i++) {
           const d = raw[i];
           const isOpen = d.value !== true && d.value !== 'true' && d.value !== 1 && d.value !== '1';
           
           if (isOpen && openTime === 0) {
             openTime = d.ts;
           } else if (!isOpen && openTime > 0) {
             const duration = d.ts - openTime;
             totalOpenDuration += duration;
             events.push({
               name: windowKeys[0] || 'Window Sensor',
               time: openTime,
               durationMs: duration,
               color: 'var(--warning)',
               isOngoing: false
             });
             openTime = 0;
           }
        }
        
        if (openTime > 0) {
          const duration = endTs - openTime;
          totalOpenDuration += duration;
          events.push({
             name: windowKeys[0] || 'Window Sensor',
             time: openTime,
             durationMs: duration,
             color: 'var(--warning)',
             isOngoing: true
          });
        }
        
        const openEventsCount = events.length;
        this.windowStats.current = (openTime > 0) ? this.t.open : this.t.closed;
        this.windowStats.eventCount = openEventsCount;
        this.windowStats.avgOpen = Math.round((totalOpenDuration / totalDuration) * 100);
        this.windowStats.avgDuration = openEventsCount > 0 ? Math.round(totalOpenDuration / openEventsCount / 60000) + 'm' : '0m';
        this.windowStats.events = events.sort((a, b) => b.time - a.time);
      }

      // Occupancy (calculate real check in and duration)
      if (normalized['occupancy'].length) {
        const raw = normalized['occupancy'];
        const latest = raw[raw.length - 1].value;
        const isOccupied = (latest === true || latest === 'true' || Number(latest) > 0);
        this.occupancyStats.current = isOccupied ? this.t.occupied : this.t.histUnoccupied;
        
        let activeTime = 0;
        let checkInTime = 0;
        const totalDuration = (raw[raw.length - 1].ts - raw[0].ts) || 1;
        
        for (let i = 0; i < raw.length; i++) {
          const d = raw[i];
          const occupied = d.value === true || d.value === 'true' || Number(d.value) > 0;
          if (occupied && checkInTime === 0) {
            checkInTime = d.ts;
          } else if (!occupied && checkInTime > 0) {
            activeTime += (d.ts - checkInTime);
            checkInTime = 0;
          }
        }
        if (checkInTime > 0) {
          activeTime += (endTs - checkInTime);
        }
        
        this.occupancyStats.avg = Math.round((activeTime / totalDuration) * 100);
        this.occupancyStats.checkedIn = this.checkedIn ? 'Yes' : 'No';

        const series = raw.map((d: any) => [d.ts, (d.value === true || d.value === 'true' || Number(d.value) > 0) ? 1 : 0] as [number, number]);
        this.occupancyChartData = [{ name: this.t.histRoomOccupancy, values: series }];
      }

      // Auto-select first tab with data
      const firstWithData = this.allTabs.find(t => (this.chartDataMap[t.key]?.length ?? 0) > 0);
      if (firstWithData) this.selectedKey = firstWithData.key;

    } catch (e: any) {
      console.error('[RoomHistoricalData] Fetch error:', e);
      this.error = 'Failed to load data. Please try again.';
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  private httpGet(http: any, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Request timed out')), 15000);
      http.get(url, { ignoreErrors: true }).subscribe(
        (res: any) => { clearTimeout(timeout); resolve(res); },
        (err: any) => { clearTimeout(timeout); reject(err); }
      );
    });
  }

  private toSeries(points: any[]): [number, number][] {
    if (!points?.length) return [];
    return points
      .map(p => [p.ts, parseFloat(p.value)] as [number, number])
      .filter(([_, v]) => !isNaN(v));
  }

  private latest(points: any[]): number | null {
    if (!points?.length) return null;
    const val = parseFloat(points[points.length - 1].value);
    return isNaN(val) ? null : Math.round(val * 10) / 10;
  }

  getAqiClass(iaq: number | null): string {
    if (!iaq) return '';
    if (iaq <= 50)  return 'aqi-good';
    if (iaq <= 100) return 'aqi-moderate';
    if (iaq <= 150) return 'aqi-poor';
    return 'aqi-bad';
  }
}
