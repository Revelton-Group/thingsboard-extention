export interface TrvMode {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface TrvPreset {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface ThermostatDevice {
  entityName: string;
  displayName: string;
  currentTemp: number | null;
  targetTemp: number | null;
  systemMode: string;
  runningState: string;
  preset: string;
  battery: number | null;
  batteryLow: boolean | null;
  linkquality: number | null;
  model: string;
  location: string | null;
  lastSeen: string | null;
  offline: boolean;
  ecoTemp?: number;
  comfortTemp?: number;

  modeOpen?: boolean;
  presetOpen?: boolean;
  _modeDropOpen?: boolean;
  _presetDropOpen?: boolean;
  rpcPending?: boolean;
  modeLockUntil?: number;
  presetLockUntil?: number;
  tempLockUntil?: number;
}

export interface AirQualitySensor {
  entityName: string;
  displayName: string;
  overall: string;
  overallColor: string;
  aqiScore: number | null;
  aqiDominant: string;
  temperature: number | null;
  humidity: number | null;
  co2: number | string;
  tvoc: number | string;
  pm25: number | string;
  pm10: number | string;
  light: number | string;
  pressure: number | string;
  model: string;
  location: string | null;
  battery: number | null;
  batteryLow: boolean | null;
  linkquality: number | null;
  lastSeen: string | null;
  offline: boolean;
}

export interface RoomSensor {
  type: 'window' | 'water' | 'noise';
  entityName: string;
  displayName: string;
  isOpen?: boolean;
  isLeak?: boolean;
  statusLabel: string;
  statusColor: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  battery: number | null;
  batteryLow: boolean | null;
  linkquality: number | null;
  model: string;
  location: string | null;
  lastSeen: string | null;
  offline: boolean;
  tamper?: boolean;
}

export interface RoomAlert {
  id: number;
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  time: string;
}
