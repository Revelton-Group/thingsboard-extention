import { Component, Inject, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from "@angular/core";
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { TranslationService } from "../../core/services/translation.service";

@Component({
  selector: "tb-room-historical-data",
  templateUrl: "./room-historical-data.component.html",
  styleUrls: ["./room-historical-data.component.scss"],
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
  @Input() plugDevices: Record<string, any> = {};
  @Input() checkedIn: boolean = false;
  @Input() timeRangeHours: number = 24;

  loading = false;
  error: string | null = null;
  metricCards: any[] = [];

  windowDeviceOptions: { entityName: string; label: string }[] = [];
  selectedWindowEntity: string | null = null;

  powerDeviceOptions: { entityName: string; label: string }[] = [];
  selectedPowerEntity: string | null = null;

  /** Bumped on every fetchData() call so a slow, stale request (e.g. from
   * the previously selected window) can't clobber a newer one's results. */
  private fetchSeq = 0;

  /** Renders the Window step-line tooltip as Open/Closed instead of 1/0. */
  windowTooltipFormatter = (val: number): string => {
    return val >= 1 ? (this.t.open || "Open") : (this.t.closed || "Closed");
  };

  constructor(
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
  ) {}

  get t() { return this.translationService.t; }

  ngOnInit() {
    this.fetchData();
  }

  ngOnChanges(changes: SimpleChanges) {
    const mapChange = changes["deviceEntityIdMap"];
    const timeChange = changes["timeRangeHours"];

    if ((mapChange && !mapChange.firstChange && JSON.stringify(mapChange.currentValue) !== JSON.stringify(mapChange.previousValue)) ||
        (timeChange && !timeChange.firstChange)) {
      this.fetchData();
    }
  }

  private formatWindowLabel(entityName: string): string {
    const match = entityName.match(/(\d+)$/);
    return match ? match[1] : entityName;
  }

  selectWindowDevice(entityName: string) {
    if (this.selectedWindowEntity === entityName) return;
    this.selectedWindowEntity = entityName;
    // Only refetch the Window card's own telemetry - the other metric
    // cards (temp, humidity, co2, ...) are untouched and don't re-render.
    this.fetchWindowCard();
  }

  /** Refetches telemetry for the currently selected window sensor only,
   * and replaces just the "window" card in metricCards in place. */
  private async fetchWindowCard() {
    const requestId = ++this.fetchSeq;

    const http = this.ctx?.http;
    const windowDeviceId = this.selectedWindowEntity && this.deviceEntityIdMap?.[this.selectedWindowEntity];
    if (!http || !windowDeviceId) return;

    const endTs = Date.now();
    const startTs = endTs - (this.timeRangeHours * 60 * 60 * 1000);
    const limit = 2000;

    try {
      const data = await this.httpGet(http, `/api/plugins/telemetry/DEVICE/${windowDeviceId}/values/timeseries?keys=contact,data_contact&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);
      if (requestId !== this.fetchSeq) return;

      const normalized: Record<string, any[]> = { window: (data && (data["contact"] || data["data_contact"])) || [] };
      const newCard = this.buildCard("window", "Window", "", "window", "#34d399", 1, 1, normalized, startTs, endTs, true, true);

      const idx = this.metricCards.findIndex(c => c.key === "window");
      if (idx >= 0) {
        const updated = [...this.metricCards];
        updated[idx] = newCard;
        this.metricCards = updated;
        this.cdr.detectChanges();
      }
    } catch (e) {
      if (requestId !== this.fetchSeq) return;
      console.error("[RoomHistoricalData] Window fetch error:", e);
    }
  }

  private buildCard(
    key: string, label: string, unit: string, icon: string, color: string,
    thresholdWarn: number, thresholdCrit: number,
    normalized: Record<string, any[]>, startTs: number, endTs: number,
    isBinary: boolean = false, useLineChart: boolean = false
  ) {
    const raw = normalized[key] || [];

    let series: [number, number][] = [];
    let binaryBlocks: any[] = [];
    let eventMarkers: any[] = [];
    let current = 0;
    if (isBinary) {
      if (raw.length > 0) {
        binaryBlocks = processBinaryBlocks(key, raw, startTs, endTs, color);
        eventMarkers = binaryBlocks.filter(b => b.active);
        const sorted = [...raw].sort((a, b) => a.ts - b.ts);
        current = normalizeBinaryValue(key, sorted[sorted.length - 1].value);

        if (useLineChart) {
          // Step line of the open(1)/closed(0) state over time
          series = sorted.map(d => [d.ts, normalizeBinaryValue(key, d.value)] as [number, number]);
          series.push([endTs, series[series.length - 1][1]]);
        }
      }
    } else {
      series = raw.map(d => [d.ts, parseFloat(d.value)] as [number, number]).filter(d => !isNaN(d[1]));
    }

    const vals = series.map(d => d[1]);
    if (!isBinary) {
      current = vals.length ? vals[vals.length - 1] : 0;
    }

    let min: number, max: number, avg: number;
    if (isBinary) {
      const durations = eventMarkers.map(b => b.durationMin);
      min = durations.length ? Math.min(...durations) : 0;
      max = durations.length ? Math.max(...durations) : 0;
      avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    } else {
      min = vals.length ? Math.min(...vals) : 0;
      max = vals.length ? Math.max(...vals) : 0;
      avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    const hasData = isBinary ? raw.length > 0 : series.length > 0;
    let badgeText = "NORMAL";
    let badgeClass = "normal";

    if (!hasData) {
      badgeText = "NO DATA";
      badgeClass = "nodata";
    } else if (isBinary) {
      if (key === "window") {
        badgeText = current ? "OPEN" : "CLOSED";
        badgeClass = current ? "normal" : "normal";
      }
      if (key === "leak") {
        badgeText = current ? "LEAK" : "NORMAL";
        badgeClass = current ? "critical" : "normal";
      }
      if (key === "presence") {
        badgeText = current ? "OCCUPIED" : "VACANT";
        badgeClass = current ? "occupied" : "normal";
      }
    } else {
      if (current >= thresholdCrit) {
        badgeText = "CRITICAL";
        badgeClass = "critical";
      } else if (current >= thresholdWarn) {
        badgeText = "WARNING";
        badgeClass = "warning";
      } else if (key === "noise") {
        badgeText = "QUIET";
        badgeClass = "quiet";
      }
    }

    let displayVal: any = Math.round(current * 10) / 10;
    if (key === "window" || key === "leak" || key === "presence") {
      displayVal = raw.filter(d => normalizeBinaryValue(key, d.value) === 1).length; // events count
      unit = "events";
    }

    return {
      key, label, unit, icon, color,
      thresholdWarn, thresholdCrit,
      data: [{ name: label, values: series }],
      hasData: hasData,
      current: displayVal,
      min: Math.round(min * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      max: Math.round(max * 10) / 10,
      badgeText,
      badgeClass,
      isBinary,
      useLineChart,
      binaryBlocks,
      eventMarkers
    };
  }

  async fetchData() {
    const requestId = ++this.fetchSeq;

    const http = this.ctx?.http;
    if (!http) {
      this.error = "No HTTP client available.";
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = null;
    // Keep the previously rendered cards mounted while refetching so the
    // grid doesn't collapse to the loading spinner's height and yank the
    // scroll position of the surrounding dialog back to the top.
    this.cdr.detectChanges();

    const endTs = Date.now();
    const startTs = endTs - (this.timeRangeHours * 60 * 60 * 1000);
    const limit = 2000;

    // Build the list of individual window sensors the user can pick from
    // (rooms can have more than one window device, e.g. Window-1, Window-3),
    // sorted numerically so the chips read left-to-right as 1, 2, 3...
    const windowEntities = Object.keys(this.windowDevices || {})
      .filter(name => this.deviceEntityIdMap?.[name])
      .sort((a, b) => {
        const na = parseInt((a.match(/(\d+)$/) || [])[1] || "0", 10);
        const nb = parseInt((b.match(/(\d+)$/) || [])[1] || "0", 10);
        return na - nb;
      });
    this.windowDeviceOptions = windowEntities.map(name => ({ entityName: name, label: this.formatWindowLabel(name) }));
    if (!this.selectedWindowEntity || !windowEntities.includes(this.selectedWindowEntity)) {
      this.selectedWindowEntity = windowEntities[0] || null;
    }

    // Smart sockets are classified upstream (RoomDataService.isPlugDevice(),
    // which also matches by device profile e.g. "milesight-ws523" — not just
    // by entity name). Source the socket list from that classification
    // instead of re-guessing via a name regex here, which missed sockets
    // whose entity name doesn't literally contain "socket"/"plug"/"switch".
    const powerEntities = Object.keys(this.plugDevices || {})
      .filter(name => this.deviceEntityIdMap?.[name])
      .sort((a, b) => {
        const na = parseInt((a.match(/(\d+)$/) || [])[1] || "0", 10);
        const nb = parseInt((b.match(/(\d+)$/) || [])[1] || "0", 10);
        return na - nb;
      });
    this.powerDeviceOptions = powerEntities.map(name => ({ entityName: name, label: this.formatWindowLabel(name) }));
    if (!this.selectedPowerEntity || !powerEntities.includes(this.selectedPowerEntity)) {
      this.selectedPowerEntity = powerEntities[0] || null;
    }

    try {
      const findId = (pattern: RegExp) => {
        const key = Object.keys(this.deviceEntityIdMap || {}).find(k => pattern.test(k));
        return key ? this.deviceEntityIdMap[key] : null;
      };

      const aqDeviceId = (this.aqSensors?.length > 0) ? (this.deviceEntityIdMap?.[this.aqSensors[0].entityName] ?? null) : findId(/^(aq|am|air)/i);
      const tempDeviceId = aqDeviceId || findId(/temp/i) || findId(/trv|thermostat/i);
      const humDeviceId = aqDeviceId || findId(/hum/i);
      const noiseDeviceId = findId(/noise|ws302/i) || aqDeviceId;
      const windowDeviceId = (this.selectedWindowEntity && this.deviceEntityIdMap?.[this.selectedWindowEntity]) || findId(/window|contact/i);
      const leakDeviceId = findId(/leak|ws303/i);
      const occDeviceId = findId(/occupancy|presence|motion|pir|ws301|vs370/i);
      const powerDeviceIds = powerEntities.map(name => this.deviceEntityIdMap[name]).filter(Boolean);
      const co2DeviceId = findId(/co2/i) || aqDeviceId;
      const tvocDeviceId = findId(/tvoc|voc/i) || aqDeviceId;
      const pmDeviceId = findId(/pm2|pm10|particulate/i) || aqDeviceId;
      const pressureDeviceId = findId(/pressure|baro/i) || aqDeviceId;
      const luxDeviceId = findId(/lux|illuminance|light/i) || aqDeviceId;

      // Fetch telemetry
      const keysToFetch = "temperature,humidity,co2,iaq,tvoc,pm25,pm2_5,data_pm25,data_pm2_5,pm10,data_pm10,pressure,data_pressure,lux,illuminance,data_illuminance,light,data_light,light_level,data_light_level,noise,laeq,data_LAeq,data_LAI,data_LAImax,contact,data_contact,waterLeak,leak,water_leak,data_leakage_status,occupancy,presence,data_occupancy,data_pir,power,active_power,data_active_power,load_power,data_power_consumption,energy,temp,hum,data_temperature,data_humidity,data_co2,data_iaq,data_tvoc";
      const safeFetch = async (id: string | null) => {
        if (!id) return null;
        try {
          return await this.httpGet(http, `/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${keysToFetch}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);
        } catch { return null; }
      };

      const uniqueIds = [...new Set([aqDeviceId, tempDeviceId, humDeviceId, noiseDeviceId, windowDeviceId, leakDeviceId, occDeviceId, ...powerDeviceIds, co2DeviceId, tvocDeviceId, pmDeviceId, pressureDeviceId, luxDeviceId].filter(Boolean))];
      const results = await Promise.all(uniqueIds.map(id => safeFetch(id)));

      // Process Data
      const normalized: Record<string, any[]> = { temperature: [], humidity: [], co2: [], noise: [], tvoc: [], pm25: [], pm10: [], pressure: [], lux: [], window: [], leak: [], presence: [], power: [], energy: [] };
      const powerDataBySocket: Record<string, any[]> = {};
      const energyDataBySocket: Record<string, any[]> = {};

      uniqueIds.forEach((id, index) => {
        const data = results[index];
        if (!data) return;

        if (id === tempDeviceId) normalized["temperature"] = data["temperature"] || data["temp"] || data["data_temperature"] || data["data_temp"] || normalized["temperature"];
        if (id === humDeviceId) normalized["humidity"] = data["humidity"] || data["hum"] || data["data_humidity"] || data["data_hum"] || normalized["humidity"];
        if (id === co2DeviceId) normalized["co2"] = data["co2"] || data["data_co2"] || normalized["co2"];
        if (id === tvocDeviceId) normalized["tvoc"] = data["tvoc"] || data["data_tvoc"] || data["iaq"] || data["data_iaq"] || normalized["tvoc"];
        if (id === pmDeviceId) {
          normalized["pm25"] = data["pm25"] || data["pm2_5"] || data["data_pm25"] || data["data_pm2_5"] || normalized["pm25"];
          normalized["pm10"] = data["pm10"] || data["data_pm10"] || normalized["pm10"];
        }
        if (id === pressureDeviceId) normalized["pressure"] = data["pressure"] || data["data_pressure"] || normalized["pressure"];
        if (id === luxDeviceId) normalized["lux"] = data["lux"] || data["illuminance"] || data["data_illuminance"] || data["light"] || data["data_light"] || data["light_level"] || data["data_light_level"] || normalized["lux"];
        if (id === noiseDeviceId) normalized["noise"] = data["noise"] || data["laeq"] || data["data_LAeq"] || data["data_LAI"] || data["data_LAImax"] || normalized["noise"];
        if (id === windowDeviceId) normalized["window"] = data["contact"] || data["data_contact"] || normalized["window"];
        if (id === leakDeviceId) normalized["leak"] = data["waterLeak"] || data["leak"] || data["water_leak"] || data["data_leakage_status"] || normalized["leak"];
        if (id === occDeviceId) normalized["presence"] = data["occupancy"] || data["presence"] || data["data_occupancy"] || data["data_pir"] || normalized["presence"];
        if (powerDeviceIds.includes(id)) {
          powerDataBySocket[id] = data["power"] || data["active_power"] || data["data_active_power"] || data["load_power"] || [];
          energyDataBySocket[id] = data["data_power_consumption"] || data["energy"] || [];
        }
      });

      if (Object.keys(powerDataBySocket).length > 0) {
        const allPowerPoints = [];
        for (const [id, points] of Object.entries(powerDataBySocket)) {
          for (const p of points as any[]) {
            allPowerPoints.push({ ts: p.ts, value: parseFloat(p.value) || 0, id });
          }
        }
        allPowerPoints.sort((a, b) => a.ts - b.ts);
        
        const latestPowerById: Record<string, number> = {};
        const summedPowerSeries = [];
        for (const p of allPowerPoints) {
          latestPowerById[p.id] = p.value;
          const sum = Object.values(latestPowerById).reduce((a, b) => a + b, 0);
          summedPowerSeries.push({ ts: p.ts, value: sum });
        }
        normalized["power"] = summedPowerSeries;
      }

      if (Object.keys(energyDataBySocket).length > 0) {
        const allEnergyPoints = [];
        for (const [id, points] of Object.entries(energyDataBySocket)) {
          for (const p of points as any[]) {
            allEnergyPoints.push({ ts: p.ts, value: parseFloat(p.value) || 0, id });
          }
        }
        allEnergyPoints.sort((a, b) => a.ts - b.ts);
        
        const latestEnergyById: Record<string, number> = {};
        const summedEnergySeries = [];
        for (const p of allEnergyPoints) {
          latestEnergyById[p.id] = p.value;
          const sum = Object.values(latestEnergyById).reduce((a, b) => a + b, 0);
          summedEnergySeries.push({ ts: p.ts, value: sum / 1000 });
        }
        normalized["energy"] = summedEnergySeries;
      }

      // A newer fetch (e.g. the user clicked a different window chip or
      // range button while this one was still in flight) has already
      // rendered — discard this stale response instead of overwriting it.
      if (requestId !== this.fetchSeq) return;

      this.metricCards = [
        this.buildCard("temperature", this.t.histTemp || "Temperature", "°C", "device_thermostat", "#f87171", 28, 32, normalized, startTs, endTs),
        this.buildCard("humidity", this.t.histHumidity || "Humidity", "%", "water_drop", "#34d399", 60, 75, normalized, startTs, endTs),
        this.buildCard("co2", "CO₂", "ppm", "co2", "#a78bfa", 1000, 1500, normalized, startTs, endTs),
        this.buildCard("noise", "Noise Sensor", "dBA", "graphic_eq", "#34d399", 60, 80, normalized, startTs, endTs),
        this.buildCard("tvoc", "TVOC", "ppb", "science", "#f59e0b", 150, 300, normalized, startTs, endTs),
        this.buildCard("pm25", "PM2.5", "µg/m³", "grain", "#f87171", 20, 35, normalized, startTs, endTs),
        this.buildCard("pm10", "PM10", "µg/m³", "blur_on", "#60a5fa", 40, 60, normalized, startTs, endTs),
        this.buildCard("pressure", "Pressure", "hPa", "compress", "#9ca3af", 1100, 1200, normalized, startTs, endTs),
        this.buildCard("lux", "Lux", "lx", "light_mode", "#34d399", 800, 1000, normalized, startTs, endTs),
        this.buildCard("window", "Window", "", "window", "#34d399", 1, 1, normalized, startTs, endTs, true, true),
        this.buildCard("leak", "Water Leak", "", "water_drop", "#f87171", 1, 1, normalized, startTs, endTs, true),
        this.buildCard("presence", "Presence Sensor", "", "sensors", "#60a5fa", 1, 1, normalized, startTs, endTs, true),
        this.buildCard("power", "Socket Power", "W", "bolt", "#fbbf24", 2000, 3000, normalized, startTs, endTs),
        this.buildCard("energy", "Socket Energy", "kWh", "bolt", "#10b981", 2, 5, normalized, startTs, endTs)
      ];

      this.loading = false;
      this.cdr.detectChanges();

    } catch (e: any) {
      if (requestId !== this.fetchSeq) return;
      console.error("[RoomHistoricalData] Fetch error:", e);
      this.error = "Failed to load data. Please try again.";
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  
  
  getDeviceId(key: string): string | null {
    const findId = (pattern: RegExp) => {
      const k = Object.keys(this.deviceEntityIdMap || {}).find(name => pattern.test(name));
      return k ? this.deviceEntityIdMap[k] : null;
    };
    const aqDeviceId = (this.aqSensors?.length > 0) ? (this.deviceEntityIdMap?.[this.aqSensors[0].entityName] ?? null) : findId(/^(aq|am|air)/i);
    
    if (key === "temperature") return findId(/temp/i) || aqDeviceId || findId(/trv|thermostat/i);
    if (key === "humidity") return findId(/hum/i) || aqDeviceId;
    if (key === "co2") return findId(/co2/i) || aqDeviceId;
    if (key === "tvoc") return findId(/tvoc|voc/i) || aqDeviceId;
    if (key === "pm25" || key === "pm10") return findId(/pm2|pm10|particulate/i) || aqDeviceId;
    if (key === "pressure") return findId(/pressure|baro/i) || aqDeviceId;
    if (key === "lux") return findId(/lux|illuminance|light/i) || aqDeviceId;
    if (key === "noise") return findId(/noise|ws302/i) || aqDeviceId;
    if (key === "window") return (this.selectedWindowEntity && this.deviceEntityIdMap?.[this.selectedWindowEntity]) || findId(/window|contact/i);
    if (key === "leak") return findId(/leak|ws303/i);
    if (key === "presence") return findId(/occupancy|presence|motion|pir|ws301|vs370/i);
    if (key === "power" || key === "energy") {
      const plugNames = Object.keys(this.plugDevices || {});
      return (plugNames[0] && this.deviceEntityIdMap?.[plugNames[0]]) || findId(/socket|power|plug|switch/i);
    }
    return null;
  }

  openExpandedChart(card: any) {
    if (!card || !card.hasData) return;
    this.dialog.open(ExpandedChartDialogComponent, {
      width: "800px",
      maxWidth: "95vw",
      panelClass: ["tb-dialog", "tb-expanded-chart-panel"],
      data: { card, timeRangeHours: this.timeRangeHours, parent: this }
    });
  }

  getIconBg(color: string): string {
    if (!color) return "rgba(255,255,255,0.05)";
    // Convert hex color to rgba with 12% opacity
    return color + "1f";
  }

  private httpGet(http: any, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Request timed out")), 15000);
      http.get(url, { ignoreErrors: true }).subscribe(
        (res: any) => { clearTimeout(timeout); resolve(res); },
        (err: any) => { clearTimeout(timeout); reject(err); }
      );
    });
  }
}

@Component({
  selector: 'tb-expanded-chart-dialog',
  template: `
    <div style="background: var(--panel, #f3f4f6); padding: 24px; border-radius: 16px; color: var(--tx, #111827); display: flex; flex-direction: column; height: 600px; font-family: 'Inter', sans-serif; position: relative;">
      
      <!-- Loading Overlay -->
      <div *ngIf="loading" style="position: absolute; inset: 0; background: rgba(0,0,0,0.1); border-radius: 16px; z-index: 10; display: flex; align-items: center; justify-content: center;">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div style="display: flex; gap: 16px;">
          <div [style.background]="getIconBg(data.card.color)" [style.color]="data.card.color" style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <mat-icon style="font-size: 24px; width: 24px; height: 24px;">{{ data.card.icon }}</mat-icon>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 20px; font-weight: 700; line-height: 1.2;">{{ data.card.label }}</span>
            <div style="display: flex; align-items: baseline; gap: 4px; margin-top: 4px;">
              <span [style.color]="data.card.color" style="font-size: 18px; font-weight: 700;">{{ data.card.hasData ? data.card.current : '--' }}</span>
              <span *ngIf="data.card.unit && data.card.hasData" style="color: var(--t3, #6b7280); font-size: 14px; font-weight: 500;">{{ data.card.unit }}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div *ngIf="data.card.key === 'window' && data.parent.windowDeviceOptions?.length > 1" style="display: flex; align-items: center;">
            <select (change)="selectWindow($any($event.target).value)" style="border: 1px solid var(--border, #e5e7eb); padding: 6px 32px 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 600; cursor: pointer; appearance: none; background: transparent url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>') no-repeat right 10px center; background-size: 14px; color: var(--tx, #111827); outline: none; font-family: inherit;">
              <option *ngFor="let opt of data.parent.windowDeviceOptions" [value]="opt.entityName" [selected]="modalWindowEntity === opt.entityName">Window {{ opt.label }}</option>
            </select>
          </div>

          <div *ngIf="(data.card.key === 'power' || data.card.key === 'energy') && data.parent.powerDeviceOptions?.length > 1" style="display: flex; align-items: center;">
            <select (change)="selectPower($any($event.target).value === '' ? null : $any($event.target).value)" style="border: 1px solid var(--border, #e5e7eb); padding: 6px 32px 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 600; cursor: pointer; appearance: none; background: transparent url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>') no-repeat right 10px center; background-size: 14px; color: var(--tx, #111827); outline: none; font-family: inherit;">
              <option value="" [selected]="!modalPowerEntity">Total</option>
              <option *ngFor="let opt of data.parent.powerDeviceOptions" [value]="opt.entityName" [selected]="modalPowerEntity === opt.entityName">Socket {{ opt.label }}</option>
            </select>
          </div>

          <div *ngIf="data.card.badgeText" [ngClass]="data.card.badgeClass" class="hist-badge" style="font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
            {{ data.card.badgeText }}
          </div>
          
          <div style="display: flex; background: transparent; border: 1px solid var(--border, #e5e7eb); padding: 4px; border-radius: 24px; gap: 4px;">
            <button type="button" (click)="setRange(24); $event.preventDefault();" [style.background]="activeRange === 24 ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 24 ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">24H</button>
            <button type="button" (click)="setRange(168); $event.preventDefault();" [style.background]="activeRange === 168 ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 168 ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">7D</button>
            <button type="button" (click)="setRange(720); $event.preventDefault();" [style.background]="activeRange === 720 ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 720 ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">30D</button>
          </div>

          <button type="button" mat-icon-button (click)="dialogRef.close()" style="background: var(--inner, #ffffff); border: 1px solid var(--border, #e5e7eb); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--tx, #374151);">
            <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Chart Card -->
      <div style="flex: 1; background: var(--inner, #ffffff); border-radius: 12px; border: 1px solid var(--border, #e5e7eb); padding: 16px 16px 0 16px; display: flex; flex-direction: column; min-height: 0;">
        <revelton-historical-chart
          style="flex: 1; min-height: 0;"
          [data]="data.card.data"
          [colors]="[data.card.color]"
          [type]="(data.card.key === 'power' || (data.card.isBinary && !data.card.useLineChart)) ? 'bar' : 'line'"
          [step]="data.card.useLineChart ? 'start' : false"
          [yAxisMin]="data.card.useLineChart ? 0 : undefined"
          [yAxisMax]="data.card.useLineChart ? 1 : undefined"
          [valueFormatter]="data.card.useLineChart ? data.parent.windowTooltipFormatter : undefined"
          [sparkline]="false"
          [area]="true"
          [showLegend]="false"
          [yAxisUnit]="data.card.unit">
        </revelton-historical-chart>
      </div>

      <!-- Footer -->
      <div *ngIf="data.card.key !== 'window' && data.card.key !== 'leak' && data.card.key !== 'presence'" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border, #e5e7eb); display: grid; grid-template-columns: repeat(3, 1fr);">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 10px; font-weight: 700; color: var(--t2, #6b7280); letter-spacing: 0.5px;">MIN</span>
          <span style="font-size: 18px; font-weight: 700;">{{ data.card.min }}</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 10px; font-weight: 700; color: var(--t2, #6b7280); letter-spacing: 0.5px;">AVG</span>
          <span [style.color]="data.card.color" style="font-size: 18px; font-weight: 700;">{{ data.card.avg }}</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 10px; font-weight: 700; color: var(--t2, #6b7280); letter-spacing: 0.5px;">MAX</span>
          <span style="font-size: 18px; font-weight: 700;">{{ data.card.max }}</span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .hist-badge.normal, .hist-badge.good, .hist-badge.quiet {
      background: rgba(52, 211, 153, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.2);
    }
    .hist-badge.warning {
      background: rgba(251, 191, 36, 0.12);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.2);
    }
    .hist-badge.critical {
      background: rgba(248, 113, 113, 0.12);
      color: #f87171;
      border: 1px solid rgba(248, 113, 113, 0.2);
    }
    .hist-badge.occupied {
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .hist-badge.nodata {
      background: rgba(156, 163, 175, 0.12);
      color: #9ca3af;
      border: 1px solid rgba(156, 163, 175, 0.2);
    }
  `],
  standalone: false
})
export class ExpandedChartDialogComponent {
  activeRange = 24;
  loading = false;
  modalWindowEntity: string = null;
  modalPowerEntity: string = null;

  constructor(
    public dialogRef: MatDialogRef<ExpandedChartDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cdr: ChangeDetectorRef
  ) {
    this.activeRange = this.data.timeRangeHours || 24;
    this.modalWindowEntity = this.data.parent?.selectedWindowEntity || null;
    // Default to "Total" (sum across all sockets) so the big chart opens
    // matching the small card's aggregate view, not a single socket.
    this.modalPowerEntity = null;
  }

  getIconBg(color: string): string {
    if (!color) return 'rgba(255,255,255,0.05)';
    return color + '1f';
  }

  async selectWindow(entityName: string) {
    if (this.modalWindowEntity === entityName) return;
    this.modalWindowEntity = entityName;
    
    // Fetch data for the new window device within the modal
    const currentRange = this.activeRange;
    this.activeRange = -1; // force setRange to execute
    await this.setRange(currentRange);
  }

  async selectPower(entityName: string | null) {
    if (this.modalPowerEntity === entityName) return;
    this.modalPowerEntity = entityName;
    
    const currentRange = this.activeRange;
    this.activeRange = -1; 
    await this.setRange(currentRange);
  }

  async setRange(hours: number) {
    if (this.activeRange === hours) return;
    this.activeRange = hours;
    this.loading = true;
    this.cdr.detectChanges();

    const parent = this.data.parent;
    const key = this.data.card.key;

    const endTs = Date.now();
    const startTs = endTs - (hours * 60 * 60 * 1000);
    const limit = hours === 24 ? 2000 : (hours === 168 ? 4000 : 8000);
    const keysToFetch = "temperature,humidity,co2,iaq,tvoc,pm25,pm2_5,data_pm25,data_pm2_5,pm10,data_pm10,pressure,data_pressure,lux,illuminance,data_illuminance,light,data_light,light_level,data_light_level,noise,laeq,data_LAeq,data_LAI,data_LAImax,contact,data_contact,waterLeak,leak,water_leak,data_leakage_status,occupancy,presence,data_occupancy,data_pir,power,active_power,data_active_power,load_power,data_power_consumption,energy,temp,hum,data_temperature,data_humidity,data_co2,data_iaq,data_tvoc";

    try {
      if ((key === "power" || key === "energy") && !this.modalPowerEntity) {
        // "Total" mode: sum every socket's latest power reading over time,
        // the same aggregation fetchData() uses for the small card, so the
        // big chart's default view matches instead of falling back to a
        // single device.
        const powerDeviceIds: string[] = (parent.powerDeviceOptions || [])
          .map((opt: any) => parent.deviceEntityIdMap?.[opt.entityName])
          .filter(Boolean);

        const results = await Promise.all(powerDeviceIds.map((id: string) =>
          parent.httpGet(parent.ctx.http, `/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${keysToFetch}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`).catch(() => null)
        ));

        const allPowerPoints: { ts: number; value: number; idx: number }[] = [];
        results.forEach((data: any, idx: number) => {
          if (!data) return;
          const points = key === "energy" ? (data["data_power_consumption"] || data["energy"] || []) : (data["power"] || data["active_power"] || data["data_active_power"] || data["load_power"] || []);
          for (const p of points) {
            allPowerPoints.push({ ts: p.ts, value: parseFloat(p.value) || 0, idx });
          }
        });
        allPowerPoints.sort((a, b) => a.ts - b.ts);

        const latestPowerByIdx: Record<number, number> = {};
        const summedPowerSeries: any[] = [];
        for (const p of allPowerPoints) {
          latestPowerByIdx[p.idx] = p.value;
          const sum = Object.values(latestPowerByIdx).reduce((a, b) => a + b, 0);
          summedPowerSeries.push({ ts: p.ts, value: key === "energy" ? (sum / 1000) : sum });
        }

        const rebuilt = parent.buildCard(
          key, this.data.card.label, this.data.card.unit, this.data.card.icon, this.data.card.color,
          this.data.card.thresholdWarn, this.data.card.thresholdCrit, { [key]: summedPowerSeries }, startTs, endTs,
          this.data.card.isBinary, this.data.card.useLineChart
        );
        this.data.card = { ...this.data.card, ...rebuilt };
      } else {
        let deviceId = parent.getDeviceId(key);

        if (key === "window" && this.modalWindowEntity) {
          deviceId = parent.deviceEntityIdMap?.[this.modalWindowEntity];
        } else if ((key === "power" || key === "energy") && this.modalPowerEntity) {
          deviceId = parent.deviceEntityIdMap?.[this.modalPowerEntity];
        }

        if (!deviceId) {
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        const res = await parent.httpGet(parent.ctx.http, `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keysToFetch}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);

        let raw = [];
        if (key === "temperature") raw = res["temperature"] || res["temp"] || res["data_temperature"] || res["data_temp"] || [];
        else if (key === "humidity") raw = res["humidity"] || res["hum"] || res["data_humidity"] || res["data_hum"] || [];
        else if (key === "co2") raw = res["co2"] || res["data_co2"] || [];
        else if (key === "tvoc") raw = res["tvoc"] || res["data_tvoc"] || res["iaq"] || res["data_iaq"] || [];
        else if (key === "pm25") raw = res["pm25"] || res["pm2_5"] || res["data_pm25"] || res["data_pm2_5"] || [];
        else if (key === "pm10") raw = res["pm10"] || res["data_pm10"] || [];
        else if (key === "pressure") raw = res["pressure"] || res["data_pressure"] || [];
        else if (key === "lux") raw = res["lux"] || res["illuminance"] || res["data_illuminance"] || res["light"] || res["data_light"] || res["light_level"] || res["data_light_level"] || [];
        else if (key === "noise") raw = res["noise"] || res["laeq"] || res["data_LAeq"] || res["data_LAI"] || res["data_LAImax"] || [];
        else if (key === "window") raw = res["contact"] || res["data_contact"] || [];
        else if (key === "leak") raw = res["waterLeak"] || res["leak"] || res["water_leak"] || res["data_leakage_status"] || [];
        else if (key === "presence") raw = res["occupancy"] || res["presence"] || res["data_occupancy"] || res["data_pir"] || [];
        else if (key === "power") raw = res["power"] || res["active_power"] || res["data_active_power"] || res["load_power"] || [];
        else if (key === "energy") raw = res["data_power_consumption"] || res["energy"] || [];

        const processedRaw = (key === "energy") ? raw.map((p: any) => ({ ...p, value: parseFloat(p.value) / 1000 })) : raw;

        const rebuilt = parent.buildCard(
          key, this.data.card.label, this.data.card.unit, this.data.card.icon, this.data.card.color,
          this.data.card.thresholdWarn, this.data.card.thresholdCrit, { [key]: processedRaw }, startTs, endTs,
          this.data.card.isBinary, this.data.card.useLineChart
        );
        this.data.card = { ...this.data.card, ...rebuilt };
      }

    } catch (e) {
      console.error("Expanded chart fetch error", e);
    }

    this.loading = false;
    this.data.card = { ...this.data.card }; // Trigger change detection
    this.cdr.detectChanges();
  }
}

export function normalizeBinaryValue(key: string, rawVal: any): number {
  let val = (rawVal === true || rawVal === "true" || String(rawVal).toLowerCase() === "open" || Number(rawVal) > 0) ? 1 : 0;
  if (key === "window") {
     if (rawVal === true || rawVal === "true" || Number(rawVal) > 0) val = 0;
     else if (rawVal === false || rawVal === "false" || rawVal === 0 || rawVal === "0") val = 1;
     else if (String(rawVal).toLowerCase() === "open") val = 1;
     else if (String(rawVal).toLowerCase() === "closed") val = 0;
  }
  return val;
}

export function getBlockLabel(key: string, val: number): string {
  if (key === 'window') return val === 1 ? 'Open' : 'Closed';
  if (key === 'presence') return val === 1 ? 'Occupied' : 'Vacant';
  if (key === 'leak') return val === 1 ? 'Leak' : 'Normal';
  return val === 1 ? 'Active' : 'Inactive';
}

export function getBlockColor(key: string, val: number, cardColor: string): string {
  if (key === 'window') {
    return val === 1 ? '#94a3b8' : cardColor;
  } else if (key === 'presence') {
    return val === 1 ? cardColor : '#94a3b8';
  } else if (key === 'leak') {
    return val === 1 ? '#ef4444' : cardColor;
  }
  return val === 1 ? cardColor : '#94a3b8';
}

export function formatTimeRange(start: number, end: number): string {
  const s = new Date(start);
  const e = new Date(end);
  const format = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${dateLabel}, ${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  };
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    const dateLabel = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeOnly = (d: Date) => {
      let h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    };
    return `${dateLabel}, ${timeOnly(s)} – ${timeOnly(e)}`;
  }
  return `${format(s)} – ${format(e)}`;
}

export function formatDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function processBinaryBlocks(key: string, raw: any[], startTs: number, endTs: number, cardColor: string): any[] {
  const binaryBlocks: any[] = [];
  if (raw && raw.length > 0) {
    raw.sort((a: any, b: any) => a.ts - b.ts);
    const totalDuration = endTs - startTs;
    let cumulativeLeft = 0;

    const pushBlock = (blockStart: number, blockEnd: number, val: any) => {
      const widthPct = ((blockEnd - blockStart) / totalDuration) * 100;
      if (widthPct > 0.05) {
        const normalizedVal = normalizeBinaryValue(key, val);
        binaryBlocks.push({
          leftPct: cumulativeLeft,
          widthPct,
          active: normalizedVal === 1,
          color: getBlockColor(key, normalizedVal, cardColor),
          label: getBlockLabel(key, normalizedVal),
          timeLabel: formatTimeRange(blockStart, blockEnd),
          durationStr: formatDuration(blockEnd - blockStart),
          durationMin: Math.max(1, Math.round((blockEnd - blockStart) / 60000))
        });
        cumulativeLeft += widthPct;
      }
    };

    let currentVal = raw[0].value;
    let blockStart = startTs;

    for (let i = 0; i < raw.length; i++) {
        const pt = raw[i];
        if (pt.ts > blockStart) {
          pushBlock(blockStart, pt.ts, currentVal);
        }
        currentVal = pt.value;
        blockStart = Math.max(pt.ts, startTs);
    }

    if (endTs > blockStart) {
        pushBlock(blockStart, endTs, currentVal);
    }
  }
  return binaryBlocks;
}

