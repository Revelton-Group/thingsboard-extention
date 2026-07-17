import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export interface TranslationSet {
  // Common
  details: string;
  close: string;
  done: string;
  room: string;
  rooms: string;
  lastSync: string;
  loading: string;
  loadingRooms: string;
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
  open: string;
  closed: string;
  co2: string;
  pm25: string;
  battery: string;
  guest: string;
  connected: string;
  sensors: string;
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
  veryLoud: string;
  excellent: string;
  good: string;
  fair: string;
  poor: string;
  mode: string;
  preset: string;
  auto: string;
  heat: string;
  cool: string;
  off: string;
  eco: string;
  comfort: string;
  manual: string;
  activityLogs: string;
  event: string;
  time: string;
  activeAlerts: string;
  severity: string;
  high: string;
  medium: string;
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
  controlConfig: string;
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
  cpTitle: string;
  cpThermostatAuto: string;
  cpThermostatDesc: string;
  cpActiveDays: string;
  cpStartTime: string;
  cpEndTime: string;
  cpExerciseTemp: string;
  cpExerciseHint: string;
  cpWindowAlert: string;
  cpWindowAlertDesc: string;
  cpAlertThreshold: string;
  cpAlertThresholdHint: string;
  cpWindowSetTo: string;
  cpWindowHoursContinuous: string;
  cpMewsSync: string;
  cpMewsSyncDesc: string;
  cpSyncFrequency: string;
  cpSyncFrequencyHint: string;
  cpNextSyncScheduled: string;
  cpTelegramTitle: string;
  cpTelegramDesc: string;
  cpAlertLevel: string;
  cpDangerOnly: string;
  cpWarningAndAbove: string;
  cpAllAlerts: string;
  cpDangerDesc: string;
  cpWarningDesc: string;
  cpAllAlertsDesc: string;
  cpPreview: string;
  cpBotTokenHint: string;
  cpResetDefaults: string;
  cpSaveChanges: string;
  cpCritAlert: string;
  cpSensor: string;
  cpDetected: string;
  cpActionRequired: string;
  cpValue: string;
  cpHigh: string;
  cpCheckAC: string;
  cpOpenFor2Hours: string;
  smartSockets: string;
  noSockets: string;

  cpCo2Limit: string;
  cpPm25Limit: string;
  cpPm10Limit: string;
  cpTvocLimit: string;
  cpNoiseLimit: string;
  cpTempMax: string;
  cpHumMax: string;
  cpPressMax: string;
  cpAirQualityThresholds: string;
  cpAirQualityDesc: string;
  cpNoiseThresholds: string;
  cpNoiseDesc: string;
  cpAirGuardTitle: string;
  cpAirGuardDesc: string;
  cpNormalBadge: string;
  cpWarningBadge: string;
  cpAlertBadge: string;
  cpMonitorLabel: string;
  cpClimateSection: string;
  cpPuritySection: string;
  cpCurrent: string;
  cpNoiseTitle: string;
  cpLaeqName: string;
  cpLaeqHint: string;
  cpLaiName: string;
  cpLaiHint: string;
  cpLaimaxName: string;
  cpLaimaxHint: string;
  cpHomePreset: string;
  cpOfficePreset: string;
  cpLabPreset: string;
  cpMaintSchedule: string;
  cpMaintScheduleHint: string;
  cpValveOpen: string;
  cpValveClosed: string;
  cpAddInterval: string;
  cpPreheatingTemp: string;
  cpPreheatingTempHint: string;
  cpPreheatingMinutes: string;
  cpPreheatingMinutesHint: string;
  cpWindowAutoPause: string;
  cpWindowAutoPauseHint: string;
  cpWindowAlertT: string;
  cpWindowAlertHint: string;
  cpOn: string;
  cpOff: string;
  cpCurrentlyOpen: string;
  cpNoOpenWindows: string;
  cpTelegramEnabledHint: string;
  cpTelegramEnabledT: string;
  cpTelegramActive: string;
  cpBotToken: string;
  cpBotTokenHint2: string;
  cpChatId: string;
  cpChatIdHint: string;
  cpTopicId: string;
  cpTopicIdHint: string;
  cpAlertTypes: string;
  cpAlertTypesHint: string;
  cpSendTest: string;
  cpUnsavedChanges: string;
  cpSaveThresholds: string;
  cpPmbLimit: string;
  cpTempMaxLimit: string;
  cpHumMaxLimit: string;
  cpPressMaxLimit: string;

  // Control Panel — Design-aligned
  schedule: string;
  scheduleHint: string;
  maintenanceT: string;
  maintenanceHint: string;
  heatingValve: string;
  valveHint: string;
  limitW: string;
  noiseThresholdHint: string;
  minutesU: string;
  appliesTo: string;
  ofRooms: string;
  roomsTargeted: string;
  allRooms: string;
  selectRooms: string;
  searchRooms: string;
  alertC: string;
  dayPeriod: string;
  nightPeriod: string;
  syncNow: string;
  mewsSyncT: string;
  mewsAutoSyncT: string;
  mewsAutoSyncHint: string;
  mewsSyncHint: string;
  lastSyncT: string;
  minAgo: string;
  alertTypesT: string;
  acousticNoise: string;
  thermostatsT: string;
  windowOpenAlert: string;
  mewsB: string;
  normalC: string;
  warningC: string;
  addTest: string;
  comfortHint: string;
  connectionStatus: string;
  onlineLabel: string;
  offlineLabel: string;
  integrationStatusT: string;
  roomsSyncedT: string;
  lastHeartbeatT: string;
  errorT: string;
  alertActiveT: string;
  tempAlert: string;
  humidityAlert: string;
  waterAlert: string;
  windowAlert: string;
  batteryAlert: string;
  checkinAlert: string;
  co2Alert: string;
  noiseAlert: string;

  histSyncing: string;
  histRetry: string;
  histAirQuality: string;
  histTempHum: string;
  hist24h: string;
  hist7d: string;
  hist30d: string;
  histTemp: string;
  histUnitC: string;
  histHumidity: string;
  histUnitPercent: string;
  histNoTempHum: string;
  histPollutants: string;
  histClickMetric: string;
  histNoData: string;
  histAcoustics: string;
  histNoiseLevels: string;
  histQuiet: string;
  histUnitDb: string;
  histWindows: string;
  histEvents: string;
  histTotalOpen: string;
  histAvgDuration: string;
  histRecentEvents: string;
  histCurrentlyOpen: string;
  histNoWindowEvents: string;
  histWaterLeak: string;
  histLeakDetected: string;
  histTotalEvents: string;
  histLastEvent: string;
  histNoLeakEvents: string;
  histRoomOccupancy: string;
  histOccRate: string;
  histCheckIn: string;
  histStayLog: string;
  histNoOccEvents: string;
  histUnitPpm: string;
  histUnitPpb: string;
  histUnitUgM3: string;
  histUnitHpa: string;
  histUnoccupied: string;
  noDatasource: string;
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
      done: "Done",
      room: "Room",
      rooms: "rooms",
      lastSync: "Last sync",
      loading: "Loading...",
      loadingRooms: "Loading rooms…",
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
      open: "OPEN",
      closed: "CLOSED",
      co2: "CO2",
      pm25: "PM2.5",
      battery: "BATTERY",
      guest: "Guest",
      connected: "Connected",
      sensors: "Sensors",
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
      veryLoud: "Very Loud",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
      mode: "Mode",
      preset: "Preset",
      auto: "Auto",
      heat: "Heat",
      cool: "Cool",
      off: "Off",
      eco: "Eco",
      comfort: "Comfort",
      manual: "Manual",
      activityLogs: "Activity Logs",
      event: "Event",
      time: "Time",
      activeAlerts: "Active Alerts",
      severity: "Severity",
      high: "High",
      medium: "Medium",
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
      controlConfig: "Control Settings",

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

      cpTitle: "Control Panel",
      cpThermostatAuto: "Thermostat Automation",
      cpThermostatDesc: "Winter valve exercise — keeps TRVs from seizing up.",
      cpActiveDays: "Active Days",
      cpStartTime: "Start Time",
      cpEndTime: "End Time",
      cpExerciseTemp: "Exercise Temperature",
      cpExerciseHint: "TRVs will open to this temperature then return to normal setpoint.",
      cpWindowAlert: "Window Open Alert",
      cpWindowAlertDesc: "Alert staff when a window is left open too long.",
      cpAlertThreshold: "Alert Threshold",
      cpAlertThresholdHint: "An alert is triggered if a window stays open for longer than this duration.",
      cpWindowSetTo: "Currently set to alert after",
      cpWindowHoursContinuous: "of continuous window opening.",
      cpMewsSync: "Mews Sync Interval",
      cpMewsSyncDesc: "How often reservation data is pulled from Mews PMS.",
      cpSyncFrequency: "Sync Frequency",
      cpSyncFrequencyHint: "Shorter intervals give more real-time data but increase API usage.",
      cpNextSyncScheduled: "Next sync scheduled every",
      cpTelegramTitle: "Telegram",
      cpTelegramDesc: "Forward alerts to a Telegram chat or group.",
      cpAlertLevel: "Alert Level",
      cpDangerOnly: "Danger only",
      cpWarningAndAbove: "Warning & above",
      cpAllAlerts: "All alerts",
      cpDangerDesc: "Only critical sensor alerts (temp, humidity, air, water, noise).",
      cpWarningDesc: "Both warning and danger level alerts.",
      cpAllAlertsDesc: "All alerts including battery low and window open.",
      cpPreview: "Preview",
      cpBotTokenHint: "Bot token and chat ID are configured on the backend. Contact your system administrator to update credentials.",
      cpResetDefaults: "Reset Defaults",
      cpSaveChanges: "Save Changes",
      cpCritAlert: "CRITICAL ALERT",
      cpSensor: "Sensor",
      cpDetected: "Detected",
      cpActionRequired: "Action Required Immediately!",
      cpValue: "Value",
      cpHigh: "High",
      cpCheckAC: "Please check AC unit.",
      cpOpenFor2Hours: "Open for > 2 hours.",
      smartSockets: "Smart Sockets",
      noSockets: "No smart sockets in this room",

      cpCo2Limit: "CO₂",
      cpPmbLimit: "PM2.5",
      cpPm10Limit: "PM10",
      cpTvocLimit: "TVOC",
      cpNoiseLimit: "Noise Limit (dB)",
      cpTempMaxLimit: "Temp Max Limit (°C)",
      cpHumMaxLimit: "Humidity Max Limit (%)",
      cpPressMaxLimit: "Pressure Max Limit (hPa)",
      cpAirQualityThresholds: "Air Quality Thresholds",
      cpAirQualityDesc: "Configure alert limits for room environment pollutants.",
      cpNoiseThresholds: "Noise Thresholds",
      cpNoiseDesc: "Configure maximum acoustic noise thresholds.",
      cpAirGuardTitle: "Threshold Settings",
      cpAirGuardDesc: "AirGuard · alert limits per metric",
      cpNormalBadge: "NORMAL",
      cpWarningBadge: "WARNING",
      cpAlertBadge: "EXCEEDED",
      cpMonitorLabel: "MONITOR",
      cpClimateSection: "CLIMATE COMFORT",
      cpPuritySection: "AIR PURITY",
      cpCurrent: "Current",
      cpNoiseTitle: "Acoustic Noise Settings",
      cpLaeqName: "LAEQ",
      cpLaeqHint: "Equivalent continuous level — average sound energy over time; best gauge of ongoing comfort",
      cpLaiName: "LAI",
      cpLaiHint: "Instantaneous level — captures short peaks and transient events",
      cpLaimaxName: "LAIMAX",
      cpLaimaxHint: "Maximum level recorded — the loudest moment in the interval",
      cpHomePreset: "Home",
      cpOfficePreset: "Office",
      cpLabPreset: "Lab",
      cpMaintSchedule: "Valve Maintenance Schedule",
      cpMaintScheduleHint: "Periodically fully opens then closes the valve to prevent limescale build-up and keep it moving freely",
      cpValveOpen: "Valve Open",
      cpValveClosed: "Valve Closed",
      cpAddInterval: "Add Interval",
      cpPreheatingTemp: "Preheating Temperature",
      cpPreheatingTempHint: "Target temperature to preheat the room to before check-in",
      cpPreheatingMinutes: "Preheating Time",
      cpPreheatingMinutesHint: "How early to start heating the room before check-in (in winter season)",
      cpWindowAutoPause: "Auto-pause Heating",
      cpWindowAutoPauseHint: "Pause the valve automatically while a window is open in the room",
      cpWindowAlertT: "Open-Window Alert",
      cpWindowAlertHint: "Notify staff if a window stays open longer than this",
      cpOn: "On",
      cpOff: "Off",
      cpCurrentlyOpen: "Currently Open Windows",
      cpNoOpenWindows: "All windows closed right now",
      cpTelegramEnabledHint: "Always on — alerts your hotel staff Telegram group",
      cpTelegramEnabledT: "Bot Notifications",
      cpTelegramActive: "Bot is active and sending alerts",
      cpBotToken: "Main Bot Token",
      cpBotTokenHint2: "The API Token provided by BotFather.",
      cpChatId: "Chat / Group ID",
      cpChatIdHint: "The Telegram chat that receives alerts.",
      cpTopicId: "Topic ID (Hotel Thread)",
      cpTopicIdHint: "The specific thread ID within the group.",
      cpAlertTypes: "Alert Types",
      cpAlertTypesHint: "Choose which events trigger a Telegram message",
      cpSendTest: "Send Test Message",
      cpUnsavedChanges: "Unsaved changes",
      cpSaveThresholds: "Save",
      cpPm25Limit: "PM2.5",
      cpTempMax: "TEMP MAX",
      cpHumMax: "HUMIDITY MAX",
      cpPressMax: "PRESSURE MAX",

      schedule: "Schedule",
      scheduleHint: "Define heating periods with target temperatures for each time block.",
      maintenanceT: "Valve Maintenance",
      maintenanceHint: "Periodically fully opens then closes the valve to prevent limescale build-up and keep it moving freely.",
      heatingValve: "Heating Valve",
      valveHint: "Opens the thermostat valve (turns heating on) for targeted rooms.",
      limitW: "LIMIT",
      noiseThresholdHint: "Noise thresholds per period — day and night limits.",
      minutesU: "min",
      appliesTo: "Applies to",
      ofRooms: "of",
      roomsTargeted: "rooms",
      allRooms: "All rooms",
      selectRooms: "Select rooms",
      searchRooms: "Search rooms...",
      alertC: "EXCEEDED",
      dayPeriod: "Day",
      nightPeriod: "Night",
      syncNow: "Sync Now",
      mewsSyncT: "Sync Interval",
      mewsAutoSyncT: "Auto Sync",
      mewsAutoSyncHint: "Reservation data is kept up to date automatically.",
      mewsSyncHint: "How often reservation data is pulled from Mews PMS.",
      lastSyncT: "Last Sync",
      minAgo: "min ago",
      alertTypesT: "Alert Types",
      acousticNoise: "Noise",
      thermostatsT: "Thermostats",
      windowOpenAlert: "Window",
      mewsB: "Mews Bridge",
      normalC: "NORMAL",
      warningC: "WARNING",
      addTest: "Add Test",
      comfortHint: "Default setpoint applied on guest check-in.",
      connectionStatus: "Connection",
      onlineLabel: "Online",
      offlineLabel: "Offline",
      integrationStatusT: "Integration Status",
      roomsSyncedT: "Rooms Synced",
      lastHeartbeatT: "Last Heartbeat",
      errorT: "Error",
      alertActiveT: "Alert Active",
      tempAlert: "Temperature",
      humidityAlert: "Humidity",
      waterAlert: "Water Leak",
      windowAlert: "Window Open",
      batteryAlert: "Low Battery",
      checkinAlert: "Check-in",
      co2Alert: "CO₂",
      noiseAlert: "Noise",

      histSyncing: "Loading data...",
      histRetry: "Retry",
      histAirQuality: "Air Quality Monitor",
      histTempHum: "Temperature & Humidity history",
      hist24h: "24h",
      hist7d: "7d",
      hist30d: "30d",
      histTemp: "Temperature",
      histUnitC: "°C",
      histHumidity: "Humidity",
      histUnitPercent: "%",
      histNoTempHum: "No temperature/humidity data for this period.",
      histPollutants: "Pollutants & Metrics",
      histClickMetric: "Click a metric to view history",
      histNoData: "No data available.",
      histAcoustics: "Acoustics",
      histNoiseLevels: "Acoustic noise levels",
      histQuiet: "Quiet",
      histUnitDb: "dB",
      histWindows: "Windows: Sensor History",
      histEvents: "EVENTS",
      histTotalOpen: "TOTAL OPEN",
      histAvgDuration: "AVG DURATION",
      histRecentEvents: "RECENT EVENTS",
      histCurrentlyOpen: "Currently Open",
      histNoWindowEvents: "No window events in this period",
      histWaterLeak: "Water Leak",
      histLeakDetected: "Leak Detected",
      histTotalEvents: "TOTAL EVENTS",
      histLastEvent: "LAST EVENT",
      histNoLeakEvents: "No leak events detected. System is clean.",
      histRoomOccupancy: "Room Occupancy",
      histOccRate: "OCC. RATE",
      histCheckIn: "CHECK-IN",
      histStayLog: "STAY LOG",
      histNoOccEvents: "No occupancy events in this period",
      histUnitPpm: "ppm",
      histUnitPpb: "ppb",
      histUnitUgM3: "µg/m³",
      histUnitHpa: "hPa",
      histUnoccupied: "Unoccupied",
      noDatasource: "No data source",
    },
    RU: {
      details: "Детали",
      close: "Закрыть",
      done: "Готово",
      room: "Комната",
      rooms: "комнат",
      lastSync: "Синхр.",
      loading: "Загрузка...",
      loadingRooms: "Загрузка комнат…",
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
      open: "ОТКРЫТО",
      closed: "ЗАКРЫТО",
      co2: "CO2",
      pm25: "PM2.5",
      battery: "ЗАРЯД",
      guest: "Гость",
      connected: "В сети",
      sensors: "Датчики",
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
      veryLoud: "Очень шумно",
      excellent: "Отлично",
      good: "Хорошо",
      fair: "Средне",
      poor: "Плохо",
      mode: "Режим",
      preset: "Пресет",
      auto: "Авто",
      heat: "Нагрев",
      cool: "Охлажд.",
      off: "Выкл",
      eco: "Эко",
      comfort: "Комфорт",
      manual: "Ручной",
      activityLogs: "Логи активности",
      event: "Событие",
      time: "Время",
      activeAlerts: "Активные алерты",
      severity: "Важность",
      high: "Высокая",
      medium: "Средняя",
      low: "Низкая",
      occupied: "Занято",
      heating: "Нагрев",
      cooling: "Охлаждение",
      idle: "Ожидание",
      guestInRoom: "Гость в комнате",
      checkoutPassed: "ВРЕМЯ ВЫЕЗДА ПРОШЛО",
      arrivingToday: "Заезд сегодня",
      lateArrival: "Задержка заезда",
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
      controlConfig: "Настройки управления",

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

      cpTitle: "Панель управления",
      cpThermostatAuto: "Автоматизация термостатов",
      cpThermostatDesc: "Зимняя разминка клапанов — предотвращает заклинивание.",
      cpActiveDays: "Активные дни",
      cpStartTime: "Время начала",
      cpEndTime: "Время окончания",
      cpExerciseTemp: "Температура разминки",
      cpExerciseHint: "TRV откроются до этой температуры, затем вернутся к норме.",
      cpWindowAlert: "Оповещение об открытом окне",
      cpWindowAlertDesc: "Уведомлять персонал, если окно открыто слишком долго.",
      cpAlertThreshold: "Порог оповещения",
      cpAlertThresholdHint: "Оповещение сработает, если окно будет открыто дольше этого времени.",
      cpWindowSetTo: "Сейчас установлено оповещение после",
      cpWindowHoursContinuous: "непрерывно открытого окна.",
      cpMewsSync: "Интервал синхронизации Mews",
      cpMewsSyncDesc: "Как часто данные бронирования загружаются из Mews PMS.",
      cpSyncFrequency: "Частота синхронизации",
      cpSyncFrequencyHint: "Короткие интервалы дают актуальные данные, но увеличивают нагрузку.",
      cpNextSyncScheduled: "Следующая синхронизация каждые",
      cpTelegramTitle: "Telegram",
      cpTelegramDesc: "Пересылка оповещений в чат или группу Telegram.",
      cpAlertLevel: "Уровень оповещения",
      cpDangerOnly: "Только опасность",
      cpWarningAndAbove: "Предупреждения и выше",
      cpAllAlerts: "Все оповещения",
      cpDangerDesc: "Только критические тревоги датчиков (темп., влажность, воздух, вода, шум).",
      cpWarningDesc: "Тревоги уровня предупреждение и опасность.",
      cpAllAlertsDesc: "Все тревоги, включая низкий заряд и открытые окна.",
      cpPreview: "Предпросмотр",
      cpBotTokenHint: "Токен бота и ID чата настраиваются на бэкенде. Обратитесь к системному администратору.",
      cpResetDefaults: "Сбросить настройки",
      cpSaveChanges: "Сохранить изменения",
      cpCritAlert: "КРИТИЧЕСКАЯ ТРЕВОГА",
      cpSensor: "Датчик",
      cpDetected: "Обнаружено",
      cpActionRequired: "Требуется немедленное действие!",
      cpValue: "Значение",
      cpHigh: "Высокое",
      cpCheckAC: "Пожалуйста, проверьте кондиционер.",
      cpOpenFor2Hours: "Открыто > 2 часов.",
      smartSockets: "Умные розетки",
      noSockets: "В этой комнате нет умных розеток",

      cpCo2Limit: "CO₂",
      cpPmbLimit: "PM2.5",
      cpPm10Limit: "PM10",
      cpTvocLimit: "TVOC",
      cpNoiseLimit: "Лимит шума (дБ)",
      cpTempMaxLimit: "Макс. лимит темп. (°C)",
      cpHumMaxLimit: "Макс. лимит влажн. (%)",
      cpPressMaxLimit: "Макс. лимит давл. (гПа)",
      cpAirQualityThresholds: "Пороги качества воздуха",
      cpAirQualityDesc: "Настройте лимиты оповещений для загрязняющих веществ в комнатах.",
      cpNoiseThresholds: "Пороги уровня шума",
      cpNoiseDesc: "Настройте максимальные пороги акустического шума.",
      cpAirGuardTitle: "Настройки порогов",
      cpAirGuardDesc: "AirGuard · лимиты оповещений по метрикам",
      cpNormalBadge: "НОРМА",
      cpWarningBadge: "ВНИМАНИЕ",
      cpAlertBadge: "ПРЕВЫШЕНИЕ",
      cpMonitorLabel: "МОНИТОР",
      cpClimateSection: "КЛИМАТИЧЕСКИЙ КОМФОРТ",
      cpPuritySection: "ЧИСТОТА ВОЗДУХА",
      cpCurrent: "Текущее",
      cpNoiseTitle: "Настройки акустического шума",
      cpLaeqName: "LAEQ",
      cpLaeqHint: "Эквивалентный непрерывный уровень — средняя звуковая энергия за время; лучший показатель комфорта",
      cpLaiName: "LAI",
      cpLaiHint: "Мгновенный уровень — фиксирует короткие пики и переходные события",
      cpLaimaxName: "LAIMAX",
      cpLaimaxHint: "Максимальный зафиксированный уровень — самый громкий момент в интервале",
      cpHomePreset: "Дом",
      cpOfficePreset: "Офис",
      cpLabPreset: "Лаб.",
      cpMaintSchedule: "Расписание обслуживания клапанов",
      cpMaintScheduleHint: "Периодически полностью открывает и закрывает клапан для предотвращения известкового налёта",
      cpValveOpen: "Клапан открыт",
      cpValveClosed: "Клапан закрыт",
      cpAddInterval: "Добавить интервал",
      cpPreheatingTemp: "Температура предпрогрева",
      cpPreheatingTempHint: "Целевая температура для прогрева комнаты перед заездом гостя",
      cpPreheatingMinutes: "Время предпрогрева",
      cpPreheatingMinutesHint: "За сколько минут до заезда начать прогрев комнаты (в зимний период)",
      cpWindowAutoPause: "Авто-пауза отопления",
      cpWindowAutoPauseHint: "Автоматически приостанавливать клапан, пока окно открыто в комнате",
      cpWindowAlertT: "Оповещение об открытом окне",
      cpWindowAlertHint: "Уведомить персонал, если окно открыто дольше указанного",
      cpOn: "Вкл",
      cpOff: "Выкл",
      cpCurrentlyOpen: "Сейчас открытые окна",
      cpNoOpenWindows: "Все окна сейчас закрыты",
      cpTelegramEnabledHint: "Всегда включено — оповещает группу персонала отеля в Telegram",
      cpTelegramEnabledT: "Уведомления бота",
      cpTelegramActive: "Бот активен и отправляет оповещения",
      cpBotToken: "Основной токен бота",
      cpBotTokenHint2: "API-токен, предоставленный BotFather.",
      cpChatId: "ID чата / группы",
      cpChatIdHint: "Чат Telegram, который получает оповещения.",
      cpTopicId: "ID темы (ветка отеля)",
      cpTopicIdHint: "Конкретный ID темы внутри группы.",
      cpAlertTypes: "Типы оповещений",
      cpAlertTypesHint: "Выберите, какие события вызывают сообщение в Telegram",
      cpSendTest: "Отправить тестовое сообщение",
      cpUnsavedChanges: "Несохранённые изменения",
      cpSaveThresholds: "Сохранить",
      cpPm25Limit: "PM2.5",
      cpTempMax: "ТЕМП МАКС",
      cpHumMax: "ВЛАЖН МАКС",
      cpPressMax: "ДАВЛ МАКС",

      schedule: "Расписание",
      scheduleHint: "Задайте периоды отопления с целевой температурой для каждого временного блока.",
      maintenanceT: "Обслуживание клапанов",
      maintenanceHint: "Периодически полностью открывает и закрывает клапан для предотвращения известкового налёта.",
      heatingValve: "Клапан отопления",
      valveHint: "Открывает клапан термостата (включает отопление) для выбранных комнат.",
      limitW: "ЛИМИТ",
      noiseThresholdHint: "Пороги шума по периодам — дневные и ночные лимиты.",
      minutesU: "мин",
      appliesTo: "Применяется к",
      ofRooms: "из",
      roomsTargeted: "комнат",
      allRooms: "Все комнаты",
      selectRooms: "Выбрать комнаты",
      searchRooms: "Поиск комнат...",
      alertC: "ПРЕВЫШЕНИЕ",
      dayPeriod: "День",
      nightPeriod: "Ночь",
      syncNow: "Синхронизировать",
      mewsSyncT: "Интервал синхр.",
      mewsAutoSyncT: "Авто-синхр.",
      mewsAutoSyncHint: "Данные бронирования обновляются автоматически.",
      mewsSyncHint: "Как часто данные бронирования загружаются из Mews PMS.",
      lastSyncT: "Последняя синхр.",
      minAgo: "мин. назад",
      alertTypesT: "Типы оповещений",
      acousticNoise: "Шум",
      thermostatsT: "Термостаты",
      windowOpenAlert: "Окна",
      mewsB: "Mews Bridge",
      normalC: "НОРМА",
      warningC: "ВНИМАНИЕ",
      addTest: "Добавить тест",
      comfortHint: "Уставка по умолчанию при заезде гостя.",
      connectionStatus: "Подключение",
      onlineLabel: "В сети",
      offlineLabel: "Не в сети",
      integrationStatusT: "Статус интеграции",
      roomsSyncedT: "Комнат синхр.",
      lastHeartbeatT: "Последний heartbeat",
      errorT: "Ошибка",
      alertActiveT: "Алерт активен",
      tempAlert: "Температура",
      humidityAlert: "Влажность",
      waterAlert: "Утечка воды",
      windowAlert: "Открытое окно",
      batteryAlert: "Низкий заряд",
      checkinAlert: "Заезд",
      co2Alert: "CO₂",
      noiseAlert: "Шум",

      histSyncing: "Загрузка данных...",
      histRetry: "Повторить",
      histAirQuality: "Качество воздуха",
      histTempHum: "История температуры и влажности",
      hist24h: "24ч",
      hist7d: "7д",
      hist30d: "30д",
      histTemp: "Температура",
      histUnitC: "°C",
      histHumidity: "Влажность",
      histUnitPercent: "%",
      histNoTempHum: "Нет данных по температуре/влажности за этот период.",
      histPollutants: "Загрязнители и метрики",
      histClickMetric: "Нажмите на метрику, чтобы посмотреть историю",
      histNoData: "Нет данных.",
      histAcoustics: "Акустика",
      histNoiseLevels: "Уровни шума",
      histQuiet: "Тихо",
      histUnitDb: "дБ",
      histWindows: "Окна: История",
      histEvents: "СОБЫТИЯ",
      histTotalOpen: "ОТКРЫТО (ВРЕМЯ)",
      histAvgDuration: "СРЕДН. ПРОДОЛЖ.",
      histRecentEvents: "ПОСЛЕДНИЕ СОБЫТИЯ",
      histCurrentlyOpen: "Сейчас открыто",
      histNoWindowEvents: "Нет событий окон",
      histWaterLeak: "Утечка воды",
      histLeakDetected: "Утечка",
      histTotalEvents: "ВСЕГО СОБЫТИЙ",
      histLastEvent: "ПОСЛЕДНЕЕ",
      histNoLeakEvents: "Нет утечек. Система в норме.",
      histRoomOccupancy: "Занятость комнаты",
      histOccRate: "ЗАНЯТОСТЬ",
      histCheckIn: "ЗАЕЗД",
      histStayLog: "ЛОГ ПРЕБЫВАНИЯ",
      histNoOccEvents: "Нет событий занятости",
      histUnitPpm: "ppm",
      histUnitPpb: "ppb",
      histUnitUgM3: "µg/m³",
      histUnitHpa: "гПа",
      histUnoccupied: "Свободно",
      noDatasource: "Источник данных не найден",
    },
  };

  private activeLangCodeSubject = new BehaviorSubject<string>("EN");
  activeLangCode$ = this.activeLangCodeSubject.asObservable();

  constructor() {
    const savedLang = localStorage.getItem("revelton_lang");
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
      localStorage.setItem("revelton_lang", code);
    }
  }
}
