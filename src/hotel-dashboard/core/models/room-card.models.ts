export interface ThermostatDevice {
  entityName: string;
  displayName: string;
  currentTemp: number | null;
  targetTemp: number | null;
  /** Target the device last reported; differs from targetTemp while a change is pending */
  clientTargetTemp?: number | null;
  valveOpening?: number | null;
  systemMode: string;
  /** WT101 settings by shared attribute key */
  settings?: Record<string, { value: any; sync: 'confirmed' | 'pending' | 'failed' | null }>;
  /** Downlink status of all fields together, from the rule chain; null when nothing was ever set */
  sync?: 'confirmed' | 'pending' | 'failed' | null;
  syncError?: string;
  /** Fields not confirmed yet ("target, lock"), shown as the status tooltip */
  syncFields?: string;
  /** WT101s in the room (1 when the room asset is unknown), and whether they're controlled together */
  linkedCount?: number;
  linked?: boolean;
  alert?: { icon: string; label: string } | null;
  runningState: string;
  battery: number | null;
  batteryLow: boolean | null;
  linkquality: number | null;
  model: string;
  location: string | null;
  lastSeen: string | null;
  offline: boolean;
}
