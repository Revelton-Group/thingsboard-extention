/**
 * Chart data models. Replaces all `any[]` chart data arrays.
 */

/** A single [timestamp, value] data point */
export type ChartPoint = [number, number];

/** One named data series for ECharts */
export interface ChartSeries {
  name: string;
  values: ChartPoint[];
  /** When true the series renders as a dashed reference line */
  dashed?: boolean;
  /** Internal flag: temperature injected from env sensor, not TRV */
  _fromEnvSensor?: boolean;
}

/** Full air quality split: one series per metric for sparklines */
export interface AirQualityChartData {
  combined: ChartSeries[];   // Temperature + Humidity dual-axis
  co2: ChartSeries[];
  pm25: ChartSeries[];
  tvoc: ChartSeries[];
  iaq: ChartSeries[];
  pressure: ChartSeries[];
}

export const EMPTY_AIR_QUALITY_CHART = (): AirQualityChartData => ({
  combined: [], co2: [], pm25: [], tvoc: [], iaq: [], pressure: [],
});
