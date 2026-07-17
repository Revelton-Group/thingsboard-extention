import { Component, Input, OnChanges } from "@angular/core";
import { TranslationService } from "../../../core/services/translation.service";

@Component({
  selector: "tb-compact-env-sensor",
  templateUrl: "./compact-env-sensor.component.html",
  styleUrls: ["./compact-env-sensor.component.scss"],
  standalone: false,
})
export class CompactEnvSensorComponent implements OnChanges {
  @Input() device: any;

  constructor(private translationService: TranslationService) {}

  get t() {
    return this.translationService.t;
  }

  // ── Data accessors ──────────────────────────────────────────

  get currentTemp(): number | null {
    const d = this.device?.data;
    if (!d) return null;
    const v = d.temp ?? d.temperature ?? d.local_temperature ?? null;
    return v !== null && v !== undefined ? parseFloat(v) : null;
  }

  get currentHumidity(): number | null {
    const d = this.device?.data;
    if (!d) return null;
    const v = d.humidity ?? null;
    return v !== null && v !== undefined ? parseFloat(v) : null;
  }

  get battery(): number | null {
    const v =
      this.device?.data?.battery ??
      this.device?.data?.data_battery ??
      this.device?.data?.status_battery_level ??
      this.device?.data?.battery_level ??
      this.device?.data?.batteryLevel;
    const parsed = v !== null && v !== undefined ? parseFloat(v) : null;
    return parsed !== null && !isNaN(parsed) ? parsed : null;
  }

  get batteryLow(): boolean | null {
    const v =
      this.device?.data?.battery_low ??
      this.device?.data?.batteryLow ??
      this.device?.data?.data_battery_low ??
      this.device?.data?.status_battery_low ??
      this.device?.data?.low_battery ??
      this.device?.data?.battery_alarm ??
      this.device?.data?.status_battery_alarm ??
      this.device?.data?.batteryState ??
      this.device?.data?.battery_status ??
      this.device?.data?.battery_defect;
    if (v === null || v === undefined || v === "") return null;
    const valStr = String(v).toLowerCase().trim();
    if (valStr === "false" || valStr === "0" || valStr === "good" || valStr === "ok" || valStr === "normal") {
      return false;
    }
    return (
      v === true ||
      valStr === "true" ||
      v === 1 ||
      valStr === "1" ||
      valStr === "low" ||
      valStr === "alarm" ||
      valStr === "bad" ||
      valStr === "critical" ||
      valStr === "defect"
    );
  }

  get linkquality(): number | null {
    const v = this.device?.data?.linkquality;
    if (v === null || v === undefined || v === "") return null;
    const parsed = parseFloat(v);
    return isNaN(parsed) ? null : parsed;
  }

  get isOffline(): boolean {
    if (this.device?.status === "offline") return true;
    const active = this.device?.data?.active;
    if (active === false || active === "false" || active === 0 || active === "0") {
      return true;
    }
    const ts = this.device?.lastUpdateTs;
    if (ts) {
      return Date.now() - ts > 24 * 60 * 60 * 1000;
    }
    return false;
  }

  get deviceDisplayName(): string {
    return (this.device?.name || "Environment Sensor").toUpperCase();
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

  // ── Helpers ─────────────────────────────────────────

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
    if (lqi == null || isNaN(lqi)) return "ce-chip-gray";
    if (lqi >= 100) return "ce-chip-green";
    if (lqi >= 50) return "ce-chip-orange";
    return "ce-chip-gray";
  }

  getBatteryClass(): string {
    const bat = this.battery;
    if (bat == null) return "ce-chip-gray";
    if (bat <= 5 || this.batteryLow === true) return "ce-chip-orange";
    return "ce-chip-green";
  }

  getStatusColor(): string {
    if (this.isOffline) return "var(--text-muted, #94a3b8)";
    if (this.batteryLow || (this.battery !== null && this.battery <= 5)) {
      return "var(--warning, #f59e0b)";
    }
    return "var(--success, #10b981)"; // Green dot indicator
  }

  ngOnChanges(): void {
    // no-op
  }
}
