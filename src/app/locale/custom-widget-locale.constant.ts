///
/// Copyright © 2023 ThingsBoard, Inc.
///

import { TranslateService } from '@ngx-translate/core';

export default function addCustomWidgetLocale(translate: TranslateService) {

  const enUS = {
    tb: {
      translate: 'translate'
    },
    revelton: {
      room_historical_data: {
        air_quality_monitor: 'Air Quality Monitor',
        pollutants_pressure: 'Pollutants & Pressure',
        acoustics: 'Acoustics',
        windows_sensor_history: 'Windows: Sensor History',
        water_leak: 'Water Leak',
        room_occupancy: 'Room Occupancy',
        temp_humidity_history: 'Temperature & Humidity History',
        click_metric_view_history: 'Click a metric to view history',
        acoustic_noise_levels: 'Acoustic Noise Levels',
        events: 'Events',
        total_open: 'Total Open',
        avg_duration: 'Avg Duration',
        occ_rate: 'Occ. Rate',
        check_in: 'Check-In',
        total_events: 'Total Events',
        last_event: 'Last Event',
        stay_log: 'Stay Log',
        recent_events: 'Recent Events',
        good_safe: 'Good — within safe limits',
        warning_limit: 'Warning — approaching limit',
        danger_limit: 'Danger — exceeds safe limit',
        no_leak: 'No Leak',
        system_clean: 'System Clean',
        unoccupied: 'Unoccupied',
        currently_open: 'Currently Open',
        quiet: 'Quiet',
        live: 'Live',
        no_leak_events_detected: 'No leak events detected. System is clean.',
        no_occupancy_events: 'No occupancy events in this period',
        time_24h: '24h',
        time_7d: '7d',
        time_30d: '30d',
        unit_ppm: 'ppm',
        unit_ppb: 'ppb',
        unit_ug_m3: 'µg/m³',
        unit_db: 'dB',
        unit_c: '°C',
        unit_percent: '%',
        syncing_sensors: 'Syncing Sensors...',
        retry: 'Retry',
        no_data: 'No data',
        no_temp_hum_data: 'No temperature/humidity data',
        failed_to_load: 'Failed to load data. Please try again.',
        temp: 'TEMP',
        humidity: 'HUMIDITY',
        leak_detected: 'Leak Detected',
        open: 'Open',
        closed: 'Closed',
        occupied: 'Occupied',
        no_window_events: 'No window events in this period',
        loud: 'Loud',
        moderate: 'Moderate'
      }
    }
  };
  translate.setTranslation('en_US', enUS, true);
}
