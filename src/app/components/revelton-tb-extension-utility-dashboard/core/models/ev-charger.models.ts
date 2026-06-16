/**
 * EV Charger domain models for the Utility Devices dashboard.
 */

export type ChargingStatus = 'idle' | 'charging' | 'error' | 'unavailable';

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

export interface ChargerStationViewModel {
  name: string;
  status: ChargingStatus;
  statusLabel: string;
  statusReason?: string;
  powerKw?: number | null;
  deliveredKwh?: number | null;
  batteryPct?: number | null;
  sessionEuro?: number | null;
  sessionDurationFormatted?: string;
  chargingSince?: string;
}

export interface ChargerCardViewModel {
  deviceName: string;
  deviceId: string;
  deviceCode: string;
  stationA: ChargerStationViewModel;
  stationB: ChargerStationViewModel;
  heartbeatAgo: string;
}

export interface DashboardViewModel {
  isLoading: boolean;
  propertyName: string;
  chargers: ChargerCardViewModel[];
  totalPowerKw: number;
  totalEnergyKwh: number;
  activeChargers: number;
  totalChargers: number;
  totalRevenueEuro: number;
  activeFaults: number;
}

export const DEFAULT_VIEW_MODEL = (): DashboardViewModel => ({
  isLoading: true,
  propertyName: '',
  chargers: [],
  totalPowerKw: 0,
  totalEnergyKwh: 0,
  activeChargers: 0,
  totalChargers: 0,
  totalRevenueEuro: 0,
  activeFaults: 0,
});
