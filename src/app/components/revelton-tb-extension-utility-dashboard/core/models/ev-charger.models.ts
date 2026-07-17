/**
 * EV Charger domain models for the Utility Devices dashboard.
 */

export type ChargingStatus = 'idle' | 'charging' | 'error' | 'unavailable';

/** Visual state of a single socket (Elios terminology: the station is the whole charger). */
export type SocketState = 'ready' | 'charging' | 'fault' | 'offline';

export interface EvChargerStats {
  deviceName: string;
  deviceId: string;
  chargingStatus: ChargingStatus;
  powerKw: number;
  energyKwh: number;
  sessionDurationMs: number;
  currentA: number;
  voltageV: number;
  rawTs?: Record<string, any[]>;
}

export interface SocketViewModel {
  name: string;               // 'Socket A'
  typeLabel: string;          // 'Type 2'
  state: SocketState;
  statusLabel: string;        // 'Ready' | 'Charging' | '⚠ Cable Error' | 'Offline'
  subLabel?: string;          // 'Available · limit 32 A' | fault hint | offline note
  sessionKw?: number | null;
  sessionKwh?: number | null;
  sessionUser?: string;       // username, falls back to RFID hex
  sessionDuration?: string;   // '1 h 08 m'
  usedCurrentA?: number | null;
}

export interface ChargerCardViewModel {
  deviceName: string;
  deviceId: string;
  deviceCode: string;         // model, e.g. 'CityCharge Mini 2'
  online: boolean;            // station_online AND data fresher than 20 min
  onlineLabel: string;        // 'Online' | 'Offline'
  syncedAgo: string;          // '4m ago'
  activePowerKw: number;
  lifetimeKwh: number | null;
  chargingTimeH: number | null;
  chargingTimeM: number | null;
  activeSessionCount: number;
  sockets: SocketViewModel[];
}

export interface DashboardViewModel {
  isLoading: boolean;
  propertyName: string;
  chargers: ChargerCardViewModel[];
  totalPowerKw: number;
  totalEnergyKwh: number;
  activeSockets: number;
  totalSockets: number;
  activeSessions: number;
  activeFaults: number;
}

export const DEFAULT_VIEW_MODEL = (): DashboardViewModel => ({
  isLoading: true,
  propertyName: '',
  chargers: [],
  totalPowerKw: 0,
  totalEnergyKwh: 0,
  activeSockets: 0,
  totalSockets: 0,
  activeSessions: 0,
  activeFaults: 0,
});
