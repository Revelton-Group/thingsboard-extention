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
