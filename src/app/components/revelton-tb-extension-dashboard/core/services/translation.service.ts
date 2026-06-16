import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export interface TranslationSet {
  // Common
  details: string;
  close: string;
  room: string;
  rooms: string;
  lastSync: string;
  loading: string;

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
  histUnoccupied: string;
}

@Injectable({
  providedIn: "root",
})
export class TranslationService {
  private languages = [
    { code: "EN", name: "English" },
    { code: "RU", name: "Русский" },
  ];

  private translations: Record<string, TranslationSet> = {
    EN: {
      details: "Details",
      close: "Close",
      room: "Room",
      rooms: "rooms",
      lastSync: "Last sync",
      loading: "Loading...",

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

      temperature: "TEMPERATURE",
      humidity: "HUMIDITY",
      airQuality: "AIR QUALITY",
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
      controlConfig: "Control Config",

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
      cpTelegramTitle: "Telegram Notifications",
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

      histSyncing: "Syncing sensors...",
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
      histUnoccupied: "Unoccupied",
    },
    RU: {
      details: "Детали",
      close: "Закрыть",
      room: "Комната",
      rooms: "комнат",
      lastSync: "Синхр.",
      loading: "Загрузка...",

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

      temperature: "ТЕМПЕРАТУРА",
      humidity: "ВЛАЖНОСТЬ",
      airQuality: "КАЧЕСТВО ВОЗДУХА",
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
      controlConfig: "Конфигурация",

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
      cpTelegramTitle: "Уведомления Telegram",
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

      histSyncing: "Синхронизация...",
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
      histUnoccupied: "Свободно",
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
