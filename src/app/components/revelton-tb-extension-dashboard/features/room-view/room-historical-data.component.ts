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
  @Input() deviceMeta: Record<string, any> = {};
  @Input() thermostats: any[] = [];
  @Input() aqSensors: any[] = [];
  @Input() tempDevices: Record<string, any> = {};
  @Input() humDevices: Record<string, any> = {};
  @Input() windowDevices: Record<string, any> = {};
  @Input() leakDevices: Record<string, any> = {};
  @Input() noiseDevices: Record<string, any> = {};
  @Input() plugDevices: Record<string, any> = {};
  @Input() checkedIn: boolean = false;
  @Input() timeRangeHours: number | 'custom' = 24;
  @Input() customStartTs?: number;
  @Input() customEndTs?: number;

  loading = false;
  error: string | null = null;
  metricCards: any[] = [];

  windowDeviceOptions: { entityName: string; label: string }[] = [];
  selectedWindowEntity: string | null = null;

  leakDeviceOptions: { entityName: string; label: string }[] = [];
  selectedLeakEntity: string | null = null;

  powerDeviceOptions: { entityName: string; label: string }[] = [];
  selectedPowerEntity: string | null = null;

  /** Bumped on every fetchData() call so a slow, stale request (e.g. from
   * the previously selected window) can't clobber a newer one's results. */
  private fetchSeq = 0;

  trackByCardKey(_index: number, card: any): string {
    return card.key;
  }

  getBinaryFormatter(key: string): (val: number) => string {
    return (val: number) => {
      const t: any = this.t;
      if (key === 'presence') {
        return val >= 1 ? (t.occupied || "Occupied") : (t.vacant || "Vacant");
      } else if (key === 'motion') {
        return val >= 1 ? (t.motionDetected || "Motion Detected") : (t.noMotion || "No Motion");
      } else if (key === 'leak') {
        return val >= 1 ? (t.leak || "Leak") : (t.normal || "Normal");
      }
      return val >= 1 ? (t.open || "Open") : (t.closed || "Closed");
    };
  }

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

    if (mapChange && mapChange.currentValue) {
    }

    if ((mapChange && !mapChange.firstChange && JSON.stringify(mapChange.currentValue) !== JSON.stringify(mapChange.previousValue)) ||
        (timeChange && !timeChange.firstChange)) {
      this.fetchData();
    }
  }

  private formatWindowLabel(entityName: string): string {
    const loc = this.deviceMeta?.[entityName]?.location;
    if (loc) {
      return loc.charAt(0).toUpperCase() + loc.slice(1);
    }
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

  selectLeakDevice(entityName: string) {
    if (this.selectedLeakEntity === entityName) return;
    this.selectedLeakEntity = entityName;
    this.fetchLeakCard();
  }

  /** Refetches telemetry for the currently selected window sensor only,
   * and replaces just the "window" card in metricCards in place. */
  private async fetchWindowCard() {
    const requestId = ++this.fetchSeq;

    const http = this.ctx?.http;
    const windowDeviceId = this.selectedWindowEntity && this.deviceEntityIdMap?.[this.selectedWindowEntity];
    if (!http || !windowDeviceId) return;

    let endTs = Date.now();
    let startTs = endTs - ((this.timeRangeHours as number) * 60 * 60 * 1000);
    let limit = 2000;

    if (this.timeRangeHours === 'custom' && this.customStartTs && this.customEndTs) {
      startTs = this.customStartTs;
      endTs = this.customEndTs;
      limit = 8000;
    }

    try {
      const data = await this.httpGet(http, `/api/plugins/telemetry/DEVICE/${windowDeviceId}/values/timeseries?keys=contact,data_contact,status,state&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);
      if (requestId !== this.fetchSeq) return;

      let windowRaw = (data && (data["contact"] || data["data_contact"] || data["status"] || data["state"])) || [];
      if (windowRaw.length === 0 && this.selectedWindowEntity && this.windowDevices?.[this.selectedWindowEntity] !== undefined) {
        const isOpen = this.windowDevices[this.selectedWindowEntity].contact === 'open';
        const valStr = isOpen ? 'open' : 'closed';
        windowRaw = [{ ts: startTs, value: valStr }, { ts: endTs, value: valStr }];
      }

      const normalized: Record<string, any[]> = { window: windowRaw };
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

  private async fetchLeakCard() {
    const requestId = ++this.fetchSeq;

    const http = this.ctx?.http;
    const leakDeviceId = this.selectedLeakEntity && this.deviceEntityIdMap?.[this.selectedLeakEntity];
    if (!http || !leakDeviceId) return;

    let endTs = Date.now();
    let startTs = endTs - ((this.timeRangeHours as number) * 60 * 60 * 1000);
    let limit = 2000;

    if (this.timeRangeHours === 'custom' && this.customStartTs && this.customEndTs) {
      startTs = this.customStartTs;
      endTs = this.customEndTs;
      limit = 8000;
    }

    try {
      const data = await this.httpGet(http, `/api/plugins/telemetry/DEVICE/${leakDeviceId}/values/timeseries?keys=waterLeak,leak,water_leak,data_leakage_status,contact,data_contact,status,state&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);
      if (requestId !== this.fetchSeq) return;

      let leakRaw = (data && (data["waterLeak"] || data["leak"] || data["water_leak"] || data["data_leakage_status"] || data["contact"] || data["data_contact"] || data["status"] || data["state"])) || [];
      if (leakRaw.length === 0 && this.selectedLeakEntity && this.leakDevices?.[this.selectedLeakEntity] !== undefined) {
        const isLeak = this.leakDevices[this.selectedLeakEntity].leak;
        const valStr = isLeak ? 'leak' : 'normal';
        leakRaw = [{ ts: startTs, value: valStr }, { ts: endTs, value: valStr }];
      }

      const normalized: Record<string, any[]> = { leak: leakRaw };
      const newCard = this.buildCard("leak", "Water Leak", "", "water_drop", "#f87171", 1, 1, normalized, startTs, endTs, true);

      const idx = this.metricCards.findIndex(c => c.key === "leak");
      if (idx >= 0) {
        const updated = [...this.metricCards];
        updated[idx] = newCard;
        this.metricCards = updated;
        this.cdr.detectChanges();
      }
    } catch (e) {
      if (requestId !== this.fetchSeq) return;
      console.error("[RoomHistoricalData] Leak fetch error:", e);
    }
  }

  private buildCard(
    key: string, label: string, unit: string, icon: string, color: string,
    thresholdWarn: number, thresholdCrit: number,
    normalized: Record<string, any[]>, startTs: number, endTs: number,
    isBinary: boolean = false, useLineChart: boolean = false
  ) {
    let raw = normalized[key] || [];

    let noiseMetrics: Record<string, any[]> | undefined;
    let availableMetrics: { key: string; label: string }[] | undefined;
    let activeMetric: string | undefined;

    if (key === "noise") {
      const laeqRaw = normalized["noise_laeq"] || raw;
      const laiRaw = normalized["noise_lai"] || [];
      const laimaxRaw = normalized["noise_laimax"] || [];
      noiseMetrics = {
        laeq: laeqRaw,
        lai: laiRaw.length ? laiRaw : laeqRaw,
        laimax: laimaxRaw.length ? laimaxRaw : laeqRaw
      };
      availableMetrics = [
        { key: "laeq", label: "LAeq" },
        { key: "lai", label: "LAI" },
        { key: "laimax", label: "LAImax" }
      ];
      activeMetric = "laeq";
      raw = laeqRaw;
    }

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
      eventMarkers,
      noiseMetrics,
      availableMetrics,
      activeMetric
    };
  }

  selectNoiseMetric(card: any, metricKey: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!card || card.key !== "noise" || !card.noiseMetrics) return;
    card.activeMetric = metricKey;
    const raw = card.noiseMetrics[metricKey] || [];
    const series = raw.map((d: any) => [d.ts, parseFloat(d.value)] as [number, number]).filter((d: any) => !isNaN(d[1]));
    const vals = series.map((d: any) => d[1]);
    const current = vals.length ? vals[vals.length - 1] : 0;
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 0;
    const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;

    const labelMap: Record<string, string> = { laeq: "LAeq", lai: "LAI", laimax: "LAImax" };
    const label = labelMap[metricKey] || card.label;

    card.data = [{ name: label, values: series }];
    card.hasData = series.length > 0;
    card.current = Math.round(current * 10) / 10;
    card.min = Math.round(min * 10) / 10;
    card.avg = Math.round(avg * 10) / 10;
    card.max = Math.round(max * 10) / 10;

    if (!card.hasData) {
      card.badgeText = "NO DATA";
      card.badgeClass = "nodata";
    } else if (current >= card.thresholdCrit) {
      card.badgeText = "CRITICAL";
      card.badgeClass = "critical";
    } else if (current >= card.thresholdWarn) {
      card.badgeText = "WARNING";
      card.badgeClass = "warning";
    } else {
      card.badgeText = "QUIET";
      card.badgeClass = "quiet";
    }
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

    let endTs = Date.now();
    let startTs = endTs - ((this.timeRangeHours as number) * 60 * 60 * 1000);
    let limit = 2000;

    if (this.timeRangeHours === 'custom' && this.customStartTs && this.customEndTs) {
      startTs = this.customStartTs;
      endTs = this.customEndTs;
      limit = 8000;
    }

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

    // Build the list of individual leak sensors the user can pick from
    const leakEntities = Object.keys(this.leakDevices || {})
      .filter(name => this.deviceEntityIdMap?.[name])
      .sort((a, b) => {
        const na = parseInt((a.match(/(\d+)$/) || [])[1] || "0", 10);
        const nb = parseInt((b.match(/(\d+)$/) || [])[1] || "0", 10);
        return na - nb;
      });
    this.leakDeviceOptions = leakEntities.map(name => ({ entityName: name, label: this.formatWindowLabel(name) }));
    if (!this.selectedLeakEntity || !leakEntities.includes(this.selectedLeakEntity)) {
      this.selectedLeakEntity = leakEntities[0] || null;
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
      const leakDeviceId = (this.selectedLeakEntity && this.deviceEntityIdMap?.[this.selectedLeakEntity]) || findId(/leak|ws303|bathroom|water/i);
      const occDeviceId = findId(/occupancy|presence|motion|pir|ws301|vs370/i);
      const powerDeviceIds = powerEntities.map(name => this.deviceEntityIdMap[name]).filter(Boolean);
      const co2DeviceId = findId(/co2/i) || aqDeviceId;
      const tvocDeviceId = findId(/tvoc|voc/i) || aqDeviceId;
      const pmDeviceId = findId(/pm2|pm10|particulate/i) || aqDeviceId;
      const pressureDeviceId = findId(/pressure|baro/i) || aqDeviceId;
      const luxDeviceId = findId(/lux|illuminance|light/i) || aqDeviceId;

      // Fetch telemetry
      const keysToFetch = "temperature,humidity,co2,iaq,tvoc,pm25,pm2_5,data_pm25,data_pm2_5,pm10,data_pm10,pressure,data_pressure,lux,illuminance,data_illuminance,light,data_light,light_level,data_light_level,noise,laeq,lai,laimax,data_laeq,data_LAeq,data_lai,data_LAI,data_laimax,data_LAImax,contact,data_contact,status,state,waterLeak,leak,water_leak,data_leakage_status,occupancy,presence,data_occupancy,data_pir,pir,motion,data_motion,power,active_power,data_active_power,load_power,data_power_consumption,energy,temp,hum,data_temperature,data_humidity,data_co2,data_iaq,data_tvoc";
      const safeFetch = async (id: string | null) => {
        if (!id) return null;
        try {
          return await this.httpGet(http, `/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${keysToFetch}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`);
        } catch { return null; }
      };

      const uniqueIds = [...new Set([aqDeviceId, tempDeviceId, humDeviceId, noiseDeviceId, windowDeviceId, leakDeviceId, occDeviceId, ...powerDeviceIds, co2DeviceId, tvocDeviceId, pmDeviceId, pressureDeviceId, luxDeviceId].filter(Boolean))];
      const results = await Promise.all(uniqueIds.map(id => safeFetch(id)));

      // Process Data
      const normalized: Record<string, any[]> = { temperature: [], humidity: [], co2: [], noise: [], tvoc: [], pm25: [], pm10: [], pressure: [], lux: [], window: [], leak: [], presence: [], motion: [], power: [], energy: [] };
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
        if (id === noiseDeviceId) {
          normalized["noise"] = data["noise"] || data["laeq"] || data["data_laeq"] || data["data_LAeq"] || data["data_LAI"] || data["data_LAImax"] || normalized["noise"];
          normalized["noise_laeq"] = data["laeq"] || data["data_laeq"] || data["data_LAeq"] || normalized["noise"];
          normalized["noise_lai"] = data["lai"] || data["data_lai"] || data["data_LAI"] || [];
          normalized["noise_laimax"] = data["laimax"] || data["data_laimax"] || data["data_LAImax"] || [];
        }
        if (id === windowDeviceId) normalized["window"] = data["contact"] || data["data_contact"] || data["status"] || data["state"] || normalized["window"];
        if (id === leakDeviceId) {
          // Same key resolution as fetchLeakCard() — leak sensors report under
          // several names, and some only publish contact/status/state. Only fall
          // back to those generic keys when the leak sensor isn't also the window
          // sensor, so a window's contact series can't be read as a leak series.
          const leakSpecific = data["waterLeak"] || data["leak"] || data["water_leak"] || data["data_leakage_status"];
          const leakGeneric = (id === windowDeviceId) ? null : (data["contact"] || data["data_contact"] || data["status"] || data["state"]);
          normalized["leak"] = leakSpecific || leakGeneric || normalized["leak"];
        }
        if (id === occDeviceId) normalized["presence"] = data["occupancy"] || data["presence"] || data["data_occupancy"] || data["data_pir"] || normalized["presence"];
        if (id === aqDeviceId || id === occDeviceId) {
           const motionData = data["data_pir"] || data["pir"] || data["motion"] || data["data_motion"];
           if (motionData && motionData.length > 0) {
           }
           normalized["motion"] = motionData || normalized["motion"];
        }
        if (powerDeviceIds.includes(id)) {
          powerDataBySocket[id] = data["power"] || data["active_power"] || data["data_active_power"] || data["load_power"] || [];
          energyDataBySocket[id] = data["data_power_consumption"] || data["energy"] || [];
        }
      });

      if (normalized["window"].length === 0 && this.selectedWindowEntity && this.windowDevices?.[this.selectedWindowEntity] !== undefined) {
        const isOpen = this.windowDevices[this.selectedWindowEntity].contact === 'open';
        const valStr = isOpen ? 'open' : 'closed';
        normalized["window"] = [{ ts: startTs, value: valStr }, { ts: endTs, value: valStr }];
      }

      if (normalized["leak"].length === 0 && this.selectedLeakEntity && this.leakDevices?.[this.selectedLeakEntity] !== undefined) {
        const isLeak = this.leakDevices[this.selectedLeakEntity].leak;
        const valStr = isLeak ? 'leak' : 'normal';
        normalized["leak"] = [{ ts: startTs, value: valStr }, { ts: endTs, value: valStr }];
      }

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
        this.buildCard("presence", "Presence Sensor", "", "person", "#60a5fa", 1, 1, normalized, startTs, endTs, true, true),
        this.buildCard("motion", "Motion Sensor", "", "person", "#a855f7", 1, 1, normalized, startTs, endTs, true, true),
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
    if (key === "leak") {
      const leakKeys = Object.keys(this.leakDevices || {});
      return (this.selectedLeakEntity && this.deviceEntityIdMap?.[this.selectedLeakEntity])
        || (leakKeys[0] && this.deviceEntityIdMap?.[leakKeys[0]])
        || findId(/leak|ws303|bathroom|water/i);
    }
    if (key === "presence") return findId(/occupancy|presence|motion|pir|ws301|vs370/i);
    if (key === "motion") return findId(/motion|pir/i) || aqDeviceId;
    if (key === "power" || key === "energy") {
      const plugNames = Object.keys(this.plugDevices || {});
      return (plugNames[0] && this.deviceEntityIdMap?.[plugNames[0]]) || findId(/socket|power|plug|switch/i);
    }
    return null;
  }

  openExpandedChart(card: any) {
    if (!card || !card.hasData) return;
    const cardCopy = { ...card, data: card.data ? [...card.data] : [] };
    this.dialog.open(ExpandedChartDialogComponent, {
      width: "800px",
      maxWidth: "95vw",
      panelClass: ["tb-dialog", "tb-expanded-chart-panel"],
      data: { card: cardCopy, timeRangeHours: this.timeRangeHours, parent: this }
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
              <option *ngFor="let opt of data.parent.windowDeviceOptions" [value]="opt.entityName" [selected]="modalWindowEntity === opt.entityName">{{ opt.label }}</option>
            </select>
          </div>

          <div *ngIf="data.card.key === 'leak' && data.parent.leakDeviceOptions?.length > 1" style="display: flex; align-items: center;">
            <select (change)="selectLeak($any($event.target).value)" style="border: 1px solid var(--border, #e5e7eb); padding: 6px 32px 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 600; cursor: pointer; appearance: none; background: transparent url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>') no-repeat right 10px center; background-size: 14px; color: var(--tx, #111827); outline: none; font-family: inherit;">
              <option *ngFor="let opt of data.parent.leakDeviceOptions" [value]="opt.entityName" [selected]="modalLeakEntity === opt.entityName">{{ opt.label }}</option>
            </select>
          </div>

          <div *ngIf="(data.card.key === 'power' || data.card.key === 'energy') && data.parent.powerDeviceOptions?.length > 1" style="display: flex; align-items: center;">
            <select (change)="selectPower($any($event.target).value === '' ? null : $any($event.target).value)" style="border: 1px solid var(--border, #e5e7eb); padding: 6px 32px 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 600; cursor: pointer; appearance: none; background: transparent url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>') no-repeat right 10px center; background-size: 14px; color: var(--tx, #111827); outline: none; font-family: inherit;">
              <option value="" [selected]="!modalPowerEntity">Total</option>
              <option *ngFor="let opt of data.parent.powerDeviceOptions" [value]="opt.entityName" [selected]="modalPowerEntity === opt.entityName">{{ opt.label }}</option>
            </select>
          </div>

          <div *ngIf="data.card.key === 'noise' && data.card.availableMetrics?.length > 1" style="display: flex; align-items: center; gap: 4px; background: var(--inner, #ffffff); border: 1px solid var(--border, #e5e7eb); padding: 4px; border-radius: 20px;">
            <button *ngFor="let opt of data.card.availableMetrics"
                    type="button"
                    (click)="selectNoise(opt.key); $event.preventDefault();"
                    [style.background]="opt.key === data.card.activeMetric ? 'var(--accent, #7c88ff)' : 'transparent'"
                    [style.color]="opt.key === data.card.activeMetric ? '#ffffff' : 'var(--t2, #4b5563)'"
                    style="border: none; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 16px; cursor: pointer; transition: all 0.2s;">
              {{ opt.label }}
            </button>
          </div>

          <div *ngIf="data.card.badgeText" [ngClass]="data.card.badgeClass" class="hist-badge" style="font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
            {{ data.card.badgeText }}
          </div>
          
          <div style="position: relative; display: flex; align-items: center; justify-content: flex-end;">
            <div style="display: flex; background: transparent; border: 1px solid var(--border, #e5e7eb); padding: 4px; border-radius: 24px; gap: 4px;">
              <button type="button" (click)="setRange(24); $event.preventDefault();" [style.background]="activeRange === 24 && !showCustomPicker ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 24 && !showCustomPicker ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">24H</button>
              <button type="button" (click)="setRange(168); $event.preventDefault();" [style.background]="activeRange === 168 && !showCustomPicker ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 168 && !showCustomPicker ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">7D</button>
              <button type="button" (click)="setRange(720); $event.preventDefault();" [style.background]="activeRange === 720 && !showCustomPicker ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 720 && !showCustomPicker ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">30D</button>
              <button type="button" (click)="toggleCustomPicker(); $event.preventDefault();" [style.background]="activeRange === 'custom' || showCustomPicker ? 'var(--accent, #7c88ff)' : 'transparent'" [style.color]="activeRange === 'custom' || showCustomPicker ? '#ffffff' : 'var(--t2, #4b5563)'" style="border: none; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">Custom</button>
            </div>
              <div *ngIf="showCustomPicker" style="position: absolute; top: calc(100% + 8px); right: 0; background: var(--inner, #ffffff); border: 1px solid var(--border, #e5e7eb); padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; display: flex; flex-direction: column; gap: 8px; min-width: 250px;">
              <span style="font-size: 12px; font-weight: 700; color: var(--tx, #111827);">Custom Range</span>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 11px; color: var(--t2, #4b5563); font-weight: 600;">Start</span>
                <div style="display: flex; gap: 4px; align-items: center;">
                  <input type="date" [(ngModel)]="customStartDate" style="flex: 1; min-width: 0; border: 1px solid var(--border, #e5e7eb); padding: 6px 8px; border-radius: 6px; font-size: 12px; font-family: inherit; background: var(--inner, #ffffff); color: var(--tx, #111827);">
                  <input type="text" maxlength="2" inputmode="numeric" [(ngModel)]="customStartHour" (change)="customStartHour = formatNum(customStartHour, 23)" style="width: 35px; border: 1px solid var(--border, #e5e7eb); padding: 6px 4px; border-radius: 6px; font-size: 12px; font-family: inherit; background: var(--inner, #ffffff); color: var(--tx, #111827); text-align: center; outline: none;">
                  <span style="color: var(--t2, #4b5563); font-weight: bold;">:</span>
                  <input type="text" maxlength="2" inputmode="numeric" [(ngModel)]="customStartMin" (change)="customStartMin = formatNum(customStartMin, 59)" style="width: 35px; border: 1px solid var(--border, #e5e7eb); padding: 6px 4px; border-radius: 6px; font-size: 12px; font-family: inherit; background: var(--inner, #ffffff); color: var(--tx, #111827); text-align: center; outline: none;">
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 11px; color: var(--t2, #4b5563); font-weight: 600;">End</span>
                <div style="display: flex; gap: 4px; align-items: center;">
                  <input type="date" [(ngModel)]="customEndDate" style="flex: 1; min-width: 0; border: 1px solid var(--border, #e5e7eb); padding: 6px 8px; border-radius: 6px; font-size: 12px; font-family: inherit; background: var(--inner, #ffffff); color: var(--tx, #111827);">
                  <input type="text" maxlength="2" inputmode="numeric" [(ngModel)]="customEndHour" (change)="customEndHour = formatNum(customEndHour, 23)" style="width: 35px; border: 1px solid var(--border, #e5e7eb); padding: 6px 4px; border-radius: 6px; font-size: 12px; font-family: inherit; background: var(--inner, #ffffff); color: var(--tx, #111827); text-align: center; outline: none;">
                  <span style="color: var(--t2, #4b5563); font-weight: bold;">:</span>
                  <input type="text" maxlength="2" inputmode="numeric" [(ngModel)]="customEndMin" (change)="customEndMin = formatNum(customEndMin, 59)" style="width: 35px; border: 1px solid var(--border, #e5e7eb); padding: 6px 4px; border-radius: 6px; font-size: 12px; font-family: inherit; background: var(--inner, #ffffff); color: var(--tx, #111827); text-align: center; outline: none;">
                </div>
              </div>
              <button type="button" (click)="applyCustomRange()" [disabled]="!hasCustomRangeChanged" [style.background]="hasCustomRangeChanged ? 'var(--accent, #7c88ff)' : '#9ca3af'" [style.cursor]="hasCustomRangeChanged ? 'pointer' : 'default'" style="margin-top: 4px; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; width: 100%;">Apply</button>
            </div>
          </div>

          <button type="button" mat-icon-button (click)="dialogRef.close()" style="background: var(--inner, #ffffff); border: 1px solid var(--border, #e5e7eb); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--tx, #374151);">
            <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Chart Card -->
      <div style="flex: 1; background: var(--inner, #ffffff); border-radius: 12px; border: 1px solid var(--border, #e5e7eb); padding: 16px 16px 0 16px; display: flex; flex-direction: column; min-height: 0;">
        <revelton-historical-chart
          *ngIf="!data.card.isBinary || data.card.useLineChart"
          style="flex: 1; min-height: 0;"
          [data]="data.card.data"
          [colors]="[data.card.color]"
          [type]="(data.card.key === 'power' || (data.card.isBinary && !data.card.useLineChart)) ? 'bar' : 'line'"
          [step]="data.card.useLineChart ? 'start' : false"
          [yAxisMin]="data.card.useLineChart ? 0 : undefined"
          [yAxisMax]="data.card.useLineChart ? 1 : undefined"
          [valueFormatter]="data.card.useLineChart ? data.parent.getBinaryFormatter(data.card.key) : undefined"
          [sparkline]="false"
          [area]="true"
          [showLegend]="false"
          [yAxisUnit]="data.card.unit">
        </revelton-historical-chart>

        <div *ngIf="data.card.isBinary && !data.card.useLineChart" style="flex: 1; min-height: 0; margin-top: 16px; display: flex; flex-direction: column;">
           <div class="binary-timeline" style="flex: 1; min-height: 0;">
             <div class="dot-grid"></div>
             <div class="top-tooltip" *ngIf="data.card.hoveredEvent">
                <div class="tt-time">{{ data.card.hoveredEvent.timeLabel }}</div>
                <div class="tt-val" [style.color]="data.card.hoveredEvent.color">{{ data.card.hoveredEvent.label }} &middot; {{ data.card.hoveredEvent.durationStr }}</div>
             </div>
             <div class="event-marker" *ngFor="let b of data.card.eventMarkers"
                  [style.left]="b.leftPct + '%'"
                  [style.width]="'max(3px, ' + b.widthPct + '%)'"
                  [style.background]="b.color"
                  (mouseenter)="data.card.hoveredEvent = b"
                  (mouseleave)="data.card.hoveredEvent = null">
             </div>
           </div>
           <!-- X-axis Labels -->
           <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #64748b; font-weight: 500;">
             <span *ngFor="let label of timeLabels">{{ label }}</span>
           </div>
        </div>
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
    .binary-timeline {
      position: relative;
      height: 100%;
      width: 100%;
      padding-bottom: 5px;
      overflow: visible;

      .dot-grid {
        position: absolute;
        inset: 0 0 5px 0;
        border-radius: 6px;
        background-image: radial-gradient(circle, var(--border, #e5e7eb) 1px, transparent 1px);
        background-size: 10px 10px;
        background-position: 4px 4px;
      }

      .event-marker {
        position: absolute;
        top: 25%;
        bottom: 25%;
        border-radius: 4px;
        opacity: 0.9;
        transition: opacity 0.2s, filter 0.2s;
        cursor: pointer;

        &:hover {
          opacity: 1;
          filter: brightness(0.85);
        }
      }

      .top-tooltip {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        background: #1e293b;
        color: #f8fafc;
        padding: 8px 12px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        z-index: 100;
        pointer-events: none;
        
        .tt-time { font-size: 11px; font-weight: 500; color: #cbd5e1; }
        .tt-val { font-size: 13px; font-weight: 700; }
      }
    }
  `],
  standalone: false
})
export class ExpandedChartDialogComponent {
  activeRange: number | 'custom' = 24;
  showCustomPicker: boolean = false;
  customStartDate: string = '';
  customStartHour: string = '00';
  customStartMin: string = '00';
  customEndDate: string = '';
  customEndHour: string = '00';
  customEndMin: string = '00';

  hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  get customStart(): string {
    return this.customStartDate ? `${this.customStartDate}T${this.customStartHour}:${this.customStartMin}` : '';
  }
  set customStart(val: string) {
    if (!val) return;
    const [date, time] = val.split('T');
    this.customStartDate = date;
    if (time) {
      const parts = time.split(':');
      this.customStartHour = parts[0] || '00';
      this.customStartMin = parts[1] || '00';
    }
  }

  get customEnd(): string {
    return this.customEndDate ? `${this.customEndDate}T${this.customEndHour}:${this.customEndMin}` : '';
  }
  set customEnd(val: string) {
    if (!val) return;
    const [date, time] = val.split('T');
    this.customEndDate = date;
    if (time) {
      const parts = time.split(':');
      this.customEndHour = parts[0] || '00';
      this.customEndMin = parts[1] || '00';
    }
  }

  appliedCustomStart: string = '';
  appliedCustomEnd: string = '';
  loading = false;
  modalWindowEntity: string = null;
  modalLeakEntity: string = null;
  modalPowerEntity: string = null;
  timeLabels: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<ExpandedChartDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cdr: ChangeDetectorRef
  ) {
    this.activeRange = this.data.timeRangeHours || 24;
    this.modalWindowEntity = this.data.parent?.selectedWindowEntity || null;
    this.modalLeakEntity = this.data.parent?.selectedLeakEntity || null;
    this.modalPowerEntity = null;
    this.updateTimeLabels(this.activeRange as number);
    
    // Initialize custom date pickers with the current 24H range as default
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    this.customEnd = this.formatDatetimeLocal(now);
    this.customStart = this.formatDatetimeLocal(yesterday);
  }

  get hasCustomRangeChanged(): boolean {
    const startTs = this.parseDatetimeLocal(this.customStart);
    const endTs = this.parseDatetimeLocal(this.customEnd);
    if (!startTs || !endTs || startTs >= endTs) return false;
    return this.customStart !== this.appliedCustomStart || this.customEnd !== this.appliedCustomEnd;
  }

  formatDatetimeLocal(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  formatNum(val: any, max: number): string {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    return num.toString().padStart(2, '0');
  }

  parseDatetimeLocal(str: string): number {
    if (!str) return 0;
    const d = new Date(str);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  toggleCustomPicker() {
    if (!this.customStart) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      this.customEnd = this.formatDatetimeLocal(now);
      this.customStart = this.formatDatetimeLocal(yesterday);
    }
    this.showCustomPicker = !this.showCustomPicker;
  }

  updateTimeLabels(hours: number, customStartTs?: number, customEndTs?: number) {
    const endTs = customEndTs || Date.now();
    const startTs = customStartTs || (endTs - (hours * 60 * 60 * 1000));
    const count = 6;
    this.timeLabels = [];
    for (let i = 0; i <= count; i++) {
      const ts = startTs + ((endTs - startTs) * (i / count));
      const d = new Date(ts);
      // If range is > 24 hours, show short month/day. Otherwise just time.
      if (endTs - startTs > 24 * 60 * 60 * 1000) {
        this.timeLabels.push(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      } else {
        this.timeLabels.push(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      }
    }
  }

  getIconBg(color: string): string {
    if (!color) return 'rgba(255,255,255,0.05)';
    return color + '1f';
  }

  async selectWindow(entityName: string) {
    if (this.modalWindowEntity === entityName) return;
    this.modalWindowEntity = entityName;
    const currentRange = this.activeRange;
    this.activeRange = -1; // force setRange to execute
    if (currentRange === 'custom') {
      this.applyCustomRange();
    } else {
      await this.setRange(currentRange as number);
    }
  }

  async selectLeak(entityName: string) {
    if (this.modalLeakEntity === entityName) return;
    this.modalLeakEntity = entityName;
    const currentRange = this.activeRange;
    this.activeRange = -1; // force setRange to execute
    if (currentRange === 'custom') {
      this.applyCustomRange();
    } else {
      await this.setRange(currentRange as number);
    }
  }

  async selectPower(entityName: string | null) {
    if (this.modalPowerEntity === entityName) return;
    this.modalPowerEntity = entityName;
    const currentRange = this.activeRange;
    this.activeRange = -1; 
    if (currentRange === 'custom') {
      this.applyCustomRange();
    } else {
      await this.setRange(currentRange as number);
    }
  }

  selectNoise(metricKey: string) {
    if (this.data.card.activeMetric === metricKey) return;
    this.data.parent.selectNoiseMetric(this.data.card, metricKey);
    this.data.card = { ...this.data.card };
    this.cdr.detectChanges();
  }

  applyCustomRange() {
    if (!this.customStart || !this.customEnd || !this.hasCustomRangeChanged) return;
    const startTs = this.parseDatetimeLocal(this.customStart);
    const endTs = this.parseDatetimeLocal(this.customEnd);
    if (!startTs || !endTs || startTs >= endTs) return;
    this.appliedCustomStart = this.customStart;
    this.appliedCustomEnd = this.customEnd;
    this.showCustomPicker = false;
    this.setRange('custom', startTs, endTs);
  }

  async setRange(hoursOrMode: number | 'custom', customStartTs?: number, customEndTs?: number) {
    if (hoursOrMode !== 'custom') {
      this.showCustomPicker = false;
    }
    if (this.activeRange === hoursOrMode && hoursOrMode !== 'custom') return;
    this.activeRange = hoursOrMode;
    this.loading = true;
    
    let startTs: number;
    let endTs: number;
    let limit: number;
    
    if (hoursOrMode === 'custom' && customStartTs && customEndTs) {
      startTs = customStartTs;
      endTs = customEndTs;
      limit = 8000;
      this.updateTimeLabels(0, startTs, endTs);
    } else {
      const hours = hoursOrMode as number;
      endTs = Date.now();
      startTs = endTs - (hours * 60 * 60 * 1000);
      limit = hours === 24 ? 2000 : (hours === 168 ? 4000 : 8000);
      this.updateTimeLabels(hours);
    }
    
    this.cdr.detectChanges();

    const parent = this.data.parent;
    const key = this.data.card.key;
    const keysToFetch = "temperature,humidity,co2,iaq,tvoc,pm25,pm2_5,data_pm25,data_pm2_5,pm10,data_pm10,pressure,data_pressure,lux,illuminance,data_illuminance,light,data_light,light_level,data_light_level,noise,laeq,data_LAeq,data_LAI,data_LAImax,contact,data_contact,waterLeak,leak,water_leak,data_leakage_status,status,state,occupancy,presence,data_occupancy,data_pir,pir,motion,data_motion,power,active_power,data_active_power,load_power,data_power_consumption,energy,temp,hum,data_temperature,data_humidity,data_co2,data_iaq,data_tvoc";

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
        } else if (key === "leak" && this.modalLeakEntity) {
          deviceId = parent.deviceEntityIdMap?.[this.modalLeakEntity];
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
        else if (key === "noise") raw = res["noise"] || res["laeq"] || res["data_laeq"] || res["data_LAeq"] || res["data_LAI"] || res["data_LAImax"] || [];
        else if (key === "window") {
          raw = res["contact"] || res["data_contact"] || res["status"] || res["state"] || [];
          if (raw.length === 0 && this.modalWindowEntity && parent.windowDevices?.[this.modalWindowEntity] !== undefined) {
            const isOpen = parent.windowDevices[this.modalWindowEntity].contact === 'open';
            const valStr = isOpen ? 'open' : 'closed';
            raw = [{ ts: startTs, value: valStr }, { ts: endTs, value: valStr }];
          }
        }
        else if (key === "leak") {
          raw = res["waterLeak"] || res["leak"] || res["water_leak"] || res["data_leakage_status"] || res["contact"] || res["data_contact"] || res["status"] || res["state"] || [];
          if (raw.length === 0 && this.modalLeakEntity && parent.leakDevices?.[this.modalLeakEntity] !== undefined) {
            const isLeak = parent.leakDevices[this.modalLeakEntity].leak;
            const valStr = isLeak ? 'leak' : 'normal';
            raw = [{ ts: startTs, value: valStr }, { ts: endTs, value: valStr }];
          }
        }
        else if (key === "presence") raw = res["occupancy"] || res["presence"] || res["data_occupancy"] || res["data_pir"] || [];
        else if (key === "motion") raw = res["data_pir"] || res["pir"] || res["motion"] || res["data_motion"] || [];
        else if (key === "power") raw = res["power"] || res["active_power"] || res["data_active_power"] || res["load_power"] || [];
        else if (key === "energy") raw = res["data_power_consumption"] || res["energy"] || [];

        const processedRaw = (key === "energy") ? raw.map((p: any) => ({ ...p, value: parseFloat(p.value) / 1000 })) : raw;

        let normObj: Record<string, any[]> = { [key]: processedRaw };
        if (key === "noise") {
          normObj = {
            noise: processedRaw,
            noise_laeq: res["laeq"] || res["data_laeq"] || res["data_LAeq"] || processedRaw,
            noise_lai: res["lai"] || res["data_lai"] || res["data_LAI"] || [],
            noise_laimax: res["laimax"] || res["data_laimax"] || res["data_LAImax"] || []
          };
        }

        const rebuilt = parent.buildCard(
          key, this.data.card.label, this.data.card.unit, this.data.card.icon, this.data.card.color,
          this.data.card.thresholdWarn, this.data.card.thresholdCrit, normObj, startTs, endTs,
          this.data.card.isBinary, this.data.card.useLineChart
        );
        if (this.data.card.activeMetric && rebuilt.noiseMetrics) {
          parent.selectNoiseMetric(rebuilt, this.data.card.activeMetric);
        }
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
  const s = String(rawVal).toLowerCase();
  let val = (rawVal === true || s === "true" || s === "open" || s === "occupied" || s === "active" || s === "on" || s === "motion" || s === "detected" || s === "alert" || s === "leak" || s === "leakage" || Number(rawVal) > 0) ? 1 : 0;
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
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${dateLabel}, ${h}:${m}`;
  };
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    const dateLabel = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeOnly = (d: Date) => {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
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

