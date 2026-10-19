import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface TranslationSet {
  // Common
  details: string;
  close: string;
  room: string;
  rooms: string;
  lastSync: string;
  loading: string;
  connectionError: string;
  retryConnection: string;

  // Dashboard Header/KPIs
  occupancy: string;
  checkInsToday: string;
  checkOutsToday: string;
  checkIn: string;
  checkOut: string;
  guestArrivals: string;
  guestDepartures: string;
  onlineOffline: string;
  batteryAlerts: string;
  mewsBridge: string;
  roomsSynced: string;
  appearance: string;
  palette: string;
  light: string;
  dark: string;

  // Room Card
  temperature: string;
  humidity: string;
  airQuality: string;
  waterLeak: string;
  leakDetected: string;
  noLeak: string;
  booked: string;
  vacant: string;
  windows: string;
  window: string;
  open: string;
  closed: string;
  co2: string;
  pm25: string;
  battery: string;
  guest: string;
  sensors: string;
  thermostat: string;
  targetL: string;
  synced: string;
  wtSending: string;
  wtFailed: string;
  wtWriteFailed: string;
  wtNotConfirmed: string;
  wtLinkAll: string;
  wtCopyAsk: string;
  yesL: string;
  noL: string;
  childLock: string;
  tempRange: string;
  openWindowDetect: string;
  freezeProtection: string;
  trvWindowOpen: string;
  trvRemoved: string;
  tampered: string;
  tamperedAlert: string;
  trvCalibration: string;
  thermostats: string;
  justNow: string;
  secondsAgo: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  hazardous: string;

  // Room Detail
  status: string;
  history: string;
  settings: string;

  // Shared Components
  noiseLevel: string;
  normal: string;
  loud: string;
  excellent: string;
  good: string;
  fair: string;
  poor: string;
  mode: string;
  auto: string;
  off: string;
  manual: string;
  event: string;
  time: string;
  severity: string;
  high: string;
  low: string;
  occupied: string;
  heating: string;
  cooling: string;
  idle: string;
  guestInRoom: string;
  checkoutPassed: string;
  arrivingToday: string;
  lateArrival: string;
  overdue: string;
  confirmed: string;
  started: string;
  optional: string;
  processed: string;
  canceled: string;
  shouldHaveArrivedAt: string;
  arrivingOn: string;
  overdueForCheckin: string;
  waitingForCheckin: string;
  checkedOut: string;
  reservationCanceled: string;
  in: string;
  at: string;
  checkout: string;
  alerts: string;

  // Weather
  clear: string;
  partlyCloudy: string;
  overcast: string;
  fog: string;
  drizzle: string;
  rain: string;
  snow: string;
  showers: string;
  thunderstorm: string;
  unknown: string;

  // Control Panel
  cpCritAlert: string;
  smartSockets: string;

  smartSocket: string;
  socketPowerHigh: string;
  cpOn: string;
  cpOff: string;

  // Control Panel — Design-aligned
  schedule: string;
  dayPeriod: string;
  nightPeriod: string;
  normalC: string;
  warningC: string;
  errorT: string;

  histSyncing: string;
  histTemp: string;
  histHumidity: string;
  histQuiet: string;
  histWaterLeak: string;
  noDatasource: string;
  presence: string;
  alertsActive: string;
  alertsNone: string;
  ackBtn: string;
  ackAll: string;
  ackLabel: string;
  sevCritical: string;
  sevWarnings: string;
  alertsHint: string;
  presenceSensor: string;
  dim: string;
  bright: string;
  noDevices: string;
  windowSensorsT: string;
  waterLeakSensorsT: string;
  noiseSensor: string;
  noData: string;
  retry: string;
  leak: string;
  motionDetected: string;
  noMotion: string;
  tileTemp: string;
  tileHumid: string;
  tileAir: string;
  tileThermo: string;
  tileWindow: string;
  tileCheck: string;
  tileBooked: string;
  tileWater: string;
  tileNoise: string;
  chkIn: string;
  chkOut: string;
  chkWait: string;
  stLeak: string;
  stOk: string;
  rangeCustom: string;
  rangeCustomTitle: string;
  rangeStart: string;
  rangeEnd: string;
  rangeApply: string;
  minL: string;
  avgL: string;
  maxL: string;
  overdueTag: string;
  offlineDevices: string;
  allDevicesOnline: string;
  bridgeStatus: string;
  historicalDataTitle: string;
  historicalTelemetry: string;
  noHistoricalData: string;
  powerTotal: string;
  lowBatteryAlertsTitle: string;
  otherDevicesTitle: string;
  devicesCount: string;
  statCritical: string;
  badgeNoData: string;
  badgeLeak: string;
  unitEvents: string;
  lblPressure: string;
  lblLux: string;
  lblMotionSensor: string;
  lblSocketPower: string;
  lblSocketEnergy: string;
  alertValueIsT: string;
  alertIsHighT: string;
  alertLevelHighT: string;
  alertNoiseT: string;
  alertMaxWord: string;
  lblNoise: string;
  lblMotion: string;

  // Control settings
  csTitle: string;
  csHotel: string;
  csGeneral: string;
  csHeating: string;
  csMews: string;
  csAir: string;
  csNoise: string;
  csWindow: string;
  csSocket: string;
  csBattery: string;
  csOffline: string;
  csTelegram: string;
  csSubGeneral: string;
  csSubHeating: string;
  csSubMews: string;
  csSubAir: string;
  csSubNoise: string;
  csSubWindow: string;
  csSubSocket: string;
  csSubBattery: string;
  csSubOffline: string;
  csSubTelegram: string;
  csRoomsOverride: string;
  csSave: string;
  csCancel: string;
  csChanges: string;
  csChangesHint: string;
  csFixToSave: string;
  csSaved: string;
  csSaveFailed: string;
  csNotReady: string;
  csLoadFailed: string;
  csNotSet: string;
  csErr_range: string;
  csErr_daily: string;
  csErr_time: string;
  csErr_type: string;
  csErr_order: string;
  csErr_unknown: string;
  csAdvanced: string;
  csHideAdvanced: string;
  csAdvBoost: string;
  csAdvPreheat: string;
  csAdvAdjust: string;
  csAdvSeason: string;
  csAdvBoostDeltaHint: string;
  csAdvTurnoverHint: string;
  csAdvPreheatMaxHint: string;
  csAdvAdjustMaxHint: string;
  csAdvSeasonHint: string;
  csAdvLookaheadHint: string;
  csModeTitle: string;
  csModeOff: string;
  csModeSafe: string;
  csModeLive: string;
  csModeOffShort: string;
  csModeSafeShort: string;
  csModeLiveShort: string;
  csModeOffHelp: string;
  csTargetTemps: string;
  csTargetTempsHint: string;
  csComfortTemp: string;
  csEcoTemp: string;
  csBoostTemp: string;
  csComfortHint: string;
  csEcoHint: string;
  csBoostHint: string;
  csBulkTitle: string;
  csBulkHint: string;
  csBulkAuto: string;
  csBulkManual: string;
  csBulkSent: string;
  csBulkFailed: string;
  csHeatMode: string;
  csReportLanguage: string;
  csReportLanguageHint: string;
  csTimezone: string;
  csTimezoneHint: string;
  csBoostDelta: string;
  csBoostExit: string;
  csBoostMax: string;
  csTurnoverGap: string;
  csRateWarm: string;
  csRateMild: string;
  csRateCold: string;
  csPreheatMin: string;
  csPreheatMax: string;
  csAdjustMax: string;
  csAdjustEvery: string;
  csSensorStale: string;
  csLookahead: string;
  csLatitude: string;
  csLongitude: string;
  csSeasonTemp: string;
  csSeasonStart: string;
  csSeasonEnd: string;
  csMewsInterval: string;
  csMewsHint: string;
  csNoBridge: string;
  csEnabled: string;
  csEnabledHint: string;
  csTempMin: string;
  csTempMax: string;
  csHumMin: string;
  csHumMax: string;
  csTempRange: string;
  csHumRange: string;
  csCo2Max: string;
  csTvocMax: string;
  csPm25Max: string;
  csPm10Max: string;
  csTvocHint: string;
  csTo: string;
  csDayPeriod: string;
  csDayPeriodHint: string;
  csDayStart: string;
  csDayEnd: string;
  csDay: string;
  csNight: string;
  csLimitsDb: string;
  csDayLaeq: string;
  csDayLai: string;
  csDayLaimax: string;
  csNightLaeq: string;
  csNightLai: string;
  csNightLaimax: string;
  csNoiseLegend: string;
  csWindowMax: string;
  csWindowHint: string;
  csWindowNoLimit: string;
  csPowerMax: string;
  csPowerHint: string;
  csBatteryMin: string;
  csBatteryHint: string;
  csOffDevice: string;
  csOffNormal: string;
  csOffAfter: string;
  csOffAm308: string;
  csOffWs302: string;
  csOffWt101: string;
  csOffWs523: string;
  csOffVs370: string;
  csOffWs301: string;
  csOffWs303: string;
  csOffRate10: string;
  csOffRate8: string;
  csOffRate12: string;
  csOffRateDaily: string;
  csOffNote: string;
  csTgTypes: string;
  csTgTiming: string;
  csTgWater: string;
  csTgNoise: string;
  csTgTemp: string;
  csTgHumidity: string;
  csTgCo2: string;
  csTgBattery: string;
  csTgSocket: string;
  csTgWindow: string;
  csTgOffline: string;
  csTgWaterHint: string;
  csTgDelayHint: string;
  csTgBatteryHint: string;
  csTgWindowHint: string;
  csTgOfflineHint: string;
  csNoiseAfter: string;
  csAirAfter: string;
  csNoiseAfterHint: string;
  csTgServerNote: string;
  csRoomSettings: string;
  csRoomHeating: string;
  csRoomFollows: string;
  csRoomOwn: string;
  csRoomValue: string;
  csBackToHotel: string;
  csHotelValue: string;
  csRoomLoadFailed: string;
}

@Injectable({
  providedIn: "root",
})
export class TranslationService {
  private languages = [
    { code: "EN", name: "English", flag: "🇬🇧" },
    { code: "RU", name: "Русский", flag: "🇷🇺" },
  ];

  private translations: Record<string, TranslationSet> = {
    EN: {
      details: "Details",
      close: "Close",
      room: "Room",
      rooms: "rooms",
      lastSync: "Last sync",
      loading: "Loading...",
      connectionError: "Cannot reach the server. Retrying…",
      retryConnection: "Retry",

      occupancy: "OCCUPANCY",
      checkInsToday: "CHECK-INS TODAY",
      checkOutsToday: "CHECK-OUTS TODAY",
      checkIn: "CHECK-IN",
      checkOut: "CHECK-OUT",
      guestArrivals: "guest arrivals",
      guestDepartures: "guest departures",
      onlineOffline: "Online / Offline",
      batteryAlerts: "Battery Alerts",
      mewsBridge: "Mews Bridge",
      roomsSynced: "rooms",
      appearance: "APPEARANCE",
      palette: "PALETTE",
      light: "Light",
      dark: "Dark",

      temperature: "Temperature",
      humidity: "Humidity",
      airQuality: "Air Quality",
      waterLeak: "WATER LEAK",
      leakDetected: "LEAK DETECTED",
      noLeak: "No Leak",
      booked: "BOOKED",
      vacant: "VACANT",
      windows: "WINDOWS",
      window: "Window",
      open: "OPEN",
      closed: "CLOSED",
      co2: "CO2",
      pm25: "PM2.5",
      battery: "BATTERY",
      guest: "Guest",
      sensors: "Sensors",
      thermostat: "Thermostat",
      targetL: "Target",
      synced: "Confirmed",
      wtSending: "Sending… ≤10 min",
      wtFailed: "Not delivered",
      wtWriteFailed: "Not saved",
      wtNotConfirmed: "Not confirmed",
      wtLinkAll: "Control all",
      wtCopyAsk: "Copy these settings to the others?",
      yesL: "Yes",
      noL: "No",
      childLock: "Child lock",
      tempRange: "Temp. range",
      openWindowDetect: "Open window detection",
      freezeProtection: "Freeze protection",
      trvWindowOpen: "Window open",
      trvRemoved: "Removed",
      tampered: "Tampered",
      tamperedAlert: "Sensor tampered or removed from its mount",
      trvCalibration: "Calibration failed",
      thermostats: "Thermostats",
      justNow: "Just now",
      secondsAgo: "sec ago",
      minutesAgo: "min ago",
      hoursAgo: "hr ago",
      daysAgo: "days ago",
      hazardous: "Hazardous",

      status: "Status",
      alerts: "Alerts",
      history: "History",
      settings: "Settings",

      noiseLevel: "Noise Level",
      normal: "Normal",
      loud: "Loud",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
      mode: "Mode",
      auto: "Auto",
      off: "Off",
      manual: "Manual",
      event: "Event",
      time: "Time",
      severity: "Severity",
      high: "High",
      low: "Low",
      occupied: "Occupied",
      heating: "Heating",
      cooling: "Cooling",
      idle: "Idle",
      guestInRoom: "Guest in room",
      checkoutPassed: "CHECK-OUT PASSED",
      arrivingToday: "Arriving today",
      lateArrival: "Late Arrival",
      overdue: "Overdue",
      confirmed: "Confirmed",
      started: "Started",
      optional: "Optional",
      processed: "Processed",
      canceled: "Canceled",
      shouldHaveArrivedAt: "should have arrived at",
      arrivingOn: "Arriving",
      overdueForCheckin: "Overdue for check-in",
      waitingForCheckin: "waiting for check-in",
      checkedOut: "Checked out",
      reservationCanceled: "Reservation canceled",
      in: "in",
      at: "at",
      checkout: "checkout",

      clear: "Clear",
      partlyCloudy: "Partly cloudy",
      overcast: "Overcast",
      fog: "Fog",
      drizzle: "Drizzle",
      rain: "Rain",
      snow: "Snow",
      showers: "Showers",
      thunderstorm: "Thunderstorm",
      unknown: "Unknown",

      cpCritAlert: "CRITICAL ALERT",
      smartSockets: "Smart Sockets",

      smartSocket: "Smart Socket",
      socketPowerHigh: "Power draw high",
      cpOn: "On",
      cpOff: "Off",

      schedule: "Schedule",
      dayPeriod: "Day",
      nightPeriod: "Night",
      normalC: "NORMAL",
      warningC: "WARNING",
      errorT: "Error",

      histSyncing: "Loading data...",
      histTemp: "Temperature",
      histHumidity: "Humidity",
      histQuiet: "Quiet",
      histWaterLeak: "Water Leak",
      noDatasource: "No data source",
      presence: "Presence",
      alertsActive: "Active Alerts",
      alertsNone: "No active alerts",
      ackBtn: "Ack",
      ackAll: "Acknowledge all",
      ackLabel: "Acknowledge alert",
      sevCritical: "Critical",
      sevWarnings: "Warnings",
      alertsHint: "Tap an alert to highlight its device.",
      presenceSensor: "Presence Sensor",
      dim: "Dim",
      bright: "Bright",
      noDevices: "No devices linked to this room",
      windowSensorsT: "Window Sensors",
      waterLeakSensorsT: "Water Leak Sensors",
      noiseSensor: "Noise Sensor",
      noData: "No Info",
      retry: "Retry Sync",
      leak: "Leak",
      motionDetected: "Motion Detected",
      noMotion: "No Motion",
      tileTemp: "TEMP",
      tileHumid: "HUMID",
      tileAir: "AIR",
      tileThermo: "THERMO",
      tileWindow: "WINDOW",
      tileCheck: "CHECK",
      tileBooked: "BOOKED",
      tileWater: "WATER",
      tileNoise: "NOISE",
      chkIn: "In",
      chkOut: "Out",
      chkWait: "Wait",
      stLeak: "LEAK!",
      stOk: "OK",
      rangeCustom: "Custom",
      rangeCustomTitle: "Custom Range",
      rangeStart: "Start",
      rangeEnd: "End",
      rangeApply: "Apply",
      minL: "MIN",
      avgL: "AVG",
      maxL: "MAX",
      overdueTag: "OVERDUE",
      offlineDevices: "Offline Devices",
      allDevicesOnline: "All devices online",
      bridgeStatus: "Status",
      historicalDataTitle: "Historical Data",
      historicalTelemetry: "HISTORICAL TELEMETRY",
      noHistoricalData: "No historical data",
      powerTotal: "Total",
      lowBatteryAlertsTitle: "LOW BATTERY ALERTS",
      otherDevicesTitle: "OTHER DEVICES",
      devicesCount: "Devices",
      statCritical: "CRITICAL",
      badgeNoData: "NO DATA",
      badgeLeak: "LEAK",
      unitEvents: "events",
      lblPressure: "Pressure",
      lblLux: "Lux",
      lblMotionSensor: "Motion Sensor",
      lblSocketPower: "Socket Power",
      lblSocketEnergy: "Socket Energy",
      alertValueIsT: "{name} is {value} ({level})",
      alertIsHighT: "{name} is high: {value} (Max: {limit})",
      alertLevelHighT: "{name} level is high: {value} (Max: {limit})",
      alertNoiseT: "Noise level ({name}) exceeded: {value} (Max: {limit})",
      alertMaxWord: "Max",
      lblNoise: "Noise",
      lblMotion: "Motion",
      // Control settings
      csTitle: "Control Settings",
      csHotel: "Hotel",
      csGeneral: "General",
      csHeating: "Heating",
      csMews: "Mews",
      csAir: "Air quality",
      csNoise: "Noise",
      csWindow: "Windows",
      csSocket: "Sockets",
      csBattery: "Battery",
      csOffline: "Offline",
      csTelegram: "Telegram",
      csSubGeneral: "Language of messages and the hotel clock.",
      csSubHeating: "Automation mode and the three target temperatures. Rooms can override Comfort and Eco.",
      csSubMews: "How often reservations are read from the PMS.",
      csSubAir: "AM308 sensors. A breach raises an Air Purity Level alarm and returns to normal when the value is back inside the limit.",
      csSubNoise: "WS302 sensors. Day and night have their own limits; the night period is everything outside the day period.",
      csSubWindow: "WS301 sensors. Checked on every report of the room air sensor, roughly every 10 minutes.",
      csSubSocket: "WS523 smart plugs.",
      csSubBattery: "One limit for every battery powered device.",
      csSubOffline: "How long a device may stay silent before it counts as offline. Devices report at different rates.",
      csSubTelegram: "Which messages are sent. Alarms are always raised in ThingsBoard; these switches only silence Telegram.",
      csRoomsOverride: "Rooms can override",
      csSave: "Save",
      csCancel: "Cancel",
      csChanges: "unsaved changes",
      csChangesHint: "written to the hotel asset, devices pick it up on their next report",
      csFixToSave: "fix the highlighted values to save",
      csSaved: "Saved",
      csSaveFailed: "Could not save. Check the connection and try again.",
      csNotReady: "The hotel asset is not resolved yet, so settings are read only.",
      csLoadFailed: "Settings could not be loaded.",
      csNotSet: "Not set",
      csErr_range: "Value is out of the allowed range.",
      csErr_daily: "At least 1500 min: this sensor reports once a day.",
      csErr_time: "Use the format shown.",
      csErr_type: "Enter a valid value.",
      csErr_order: "Min must be below max.",
      csErr_unknown: "Unknown setting.",
      csAdvanced: "Advanced: boost, pre-heat, room adjustment, season",
      csHideAdvanced: "Hide advanced",
      csAdvBoost: "Boost",
      csAdvPreheat: "Pre-heat",
      csAdvAdjust: "Room adjustment",
      csAdvSeason: "Heating season",
      csAdvBoostDeltaHint: "Boost begins when the room is this far below Comfort.",
      csAdvTurnoverHint: "After check-out.",
      csAdvPreheatMaxHint: "Used when the room temperature is unknown.",
      csAdvAdjustMaxHint: "0 turns adjustment off.",
      csAdvSeasonHint: "Yesterday, today and tomorrow all below it.",
      csAdvLookaheadHint: "Matches the thermostat report interval.",
      csModeTitle: "Automation mode",
      csModeOff: "Off",
      csModeSafe: "Safe",
      csModeLive: "Live",
      csModeOffShort: "Automation stopped.",
      csModeSafeShort: "Decisions are calculated and stored on the room, nothing is sent to thermostats.",
      csModeLiveShort: "Fully active. Targets are sent to thermostats.",
      csModeOffHelp: "Automation stopped. Thermostats keep their last target.",
      csTargetTemps: "Target temperatures",
      csTargetTempsHint: "Comfort and Eco can be set per room",
      csComfortTemp: "Comfort",
      csEcoTemp: "Eco",
      csBoostTemp: "Boost",
      csComfortHint: "Room is sold, until check-out",
      csEcoHint: "Room is not sold tonight",
      csBoostHint: "Quick warm-up target",
      csBulkTitle: "All thermostats",
      csBulkHint: "Each thermostat applies it on its next report, within about 10 minutes.",
      csBulkAuto: "Set all to Auto",
      csBulkManual: "Set all to Manual",
      csBulkSent: "Sent, applies within 10 min",
      csBulkFailed: "Not sent",
      csHeatMode: "Automation mode",
      csReportLanguage: "Message language",
      csReportLanguageHint: "Telegram alarms, offline notices and the morning report.",
      csTimezone: "Hotel time zone",
      csTimezoneHint: "IANA name. Heating, day and night noise limits and the battery message hour use it.",
      csBoostDelta: "Start when colder than Comfort by",
      csBoostExit: "Stop when within",
      csBoostMax: "Longest boost",
      csTurnoverGap: "Keep Comfort if next guest arrives within",
      csRateWarm: "Heating speed, outdoors 10 °C or more",
      csRateMild: "Heating speed, outdoors 0 to 10 °C",
      csRateCold: "Heating speed, below 0 °C or unknown",
      csPreheatMin: "Shortest pre-heat",
      csPreheatMax: "Longest pre-heat",
      csAdjustMax: "Largest deviation from Comfort",
      csAdjustEvery: "One 1 °C step at most every",
      csSensorStale: "Use the thermostat sensor after air sensor silence of",
      csLookahead: "Look ahead",
      csLatitude: "Latitude",
      csLongitude: "Longitude",
      csSeasonTemp: "Season opens below an average of",
      csSeasonStart: "Season start (MM-DD)",
      csSeasonEnd: "Season end (MM-DD)",
      csMewsInterval: "Read reservations every",
      csMewsHint: "Applies at once. Written to the Mews bridge device.",
      csNoBridge: "The Mews bridge was not found, so this value cannot be changed.",
      csEnabled: "Check this section",
      csEnabledHint: "Off means no limits of this section are checked.",
      csTempMin: "Temperature, lower limit",
      csTempMax: "Temperature, upper limit",
      csHumMin: "Humidity, lower limit",
      csHumMax: "Humidity, upper limit",
      csTempRange: "Temperature",
      csHumRange: "Humidity",
      csCo2Max: "CO₂ up to",
      csTvocMax: "TVOC up to",
      csPm25Max: "PM2.5 up to",
      csPm10Max: "PM10 up to",
      csTvocHint: "The AM308 reports a level, starting at 1.",
      csTo: "to",
      csDayPeriod: "Day period",
      csDayPeriodHint: "Night is the rest of the day.",
      csDayStart: "Day starts",
      csDayEnd: "Day ends",
      csDay: "Day",
      csNight: "Night",
      csLimitsDb: "Limits in dB",
      csDayLaeq: "Day, average (LAeq)",
      csDayLai: "Day, impulse (LAI)",
      csDayLaimax: "Day, peak (LAImax)",
      csNightLaeq: "Night, average (LAeq)",
      csNightLai: "Night, impulse (LAI)",
      csNightLaimax: "Night, peak (LAImax)",
      csNoiseLegend: "LAeq is the average level, LAI the impulse level, LAImax the loudest peak.",
      csWindowMax: "Alarm when open longer than",
      csWindowHint: "0 alarms the moment a window opens. The alarm may arrive up to 10 minutes after the limit.",
      csWindowNoLimit: "No limit is set, so windows are not checked",
      csPowerMax: "Overload above",
      csPowerHint: "Raises a Socket Overload alarm.",
      csBatteryMin: "Low battery at or below",
      csBatteryHint: "One message per device per day, between 10:00 and 19:00 hotel time.",
      csOffDevice: "Device",
      csOffNormal: "Normal report",
      csOffAfter: "Offline after",
      csOffAm308: "Air sensor (AM308)",
      csOffWs302: "Noise sensor (WS302)",
      csOffWt101: "Thermostat (WT101)",
      csOffWs523: "Socket (WS523)",
      csOffVs370: "Motion sensor (VS370)",
      csOffWs301: "Window sensor (WS301)",
      csOffWs303: "Water sensor (WS303)",
      csOffRate10: "every 10 min",
      csOffRate8: "about 8 min",
      csOffRate12: "about 12 min",
      csOffRateDaily: "on change, else daily",
      csOffNote: "Other models use offline_<model>_min and default to 1560 min. A message goes out after two failed checks and repeats every 6 hours.",
      csTgTypes: "Message types",
      csTgTiming: "Timing",
      csTgWater: "Water leak",
      csTgNoise: "Noise",
      csTgTemp: "Temperature",
      csTgHumidity: "Humidity",
      csTgCo2: "CO₂, TVOC and dust",
      csTgBattery: "Battery",
      csTgSocket: "Socket overload",
      csTgWindow: "Open window",
      csTgOffline: "Device offline",
      csTgWaterHint: "Immediately, and when it ends.",
      csTgDelayHint: "After the delay below.",
      csTgBatteryHint: "Once a day per device.",
      csTgWindowHint: "When the limit passes, and when it closes.",
      csTgOfflineHint: "Hotel wide. The morning report keeps its list.",
      csNoiseAfter: "Send noise message after",
      csAirAfter: "Send air message after",
      csNoiseAfterHint: "Continuous noise for this long. Short noise is not reported.",
      csTgServerNote: "The bot token and the group are set on the server, not here.",
      csRoomSettings: "Room settings",
      csRoomHeating: "Heating automation in this room",
      csRoomFollows: "follows hotel",
      csRoomOwn: "own",
      csRoomValue: "Room value",
      csBackToHotel: "Back to hotel value",
      csHotelValue: "Hotel",
      csRoomLoadFailed: "Room settings could not be loaded.",
    },
    RU: {
      details: "Детали",
      close: "Закрыть",
      room: "Комната",
      rooms: "комнат",
      lastSync: "Синхр.",
      loading: "Загрузка...",
      connectionError: "Нет связи с сервером. Повтор…",
      retryConnection: "Повторить",

      occupancy: "ЗАГРУЗКА ОТЕЛЯ",
      checkInsToday: "ЗАЕЗДЫ СЕГОДНЯ",
      checkOutsToday: "ВЫЕЗДЫ СЕГОДНЯ",
      checkIn: "ЗАЕЗД",
      checkOut: "ВЫЕЗД",
      guestArrivals: "прибытия гостей",
      guestDepartures: "отъезды гостей",
      onlineOffline: "Онлайн / Оффлайн",
      batteryAlerts: "Заряд батареи",
      mewsBridge: "Интеграция Mews",
      roomsSynced: "комнат синхр.",
      appearance: "ОФОРМЛЕНИЕ",
      palette: "ПАЛИТРА",
      light: "Светлая",
      dark: "Темная",

      temperature: "Температура",
      humidity: "Влажность",
      airQuality: "Качество воздуха",
      waterLeak: "УТЕЧКА ВОДЫ",
      leakDetected: "УТЕЧКА!",
      noLeak: "Норма",
      booked: "ЗАНЯТ",
      vacant: "СВОБОДЕН",
      windows: "ОКНА",
      window: "Окно",
      open: "ОТКРЫТО",
      closed: "ЗАКРЫТО",
      co2: "CO2",
      pm25: "PM2.5",
      battery: "ЗАРЯД",
      guest: "Гость",
      sensors: "Датчики",
      thermostat: "Термостат",
      targetL: "Цель",
      synced: "Подтверждено",
      wtSending: "Отправка… ≤10 мин",
      wtFailed: "Не доставлено",
      wtWriteFailed: "Не сохранено",
      wtNotConfirmed: "Не подтверждено",
      wtLinkAll: "Управлять всеми",
      wtCopyAsk: "Скопировать эти настройки на другие?",
      yesL: "Да",
      noL: "Нет",
      childLock: "Блокировка",
      tempRange: "Диапазон",
      openWindowDetect: "Открытое окно",
      freezeProtection: "Защита от замерзания",
      trvWindowOpen: "Окно открыто",
      trvRemoved: "Снят",
      tampered: "Вскрыт",
      tamperedAlert: "Датчик вскрыт или снят с крепления",
      trvCalibration: "Ошибка калибровки",
      thermostats: "Термостаты",
      justNow: "Только что",
      secondsAgo: "сек. назад",
      minutesAgo: "мин. назад",
      hoursAgo: "ч. назад",
      daysAgo: "дн. назад",
      hazardous: "Опасно",

      status: "Статус",
      alerts: "Алерты",
      history: "История",
      settings: "Настройки",

      noiseLevel: "Уровень шума",
      normal: "Норма",
      loud: "Шумно",
      excellent: "Отлично",
      good: "Хорошо",
      fair: "Средне",
      poor: "Плохо",
      mode: "Режим",
      auto: "Авто",
      off: "Выкл",
      manual: "Ручной",
      event: "Событие",
      time: "Время",
      severity: "Важность",
      high: "Высокая",
      low: "Низкая",
      occupied: "Занято",
      heating: "Нагрев",
      cooling: "Охлаждение",
      idle: "Ожидание",
      guestInRoom: "Гость в комнате",
      checkoutPassed: "ВРЕМЯ ВЫЕЗДА ПРОШЛО",
      arrivingToday: "Заезд сегодня",
      lateArrival: "Опаздывает",
      overdue: "Просрочено",
      confirmed: "Подтверждено",
      started: "Заселен",
      optional: "Опционально",
      processed: "Завершено",
      canceled: "Отменено",
      shouldHaveArrivedAt: "должен был прибыть в",
      arrivingOn: "Прибытие",
      overdueForCheckin: "Заезд просрочен",
      waitingForCheckin: "ожидание заезда",
      checkedOut: "Выехал",
      reservationCanceled: "Бронь отменена",
      in: "через",
      at: "в",
      checkout: "выезд",

      clear: "Ясно",
      partlyCloudy: "Переменная облачность",
      overcast: "Пасмурно",
      fog: "Туман",
      drizzle: "Морось",
      rain: "Дождь",
      snow: "Снег",
      showers: "Ливень",
      thunderstorm: "Гроза",
      unknown: "Неизвестно",

      cpCritAlert: "КРИТИЧЕСКАЯ ТРЕВОГА",
      smartSockets: "Умные розетки",

      smartSocket: "Умная розетка",
      socketPowerHigh: "Высокое энергопотребление",
      cpOn: "Вкл",
      cpOff: "Выкл",

      schedule: "Расписание",
      dayPeriod: "День",
      nightPeriod: "Ночь",
      normalC: "НОРМА",
      warningC: "ВНИМАНИЕ",
      errorT: "Ошибка",

      histSyncing: "Загрузка данных...",
      histTemp: "Температура",
      histHumidity: "Влажность",
      histQuiet: "Тихо",
      histWaterLeak: "Утечка воды",
      noDatasource: "Источник данных не найден",
      presence: "Присутствие",
      alertsActive: "Активные предупреждения",
      alertsNone: "Нет активных предупреждений",
      ackBtn: "Принять",
      ackAll: "Принять все",
      ackLabel: "Принять предупреждение",
      sevCritical: "Критические",
      sevWarnings: "Предупреждения",
      alertsHint: "Нажмите на предупреждение, чтобы выделить устройство.",
      presenceSensor: "Датчик присутствия",
      dim: "Тускло",
      bright: "Светло",
      noDevices: "К этой комнате не привязаны устройства",
      windowSensorsT: "Датчики окон",
      waterLeakSensorsT: "Датчики протечки",
      noiseSensor: "Датчик шума",
      noData: "Нет данных",
      retry: "Повторить",
      leak: "Протечка",
      motionDetected: "Движение",
      noMotion: "Нет движения",
      tileTemp: "ТЕМП.",
      tileHumid: "ВЛАЖН.",
      tileAir: "ВОЗДУХ",
      tileThermo: "ТЕРМО",
      tileWindow: "ОКНО",
      tileCheck: "ЗАЕЗД",
      tileBooked: "БРОНЬ",
      tileWater: "ВОДА",
      tileNoise: "ШУМ",
      chkIn: "Внутри",
      chkOut: "Выехал",
      chkWait: "Ждём",
      stLeak: "ПРОТЕЧКА!",
      stOk: "ОК",
      rangeCustom: "Период",
      rangeCustomTitle: "Произвольный период",
      rangeStart: "Начало",
      rangeEnd: "Конец",
      rangeApply: "Применить",
      minL: "МИН",
      avgL: "СРЕД",
      maxL: "МАКС",
      overdueTag: "ПРОСРОЧЕНО",
      offlineDevices: "Устройства офлайн",
      allDevicesOnline: "Все устройства онлайн",
      bridgeStatus: "Статус",
      historicalDataTitle: "Исторические данные",
      historicalTelemetry: "ИСТОРИЯ ТЕЛЕМЕТРИИ",
      noHistoricalData: "Нет исторических данных",
      powerTotal: "Все",
      lowBatteryAlertsTitle: "НИЗКИЙ ЗАРЯД",
      otherDevicesTitle: "ДРУГИЕ УСТРОЙСТВА",
      devicesCount: "устройств",
      statCritical: "КРИТИЧНО",
      badgeNoData: "НЕТ ДАННЫХ",
      badgeLeak: "ПРОТЕЧКА",
      unitEvents: "событий",
      lblPressure: "Давление",
      lblLux: "Освещённость",
      lblMotionSensor: "Датчик движения",
      lblSocketPower: "Мощность розетки",
      lblSocketEnergy: "Энергия розетки",
      alertValueIsT: "{name}: {value} ({level})",
      alertIsHighT: "{name}: выше нормы — {value} (макс.: {limit})",
      alertLevelHighT: "Высокий уровень {name}: {value} (макс.: {limit})",
      alertNoiseT: "Превышен уровень шума ({name}): {value} (макс.: {limit})",
      alertMaxWord: "макс.",
      lblNoise: "Шум",
      lblMotion: "Движение",
      // Control settings
      csTitle: "Настройки управления",
      csHotel: "Отель",
      csGeneral: "Общие",
      csHeating: "Отопление",
      csMews: "Mews",
      csAir: "Качество воздуха",
      csNoise: "Шум",
      csWindow: "Окна",
      csSocket: "Розетки",
      csBattery: "Батарея",
      csOffline: "Нет связи",
      csTelegram: "Telegram",
      csSubGeneral: "Язык сообщений и часы отеля.",
      csSubHeating: "Режим автоматики и три целевые температуры. Номера могут переопределять Комфорт и Эко.",
      csSubMews: "Как часто бронирования читаются из PMS.",
      csSubAir: "Датчики AM308. Превышение создаёт тревогу качества воздуха; она закрывается, когда значение возвращается в норму.",
      csSubNoise: "Датчики WS302. У дня и ночи свои лимиты; ночь это всё время вне дневного периода.",
      csSubWindow: "Датчики WS301. Проверяется при каждом отчёте датчика воздуха номера, примерно раз в 10 минут.",
      csSubSocket: "Умные розетки WS523.",
      csSubBattery: "Один порог для всех устройств на батарее.",
      csSubOffline: "Как долго устройство может молчать, прежде чем считаться недоступным. Устройства отчитываются с разной частотой.",
      csSubTelegram: "Какие сообщения отправляются. Тревоги всегда создаются в ThingsBoard; переключатели лишь отключают Telegram.",
      csRoomsOverride: "Номера могут переопределять",
      csSave: "Сохранить",
      csCancel: "Отмена",
      csChanges: "несохранённых изменений",
      csChangesHint: "записывается в актив отеля, устройства применят при следующем отчёте",
      csFixToSave: "исправьте выделенные значения, чтобы сохранить",
      csSaved: "Сохранено",
      csSaveFailed: "Не удалось сохранить. Проверьте соединение и повторите.",
      csNotReady: "Актив отеля ещё не определён, настройки доступны только для чтения.",
      csLoadFailed: "Не удалось загрузить настройки.",
      csNotSet: "Не задано",
      csErr_range: "Значение вне допустимого диапазона.",
      csErr_daily: "Не менее 1500 мин: этот датчик отчитывается раз в сутки.",
      csErr_time: "Используйте показанный формат.",
      csErr_type: "Введите корректное значение.",
      csErr_order: "Минимум должен быть меньше максимума.",
      csErr_unknown: "Неизвестная настройка.",
      csAdvanced: "Дополнительно: буст, предпрогрев, корректировка, сезон",
      csHideAdvanced: "Скрыть дополнительные",
      csAdvBoost: "Буст",
      csAdvPreheat: "Предпрогрев",
      csAdvAdjust: "Корректировка по номеру",
      csAdvSeason: "Сезон отопления",
      csAdvBoostDeltaHint: "Буст начинается, когда в номере холоднее Комфорта на это значение.",
      csAdvTurnoverHint: "После выезда.",
      csAdvPreheatMaxHint: "Используется, если температура номера неизвестна.",
      csAdvAdjustMaxHint: "0 отключает корректировку.",
      csAdvSeasonHint: "Вчера, сегодня и завтра ниже этого значения.",
      csAdvLookaheadHint: "Совпадает с интервалом отчёта термостата.",
      csModeTitle: "Режим автоматики",
      csModeOff: "Выкл",
      csModeSafe: "Безопасный",
      csModeLive: "Рабочий",
      csModeOffShort: "Автоматика остановлена.",
      csModeSafeShort: "Решения считаются и сохраняются в номере, термостатам ничего не отправляется.",
      csModeLiveShort: "Полностью включена. Цели отправляются термостатам.",
      csModeOffHelp: "Автоматика остановлена. Термостаты сохраняют последнюю цель.",
      csTargetTemps: "Целевые температуры",
      csTargetTempsHint: "Комфорт и Эко можно задать для номера",
      csComfortTemp: "Комфорт",
      csEcoTemp: "Эко",
      csBoostTemp: "Буст",
      csComfortHint: "Номер продан, до выезда",
      csEcoHint: "Номер не продан на ночь",
      csBoostHint: "Цель для быстрого прогрева",
      csBulkTitle: "Все термостаты",
      csBulkHint: "Каждый термостат применит при следующем отчёте, примерно за 10 минут.",
      csBulkAuto: "Все в Авто",
      csBulkManual: "Все в Ручной",
      csBulkSent: "Отправлено, применится за 10 мин",
      csBulkFailed: "Не отправлено",
      csHeatMode: "Режим автоматики",
      csReportLanguage: "Язык сообщений",
      csReportLanguageHint: "Тревоги Telegram, уведомления о недоступности и утренний отчёт.",
      csTimezone: "Часовой пояс отеля",
      csTimezoneHint: "Название IANA. Используется для отопления, дневных и ночных лимитов шума и часа сообщения о батарее.",
      csBoostDelta: "Старт, если холоднее Комфорта на",
      csBoostExit: "Стоп, когда до Комфорта осталось",
      csBoostMax: "Максимальная длительность буста",
      csTurnoverGap: "Держать Комфорт, если следующий гость приедет в течение",
      csRateWarm: "Скорость нагрева, на улице от 10 °C",
      csRateMild: "Скорость нагрева, на улице от 0 до 10 °C",
      csRateCold: "Скорость нагрева, ниже 0 °C или неизвестно",
      csPreheatMin: "Минимальный предпрогрев",
      csPreheatMax: "Максимальный предпрогрев",
      csAdjustMax: "Макс. отклонение от Комфорта",
      csAdjustEvery: "Шаг 1 °C не чаще, чем раз в",
      csSensorStale: "Датчик термостата, если датчик воздуха молчит",
      csLookahead: "Упреждение",
      csLatitude: "Широта",
      csLongitude: "Долгота",
      csSeasonTemp: "Сезон открывается при средней ниже",
      csSeasonStart: "Начало сезона (ММ-ДД)",
      csSeasonEnd: "Конец сезона (ММ-ДД)",
      csMewsInterval: "Читать бронирования каждые",
      csMewsHint: "Применяется сразу. Записывается в устройство моста Mews.",
      csNoBridge: "Мост Mews не найден, значение изменить нельзя.",
      csEnabled: "Проверять",
      csEnabledHint: "Выключено: лимиты этого раздела не проверяются.",
      csTempMin: "Температура, нижний предел",
      csTempMax: "Температура, верхний предел",
      csHumMin: "Влажность, нижний предел",
      csHumMax: "Влажность, верхний предел",
      csTempRange: "Температура",
      csHumRange: "Влажность",
      csCo2Max: "CO₂ до",
      csTvocMax: "TVOC до",
      csPm25Max: "PM2.5 до",
      csPm10Max: "PM10 до",
      csTvocHint: "AM308 передаёт уровень, начиная с 1.",
      csTo: "до",
      csDayPeriod: "Дневной период",
      csDayPeriodHint: "Ночь это остальное время суток.",
      csDayStart: "День начинается",
      csDayEnd: "День заканчивается",
      csDay: "День",
      csNight: "Ночь",
      csLimitsDb: "Лимиты в дБ",
      csDayLaeq: "День, средний (LAeq)",
      csDayLai: "День, импульсный (LAI)",
      csDayLaimax: "День, пиковый (LAImax)",
      csNightLaeq: "Ночь, средний (LAeq)",
      csNightLai: "Ночь, импульсный (LAI)",
      csNightLaimax: "Ночь, пиковый (LAImax)",
      csNoiseLegend: "LAeq средний уровень, LAI импульсный, LAImax максимальный пик.",
      csWindowMax: "Тревога, если открыто дольше",
      csWindowHint: "0 означает тревогу сразу при открытии. Тревога может прийти до 10 минут позже предела.",
      csWindowNoLimit: "Лимит не задан, окна не проверяются",
      csPowerMax: "Перегрузка выше",
      csPowerHint: "Создаёт тревогу перегрузки розетки.",
      csBatteryMin: "Низкий заряд при",
      csBatteryHint: "Одно сообщение на устройство в сутки, с 10:00 до 19:00 по времени отеля.",
      csOffDevice: "Устройство",
      csOffNormal: "Обычный отчёт",
      csOffAfter: "Недоступно через",
      csOffAm308: "Датчик воздуха (AM308)",
      csOffWs302: "Датчик шума (WS302)",
      csOffWt101: "Термостат (WT101)",
      csOffWs523: "Розетка (WS523)",
      csOffVs370: "Датчик движения (VS370)",
      csOffWs301: "Датчик окна (WS301)",
      csOffWs303: "Датчик воды (WS303)",
      csOffRate10: "каждые 10 мин",
      csOffRate8: "около 8 мин",
      csOffRate12: "около 12 мин",
      csOffRateDaily: "при изменении, иначе раз в сутки",
      csOffNote: "Другие модели используют offline_<модель>_min, по умолчанию 1560 мин. Сообщение уходит после двух неудачных проверок и повторяется каждые 6 часов.",
      csTgTypes: "Типы сообщений",
      csTgTiming: "Время отправки",
      csTgWater: "Протечка",
      csTgNoise: "Шум",
      csTgTemp: "Температура",
      csTgHumidity: "Влажность",
      csTgCo2: "CO₂, TVOC и пыль",
      csTgBattery: "Батарея",
      csTgSocket: "Перегрузка розетки",
      csTgWindow: "Открытое окно",
      csTgOffline: "Устройство недоступно",
      csTgWaterHint: "Сразу и по окончании.",
      csTgDelayHint: "После задержки ниже.",
      csTgBatteryHint: "Раз в сутки на устройство.",
      csTgWindowHint: "Когда лимит пройден и когда окно закрыто.",
      csTgOfflineHint: "Для всего отеля. Утренний отчёт сохраняет список.",
      csNoiseAfter: "Отправлять сообщение о шуме через",
      csAirAfter: "Отправлять сообщение о воздухе через",
      csNoiseAfterHint: "Непрерывный шум такой длительности. Короткий шум не отправляется.",
      csTgServerNote: "Токен бота и группа задаются на сервере, не здесь.",
      csRoomSettings: "Настройки номера",
      csRoomHeating: "Автоматика отопления в этом номере",
      csRoomFollows: "как в отеле",
      csRoomOwn: "своих",
      csRoomValue: "Значение номера",
      csBackToHotel: "Вернуть значение отеля",
      csHotelValue: "Отель",
      csRoomLoadFailed: "Настройки номера не загружены.",
    },
  };

  private activeLangCodeSubject = new BehaviorSubject<string>("EN");
  activeLangCode$ = this.activeLangCodeSubject.asObservable();

  constructor() {
    let savedLang: string | null = null;
    try {
      savedLang = localStorage.getItem("revelton_lang");
    } catch {
      // Storage blocked (privacy mode, kiosk policy): stay on the default language
    }
    if (savedLang && this.translations[savedLang]) {
      this.activeLangCodeSubject.next(savedLang);
    }
  }

  get languagesList() {
    return this.languages;
  }

  get activeLangCode(): string {
    return this.activeLangCodeSubject.value;
  }

  get t(): TranslationSet {
    return this.translations[this.activeLangCode];
  }

  setLanguage(code: string): void {
    if (this.translations[code]) {
      this.activeLangCodeSubject.next(code);
      try {
        localStorage.setItem("revelton_lang", code);
      } catch {
        // Not persisted; the choice still applies to this page
      }
    }
  }
}
