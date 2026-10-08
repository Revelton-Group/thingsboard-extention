import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface TranslationSet {
  // Common
  details: string;
  close: string;
  done: string;
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
  syncWaiting: string;
  wtSending: string;
  wtFailed: string;
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
  preset: string;
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
  cpCritAlert: string;
  smartSockets: string;

  cpCo2Limit: string;
  cpPm25Limit: string;
  cpPm10Limit: string;
  cpTvocLimit: string;
  cpTempMax: string;
  cpHumMax: string;
  cpPressMax: string;
  cpAirGuardDesc: string;
  cpClimateSection: string;
  cpPuritySection: string;
  cpCurrent: string;
  cpLaeqName: string;
  cpLaeqHint: string;
  cpLaiName: string;
  cpLaiHint: string;
  cpLaimaxName: string;
  cpLaimaxHint: string;
  cpAddInterval: string;
  cpPreheatingTemp: string;
  cpPreheatingTempHint: string;
  cpPreheatingMinutes: string;
  cpPreheatingMinutesHint: string;
  cpWindowAutoPause: string;
  cpWindowAutoPauseHint: string;
  cpWindowAlertT: string;
  cpWindowAlertHint: string;
  smartSocket: string;
  socketPowerHigh: string;
  cpSocketHint: string;
  cpSocketOverloadT: string;
  cpSocketOverloadHint: string;
  cpSocketMaxPowerT: string;
  cpSocketMaxPowerHint: string;
  cpOn: string;
  cpOff: string;
  cpCurrentlyOpen: string;
  cpNoOpenWindows: string;
  cpSaveThresholds: string;

  // Control Panel — Design-aligned
  schedule: string;
  scheduleHint: string;
  maintenanceT: string;
  maintenanceHint: string;
  noiseThresholdHint: string;
  minutesU: string;
  appliesTo: string;
  ofRooms: string;
  roomsTargeted: string;
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
  acousticNoise: string;
  thermostatsT: string;
  windowOpenAlert: string;
  mewsB: string;
  normalC: string;
  warningC: string;
  addTest: string;
  comfortHint: string;
  onlineLabel: string;
  offlineLabel: string;
  errorT: string;

  histSyncing: string;
  histTemp: string;
  histHumidity: string;
  histQuiet: string;
  histWaterLeak: string;
  noDatasource: string;
  cpAqWarnZoneTitle: string;
  cpAqWarnZoneDesc: string;
  cpPreheatingSettings: string;
  cpWinterSeason: string;
  sensorsAndControls: string;
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
  humanPresenceRadar: string;
  dim: string;
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
  cpAllRooms: string;
  cpExcludeRooms: string;
  cpWarnZone: string;
  cpScheduleOverlap: string;
  cpRulesActivationPeriod: string;
  cpSelectSeasonDates: string;
  cpContinuousAvg: string;
  cpImpulseLevel: string;
  cpPeakMax: string;
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
  cpErrSchedTimes: string;
  cpErrMaintTimes: string;
  cpErrNoiseTimes: string;
  cpErrSeasonDates: string;
  cpErrOverlap: string;
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
      syncWaiting: "Device:",
      wtSending: "Sending… ≤10 min",
      wtFailed: "Not delivered",
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
      preset: "Preset",
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

      cpCritAlert: "CRITICAL ALERT",
      smartSockets: "Smart Sockets",

      cpCo2Limit: "CO₂",
      cpPm10Limit: "PM10",
      cpTvocLimit: "TVOC",
      cpAirGuardDesc: "AirGuard · alert limits per metric",
      cpClimateSection: "CLIMATE COMFORT",
      cpPuritySection: "AIR PURITY",
      cpCurrent: "Current",
      cpLaeqName: "LAEQ",
      cpLaeqHint: "Equivalent continuous level — average sound energy over time; best gauge of ongoing comfort",
      cpLaiName: "LAI",
      cpLaiHint: "Instantaneous level — captures short peaks and transient events",
      cpLaimaxName: "LAIMAX",
      cpLaimaxHint: "Maximum level recorded — the loudest moment in the interval",
      cpAddInterval: "Add Interval",
      cpPreheatingTemp: "Preheating Temperature",
      cpPreheatingTempHint: "Target temperature to preheat the room to before check-in",
      cpPreheatingMinutes: "Preheating Time",
      cpPreheatingMinutesHint: "How early to start heating the room before check-in (in winter season)",
      cpWindowAutoPause: "Auto-pause Heating",
      cpWindowAutoPauseHint: "Pause the valve automatically while a window is open in the room",
      cpWindowAlertT: "Open-Window Alert",
      cpWindowAlertHint: "Notify staff if a window stays open longer than this",
      smartSocket: "Smart Socket",
      socketPowerHigh: "Power draw high",
      cpSocketHint: "Alert staff when a smart socket draws more power than expected (overload protection)",
      cpSocketOverloadT: "Over-Power Alert",
      cpSocketOverloadHint: "Raise an alert when a socket exceeds the maximum power draw",
      cpSocketMaxPowerT: "Max Power",
      cpSocketMaxPowerHint: "Trigger an over-power alert at or above this wattage",
      cpOn: "On",
      cpOff: "Off",
      cpCurrentlyOpen: "Currently Open Windows",
      cpNoOpenWindows: "All windows closed right now",
      cpSaveThresholds: "Save",
      cpPm25Limit: "PM2.5",
      cpTempMax: "TEMP MAX",
      cpHumMax: "HUMIDITY MAX",
      cpPressMax: "PRESSURE MAX",

      schedule: "Schedule",
      scheduleHint: "Define heating periods with target temperatures for each time block.",
      maintenanceT: "Valve Maintenance",
      maintenanceHint: "Periodically fully opens then closes the valve to prevent limescale build-up and keep it moving freely.",
      noiseThresholdHint: "Noise thresholds per period — day and night limits.",
      minutesU: "min",
      appliesTo: "Applies to",
      ofRooms: "of",
      roomsTargeted: "rooms",
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
      acousticNoise: "Noise",
      thermostatsT: "Thermostats",
      windowOpenAlert: "Window",
      mewsB: "Mews Bridge",
      normalC: "NORMAL",
      warningC: "WARNING",
      addTest: "Add Test",
      comfortHint: "Default setpoint applied on guest check-in.",
      onlineLabel: "Online",
      offlineLabel: "Offline",
      errorT: "Error",

      histSyncing: "Loading data...",
      histTemp: "Temperature",
      histHumidity: "Humidity",
      histQuiet: "Quiet",
      histWaterLeak: "Water Leak",
      noDatasource: "No data source",
      cpAqWarnZoneTitle: "Thresholds & Warn Zone",
      cpAqWarnZoneDesc: "MIN and MAX set the absolute allowed boundaries for the reading. The warning zone is defined as a gap below the absolute MAX limit. When readings cross into this zone, they will display an amber WARNING status.",
      cpPreheatingSettings: "Preheating Settings",
      cpWinterSeason: "Winter Season",
      sensorsAndControls: "SENSORS & CONTROL PANEL",
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
      humanPresenceRadar: "HUMAN PRESENCE RADAR",
      dim: "Dim",
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
      cpAllRooms: "All rooms",
      cpExcludeRooms: "Exclude rooms",
      cpWarnZone: "WARN ZONE",
      cpScheduleOverlap: "Schedule intervals overlap! Please adjust times so they do not conflict.",
      cpRulesActivationPeriod: "Rules activation period",
      cpSelectSeasonDates: "Select Season Dates",
      cpContinuousAvg: "Continuous Average",
      cpImpulseLevel: "Impulse Level",
      cpPeakMax: "Peak Maximum",
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
      cpErrSchedTimes: "Please enter valid times in 24-hour style HH:MM format (e.g., 08:00, 22:30).",
      cpErrMaintTimes: "Please enter valid times in 24-hour style HH:MM format (e.g., 03:00) for valve maintenance.",
      cpErrNoiseTimes: "Please enter valid times in 24-hour style HH:MM format (e.g., 07:00, 22:00) for acoustic noise periods.",
      cpErrSeasonDates: "Please enter valid season dates in the calendar.",
      cpErrOverlap: "Cannot save: schedule intervals overlap! Please adjust schedule times so they do not conflict.",
    },
    RU: {
      details: "Детали",
      close: "Закрыть",
      done: "Готово",
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
      syncWaiting: "Устройство:",
      wtSending: "Отправка… ≤10 мин",
      wtFailed: "Не доставлено",
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
      preset: "Пресет",
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

      cpCritAlert: "КРИТИЧЕСКАЯ ТРЕВОГА",
      smartSockets: "Умные розетки",

      cpCo2Limit: "CO₂",
      cpPm10Limit: "PM10",
      cpTvocLimit: "TVOC",
      cpAirGuardDesc: "AirGuard · лимиты оповещений по метрикам",
      cpClimateSection: "КЛИМАТИЧЕСКИЙ КОМФОРТ",
      cpPuritySection: "ЧИСТОТА ВОЗДУХА",
      cpCurrent: "Текущее",
      cpLaeqName: "LAEQ",
      cpLaeqHint: "Эквивалентный непрерывный уровень — средняя звуковая энергия за время; лучший показатель комфорта",
      cpLaiName: "LAI",
      cpLaiHint: "Мгновенный уровень — фиксирует короткие пики и переходные события",
      cpLaimaxName: "LAIMAX",
      cpLaimaxHint: "Максимальный зафиксированный уровень — самый громкий момент в интервале",
      cpAddInterval: "Добавить интервал",
      cpPreheatingTemp: "Температура предпрогрева",
      cpPreheatingTempHint: "Целевая температура для прогрева комнаты перед заездом гостя",
      cpPreheatingMinutes: "Время предпрогрева",
      cpPreheatingMinutesHint: "За сколько минут до заезда начать прогрев комнаты (в зимний период)",
      cpWindowAutoPause: "Авто-пауза отопления",
      cpWindowAutoPauseHint: "Автоматически приостанавливать клапан, пока окно открыто в комнате",
      cpWindowAlertT: "Оповещение об открытом окне",
      cpWindowAlertHint: "Уведомить персонал, если окно открыто дольше указанного",
      smartSocket: "Умная розетка",
      socketPowerHigh: "Высокое энергопотребление",
      cpSocketHint: "Оповещать персонал, когда розетка потребляет больше мощности, чем ожидается (защита от перегрузки)",
      cpSocketOverloadT: "Оповещение о перегрузке",
      cpSocketOverloadHint: "Создавать оповещение, когда розетка превышает максимальную мощность",
      cpSocketMaxPowerT: "Макс. мощность",
      cpSocketMaxPowerHint: "Создавать оповещение о перегрузке при этой мощности или выше",
      cpOn: "Вкл",
      cpOff: "Выкл",
      cpCurrentlyOpen: "Сейчас открытые окна",
      cpNoOpenWindows: "Все окна сейчас закрыты",
      cpSaveThresholds: "Сохранить",
      cpPm25Limit: "PM2.5",
      cpTempMax: "ТЕМП МАКС",
      cpHumMax: "ВЛАЖН МАКС",
      cpPressMax: "ДАВЛ МАКС",

      schedule: "Расписание",
      scheduleHint: "Задайте периоды отопления с целевой температурой для каждого временного блока.",
      maintenanceT: "Обслуживание клапанов",
      maintenanceHint: "Периодически полностью открывает и закрывает клапан для предотвращения известкового налёта.",
      noiseThresholdHint: "Пороги шума по периодам — дневные и ночные лимиты.",
      minutesU: "мин",
      appliesTo: "Применяется к",
      ofRooms: "из",
      roomsTargeted: "комнат",
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
      acousticNoise: "Шум",
      thermostatsT: "Термостаты",
      windowOpenAlert: "Окна",
      mewsB: "Mews Bridge",
      normalC: "НОРМА",
      warningC: "ВНИМАНИЕ",
      addTest: "Добавить тест",
      comfortHint: "Уставка по умолчанию при заезде гостя.",
      onlineLabel: "В сети",
      offlineLabel: "Не в сети",
      errorT: "Ошибка",

      histSyncing: "Загрузка данных...",
      histTemp: "Температура",
      histHumidity: "Влажность",
      histQuiet: "Тихо",
      histWaterLeak: "Утечка воды",
      noDatasource: "Источник данных не найден",
      cpAqWarnZoneTitle: "Пороги и зона предупреждения",
      cpAqWarnZoneDesc: "MIN и MAX задают абсолютные допустимые границы показания. Зона предупреждения — это отступ ниже абсолютного MAX. Когда показания входят в эту зону, отображается жёлтый статус «Предупреждение».",
      cpPreheatingSettings: "Настройки предпрогрева",
      cpWinterSeason: "Зимний сезон",
      sensorsAndControls: "ДАТЧИКИ И УПРАВЛЕНИЕ",
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
      humanPresenceRadar: "РАДАР ПРИСУТСТВИЯ",
      dim: "Тускло",
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
      cpAllRooms: "Все комнаты",
      cpExcludeRooms: "Исключить комнаты",
      cpWarnZone: "ЗОНА ПРЕДУПР.",
      cpScheduleOverlap: "Интервалы расписания пересекаются! Измените время, чтобы они не конфликтовали.",
      cpRulesActivationPeriod: "Период действия правил",
      cpSelectSeasonDates: "Выберите даты сезона",
      cpContinuousAvg: "Среднее за период",
      cpImpulseLevel: "Импульсный уровень",
      cpPeakMax: "Пиковый максимум",
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
      cpErrSchedTimes: "Введите корректное время в 24-часовом формате ЧЧ:ММ (например, 08:00, 22:30).",
      cpErrMaintTimes: "Введите корректное время в формате ЧЧ:ММ (например, 03:00) для обслуживания клапанов.",
      cpErrNoiseTimes: "Введите корректное время в формате ЧЧ:ММ (например, 07:00, 22:00) для периодов контроля шума.",
      cpErrSeasonDates: "Укажите корректные даты сезона в календаре.",
      cpErrOverlap: "Нельзя сохранить: интервалы расписания пересекаются! Измените время, чтобы они не конфликтовали.",
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
