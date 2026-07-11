import { Component, Input, OnChanges } from "@angular/core";

@Component({
  selector: "tb-other-devices-panel",
  template: `
    <div class="other-devices-panel">
      <!-- Battery Alert Circle -->
      <div class="panel-battery-alert" *ngIf="lowBatteryDevices.length > 0" (click)="toggleBatteryPanel()">
        <i class="material-icons">battery_alert</i>
        <span class="badge">{{ lowBatteryDevices.length }}</span>
      </div>

      <!-- Battery Alert Dropdown Panel -->
      <div class="battery-dropdown" *ngIf="showBatteryPanel">
        <div class="dropdown-header">
           <span class="title-text">LOW BATTERY ALERTS</span>
           <i class="material-icons close-icon" (click)="toggleBatteryPanel()">close</i>
        </div>
        <div class="dropdown-list">
           <div class="dropdown-item" *ngFor="let dev of lowBatteryDevices">
              <i class="material-icons warning-icon">battery_1_bar</i>
              <div class="dev-info">
                 <span class="dev-name">{{ dev.name }}</span>
                 <span class="dev-loc"><i class="material-icons">location_on</i>{{ dev.location }}</span>
              </div>
              <span class="dev-bat">{{ dev.battery !== undefined && dev.battery !== null ? dev.battery + '%' : 'LOW' }}</span>
           </div>
        </div>
      </div>

      <div class="panel-side-label">
        <span>OTHER DEVICES</span>
      </div>

      <div class="devices-grid">
        <div class="room-rectangle" *ngFor="let room of types">
          <!-- Room Header -->
          <div class="room-header compact-header">
            <div class="room-header-text">
              <div class="room-location">
                <i class="material-icons">location_on</i>
                <span>{{ subLocationByRoom[room] }}</span>
              </div>
            </div>
            <span class="room-device-count">
              {{ groupedDevices[room]?.length || 0 }} Devices
            </span>
          </div>

          <!-- Room Content -->
          <div class="room-content">
            <!-- THERMOSTAT → compact cards -->
            <ng-container *ngIf="thermostatsByRoom[room]?.length > 0">
              <tb-compact-thermostat
                *ngFor="let dev of thermostatsByRoom[room]"
                [device]="dev"
              >
              </tb-compact-thermostat>
            </ng-container>

            <!-- ENV SENSORS → compact cards -->
            <ng-container *ngIf="envSensorsByRoom[room]?.length > 0">
              <tb-compact-env-sensor
                *ngFor="let dev of envSensorsByRoom[room]"
                [device]="dev"
              >
              </tb-compact-env-sensor>
            </ng-container>

            <!-- ALL OTHER TYPES → generic rows -->
            <ng-container *ngIf="sensorsByRoom[room]?.length > 0">
              <div class="device-row" *ngFor="let dev of sensorsByRoom[room]">
                <div class="device-status-dot" [ngClass]="dev.status"></div>
                <i class="material-icons device-icon">{{
                  getIcon(dev.type)
                }}</i>
                <span class="device-label" [title]="dev.name">{{
                  dev.name
                }}</span>
                <div class="device-value" *ngIf="getValue(dev)">
                  {{ getValue(dev) }}
                </div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./other-devices-panel.component.scss"],
  standalone: false,
})
export class OtherDevicesPanelComponent implements OnChanges {
  @Input() types: string[] = []; // In this context, 'types' is being passed as 'rooms'
  @Input() groupedDevices: Record<string, any[]> = {};

  showBatteryPanel = false;

  /* Precomputed per-room buckets — these were previously computed by template
     bindings that each re-filtered the device list twice per room on every
     change-detection cycle. Recomputed only when the @Inputs change. */
  subLocationByRoom: Record<string, string> = {};
  thermostatsByRoom: Record<string, any[]> = {};
  envSensorsByRoom: Record<string, any[]> = {};
  sensorsByRoom: Record<string, any[]> = {};
  lowBatteryDevices: any[] = [];

  ngOnChanges(): void {
    this.subLocationByRoom = {};
    this.thermostatsByRoom = {};
    this.envSensorsByRoom = {};
    this.sensorsByRoom = {};
    const alerts: any[] = [];

    for (const room of this.types) {
      const devices = this.groupedDevices[room] || [];
      const subLocation = this.computeSubLocation(devices);
      this.subLocationByRoom[room] = subLocation;
      this.thermostatsByRoom[room] = devices.filter((d) => d.type === "Thermostat");
      this.envSensorsByRoom[room] = devices.filter(
        (d) => d.type === "Air Monitor" || d.type === "Sensor"
      );
      this.sensorsByRoom[room] = devices.filter(
        (d) =>
          d.type !== "Thermostat" &&
          d.type !== "Air Monitor" &&
          d.type !== "Sensor"
      );

      for (const d of devices) {
        if (
          d.data?.batteryLow === true ||
          String(d.data?.battery_low).toLowerCase() === "true" ||
          (d.data?.battery !== undefined && d.data?.battery < 20)
        ) {
          alerts.push({
            name: d.name || "Unknown Device",
            location: subLocation,
            battery: d.data.battery,
          });
        }
      }
    }
    this.lowBatteryDevices = alerts;
  }

  toggleBatteryPanel() {
    this.showBatteryPanel = !this.showBatteryPanel;
  }

  private computeSubLocation(devices: any[]): string {
    const deviceWithLocation = devices.find(
      (d) => d.data?.location && String(d.data.location).trim().length > 0
    );
    return deviceWithLocation
      ? String(deviceWithLocation.data.location).toUpperCase()
      : "UNKNOWN";
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      "Window Sensor": "sensor_window",
      Thermostat: "thermostat",
      "Leak Sensor": "water_damage",
      "Noise Sensor": "settings_voice",
      "Air Monitor": "air",
      Occupancy: "person_search",
      Light: "lightbulb",
      Plug: "power",
      Sensor: "sensors",
    };
    return icons[type] || "devices";
  }

  getValue(dev: any): string | null {
    if (!dev?.data) return null;
    const d = dev.data;
    if (d.temp !== undefined) return `${d.temp}°`;
    if (d.temperature !== undefined) return `${d.temperature}°`;
    if (d.local_temperature !== undefined) return `${d.local_temperature}°`;
    if (d.current_heating_setpoint !== undefined)
      return `Set: ${d.current_heating_setpoint}°`;
    if (d.humidity !== undefined) return `${d.humidity}%`;
    if (d.co2 !== undefined) return `${d.co2}ppm`;
    if (d.illuminance !== undefined) return `${d.illuminance}lx`;
    if (d.battery !== undefined) return `${d.battery}%`;
    return null;
  }
}
