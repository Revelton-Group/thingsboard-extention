import { Component, Input } from "@angular/core";

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
                <span>{{ getSubLocation(room) }}</span>
              </div>
            </div>
            <span class="room-device-count">
              {{ groupedDevices[room]?.length || 0 }} Devices
            </span>
          </div>

          <!-- Room Content -->
          <div class="room-content">
            <!-- THERMOSTAT → compact cards -->
            <ng-container *ngIf="getThermostats(room).length > 0">
              <tb-compact-thermostat
                *ngFor="let dev of getThermostats(room)"
                [device]="dev"
              >
              </tb-compact-thermostat>
            </ng-container>

            <!-- ENV SENSORS → compact cards -->
            <ng-container *ngIf="getEnvSensors(room).length > 0">
              <tb-compact-env-sensor
                *ngFor="let dev of getEnvSensors(room)"
                [device]="dev"
              >
              </tb-compact-env-sensor>
            </ng-container>

            <!-- ALL OTHER TYPES → generic rows -->
            <ng-container *ngIf="getSensors(room).length > 0">
              <div class="device-row" *ngFor="let dev of getSensors(room)">
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
export class OtherDevicesPanelComponent {
  @Input() types: string[] = []; // In this context, 'types' is being passed as 'rooms'
  @Input() groupedDevices: Record<string, any[]> = {};

  showBatteryPanel = false;

  toggleBatteryPanel() {
    this.showBatteryPanel = !this.showBatteryPanel;
  }

  get lowBatteryDevices(): any[] {
    const alerts = [];
    for (const room of this.types) {
      const devices = this.groupedDevices[room] || [];
      for (const d of devices) {
        if (d.data?.batteryLow === true || String(d.data?.battery_low).toLowerCase() === 'true' || (d.data?.battery !== undefined && d.data?.battery < 20)) {
          alerts.push({
             name: d.name || 'Unknown Device',
             location: this.getSubLocation(room),
             battery: d.data.battery
          });
        }
      }
    }
    return alerts;
  }

  getBaseRoom(roomStr: string): string {
    if (!roomStr) return "UNKNOWN";
    // Splitting by the custom separator used in groupDevices()
    return roomStr.includes(" — ") ? roomStr.split(" — ")[0] : roomStr;
  }

  getSubLocation(roomStr: string): string {
    const devices = this.groupedDevices[roomStr] || [];
    const deviceWithLocation = devices.find(
      (d) => d.data?.location && String(d.data.location).trim().length > 0
    );
    return deviceWithLocation
      ? String(deviceWithLocation.data.location).toUpperCase()
      : "UNKNOWN";
  }

  getThermostats(room: string): any[] {
    return (this.groupedDevices[room] || []).filter(
      (d) => d.type === "Thermostat"
    );
  }

  getEnvSensors(room: string): any[] {
    return (this.groupedDevices[room] || []).filter(
      (d) => d.type === "Air Monitor" || d.type === "Sensor"
    );
  }

  getSensors(room: string): any[] {
    return (this.groupedDevices[room] || []).filter(
      (d) =>
        d.type !== "Thermostat" &&
        d.type !== "Air Monitor" &&
        d.type !== "Sensor"
    );
  }

  /** Hardcoded test device — remove once real data renders correctly */
  readonly testDevice = {
    name: "trv_office_1",
    type: "Thermostat",
    status: "online",
    room: "JLT-Office",
    data: {
      local_temperature: 22.5,
      current_heating_setpoint: 20.0,
      system_mode: "heat",
      running_state: "heating",
      battery: 75,
      linkquality: 120,
      model: "Tuya TS0601",
    },
  };

  readonly testDevice2 = {
    name: "trv_mop_1",
    type: "Thermostat",
    status: "online",
    room: "JLT-Public Places",
    data: {
      local_temperature: 18.4,
      current_heating_setpoint: 19.0,
      system_mode: "heat",
      running_state: "idle",
      battery: 60,
      linkquality: 100,
      model: "Tuya TS0601",
    },
  };

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
