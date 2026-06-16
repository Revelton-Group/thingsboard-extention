import { Component, Input, OnChanges } from "@angular/core";
import { TranslationService } from "../../../core/services/translation.service";

@Component({
  selector: "tb-compact-thermostat",
  templateUrl: "./compact-thermostat.component.html",
  styleUrls: ["./compact-thermostat.component.scss"],
  standalone: false,
})
export class CompactThermostatComponent implements OnChanges {
  @Input() device: any;

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  // ── Data accessors ──────────────────────────────────────────

  get currentTemp(): number | null {
    const d = this.device?.data;
    if (!d) return null;
    const v = d.local_temperature ?? d.temp ?? d.temperature ?? null;
    return v !== null && v !== undefined ? parseFloat(v) : null;
  }

  get setpoint(): number | null {
    const d = this.device?.data;
    if (!d) return null;
    const v = d.current_heating_setpoint ?? d.targetTemp ?? null;
    return v !== null && v !== undefined ? parseFloat(v) : null;
  }

  get systemMode(): string {
    return this.device?.data?.system_mode || "off";
  }

  get runningState(): string {
    return (
      this.device?.data?.running_state || this.device?.data?.runningState || ""
    );
  }

  get battery(): number | null {
    const v = this.device?.data?.battery;
    return v !== null && v !== undefined ? parseFloat(v) : null;
  }

  get batteryLow(): boolean | null {
    const v = this.device?.data?.battery_low ?? this.device?.data?.batteryLow;
    if (v === null || v === undefined || v === "") return false;
    return (
      v === true ||
      String(v).toLowerCase() === "true" ||
      v === 1 ||
      String(v) === "1"
    );
  }

  get linkquality(): number | null {
    const v = this.device?.data?.linkquality;
    if (v === null || v === undefined || v === "") return null;
    const parsed = parseFloat(v);
    return isNaN(parsed) ? null : parsed;
  }

  get isOffline(): boolean {
    const ts = this.device?.lastUpdateTs;
    if (ts) {
      return Date.now() - ts > 12 * 60 * 60 * 1000;
    }
    return false;
  }

  get locationLabel(): string {
    return (this.device?.data?.model || "TS0601").toUpperCase();
  }

  get deviceDisplayName(): string {
    return this.device?.name || "Thermostat";
  }

  get lastSeen(): string | null {
    const ts = this.device?.lastUpdateTs;
    if (!ts) return null;
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 10) return this.t.justNow;
    if (s < 60) return s + " " + this.t.secondsAgo;
    if (s < 3600) return Math.floor(s / 60) + " " + this.t.minutesAgo;
    if (s < 86400) return Math.floor(s / 3600) + " " + this.t.hoursAgo;
    return Math.floor(s / 86400) + " " + this.t.daysAgo;
  }

  // ── Colors & labels ─────────────────────────────────────────

  getTrvColor(): string {
    const state = (this.runningState || "").toLowerCase();
    const mode = (this.systemMode || "").toLowerCase();
    if (mode === "off") return "#8E8E93";
    if (state === "heat" || state === "heating") return "#FF9500";
    if (state === "cool" || state === "cooling") return "#06B6D4";
    if (state === "idle") return "#06B6D4";
    if (mode === "heat") return "#FF9500";
    if (mode === "cool") return "#06B6D4";
    return "#34C759";
  }

  getStatusLabel(): string {
    const s = (this.runningState || "").toLowerCase();
    if (s === "heat" || s === "heating") return this.t.heating.toUpperCase();
    if (s === "cool" || s === "cooling") return this.t.cooling.toUpperCase();
    if (s === "idle") return this.t.idle.toUpperCase();
    if (s === "off") return this.t.off.toUpperCase();
    const m = (this.systemMode || "").toLowerCase();
    if (m === "heat") return this.t.heat.toUpperCase();
    if (m === "cool") return this.t.cool.toUpperCase();
    if (m === "auto") return this.t.auto.toUpperCase();
    if (m === "off") return this.t.off.toUpperCase();
    return "";
  }

  getModeIcon(): string {
    const m = this.systemMode;
    if (m === "heat") return "local_fire_department";
    if (m === "cool") return "ac_unit";
    if (m === "auto") return "autorenew";
    return "power_settings_new";
  }

  getLinkQualityText(): string {
    const lqi = this.linkquality;
    if (lqi == null || isNaN(lqi)) return "--";
    if (lqi >= 150) return this.t.excellent;
    if (lqi >= 100) return this.t.good;
    if (lqi >= 50) return this.t.fair;
    return this.t.poor;
  }

  getLinkQualityClass(): string {
    const lqi = this.linkquality;
    if (lqi == null || isNaN(lqi)) return "ct-chip-gray";
    if (lqi >= 100) return "ct-chip-green";
    if (lqi >= 50) return "ct-chip-orange";
    return "ct-chip-gray";
  }

  ngOnChanges(): void {
    // no-op — kept for OnChanges interface consistency
  }
}
