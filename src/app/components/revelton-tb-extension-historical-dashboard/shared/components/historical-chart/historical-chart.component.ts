import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  OnDestroy,
} from "@angular/core";
import * as echarts from "echarts";
import { Subscription } from "rxjs";
import { ThemeService } from "../../../../revelton-tb-extension-dashboard/core/services/theme.service";

/**
 * HistoricalChartComponent
 *
 * SOLID: Interface Segregation - Focuses specifically on rendering time-series data using ECharts.
 * KISS: Keeps the chart initialization and data update logic simple and decoupled from data fetching.
 * DRY: Reusable chart component that can be styled via inputs for different metrics (Environment, Acoustics, etc.).
 */
@Component({
  selector: "revelton-historical-chart",
  template: `
    <div class="chart-header" *ngIf="title">
      <mat-icon
        *ngIf="icon"
        [style.color]="colors && colors.length ? colors[0] : '#94a3b8'"
        >{{ icon }}</mat-icon
      >
      <span class="chart-title">{{ title }}</span>
    </div>
    <div #chartContainer class="chart-container"></div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .chart-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .chart-header mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .chart-title {
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
      }
      .chart-container {
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
      }

      :host-context(.tb-dark) .chart-title {
        color: #f8fafc;
      }
    `,
  ],
  standalone: false,
})
export class HistoricalChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild("chartContainer", { static: true }) chartContainer: ElementRef;

  /**
   * Chart title (e.g., 'Environment Historical Data')
   */
  @Input() title: string;

  /**
   * Material icon name for the chart title
   */
  @Input() icon: string;

  /**
   * Array of data series to display
   */
  @Input() data: any[] = [];

  /**
   * Array of colors for the series
   */
  @Input() colors: string[] = ["#8b5cf6", "#3b82f6", "#ef4444"];

  /**
   * Type of chart (line, bar)
   */
  @Input() type: "line" | "bar" = "line";

  /**
   * Whether to render with area fill (gradient)
   */
  @Input() area: boolean = false;

  /**
   * Whether to render in sparkline mode (hides axes and legends)
   */
  @Input() sparkline: boolean = false;

  /**
   * Whether to use dual Y-axes (left and right) for the first two series
   */
  @Input() dualAxis: boolean = false;

  /**
   * Whether to show the legend
   */
  @Input() showLegend = true;
  @Input() showSplitLine = true;
  @Input() showYAxisLabels = true;
  @Input() yAxisPosition: 'left' | 'right' = 'left';
  @Input() yAxisUnit = '';
  @Input() yAxisMin?: number;
  @Input() yAxisMax?: number;
  @Input() yAxisInterval?: number;

  private chart: echarts.ECharts;
  private resizeObserver: ResizeObserver;
  private sub = new Subscription();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.initChart();
    this.setupResizeObserver();

    // Listen to theme mode changes to repaint chart colors
    this.sub.add(
      this.themeService.mode$.subscribe(() => {
        if (this.chart) {
          this.updateChart();
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes["data"] || changes["title"] || changes["colors"]) && this.chart) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chart) {
      this.chart.dispose();
    }
  }

  private initChart(): void {
    this.chart = echarts.init(this.chartContainer.nativeElement);
    // Force size recalculation after layout settles
    setTimeout(() => {
      this.chart?.resize();
      this.updateChart();
    }, 100);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  private updateChart(): void {
    const hotelContainer = this.chartContainer?.nativeElement?.closest(
      ".revelton-hotel-container"
    ) || this.chartContainer?.nativeElement?.closest(
      ".revelton-dashboard-container"
    );
    const isDark = hotelContainer
      ? hotelContainer.getAttribute("data-mode") !== "light"
      : document.documentElement.getAttribute("data-mode") !== "light";

    const textColor = isDark ? "#6a7b87" : "#64748b";
    const splitLineColor = isDark ? "#252836" : "#e2e8f0";
    const tooltipBg = isDark ? "#1a1d27" : "#ffffff";
    const tooltipText = isDark ? "#f8fafc" : "#0f172a";

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderWidth: 1,
        borderColor: isDark ? "#1a2228" : "#e2e8f0",
        shadowBlur: 20,
        shadowColor: "rgba(0,0,0,0.15)",
        textStyle: { color: tooltipText },
        padding: [12, 16],
        formatter: (params: any) => {
          if (!params || !params.length) return '';

          let dateStr = '';
          if (params[0].value && params[0].value[0]) {
            const date = new Date(params[0].value[0]);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const showDate = diffMs > 86_400_000; // show date if older than 24h

            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const timeLabel = showDate
              ? `${month} ${day}, ${hours}:${minutes}`
              : `${hours}:${minutes}`;

            dateStr = `<div style="font-weight:600; margin-bottom:10px; font-size:13px; color:${tooltipText}; border-bottom:1px solid ${splitLineColor}; padding-bottom:8px;">${timeLabel}</div>`;
          }

          const itemsStr = params
            .map((p: any) => {
              const val = p.value && p.value[1] !== undefined ? p.value[1] : '';
              return `<div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; font-size:12px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.color};"></span>
                <span style="color:${tooltipText}; flex:1;">${p.seriesName}</span>
                <span style="color:${p.color}; font-weight:600;">${val}</span>
              </div>`;
            })
            .join('');

          return dateStr + itemsStr;
        },
      },
      legend: {
        show: this.showLegend && !this.sparkline,
        bottom: "0",
        icon: "circle",
        itemWidth: 10,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: this.sparkline
        ? {
            left: 0,
            right: 0,
            top: 5,
            bottom: 5,
            containLabel: false,
          }
        : {
            left: this.yAxisPosition === 'left' ? "5%" : "2%",
            right: this.yAxisPosition === 'right' ? (this.showYAxisLabels ? "10%" : "2%") : "4%",
            top: "5%",
            bottom: "15%",
            containLabel: true,
          },
      xAxis: {
        type: "time",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: !this.sparkline, color: textColor, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: this.dualAxis
        ? [
            {
              type: "value",
              show: !this.sparkline,
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                show: !this.sparkline,
                color: textColor,
                fontSize: 11,
                formatter: "{value}°C",
              },
              splitLine: {
                show: !this.sparkline,
                lineStyle: { type: "dashed", color: splitLineColor },
              },
              scale: true,
            },
            {
              type: "value",
              show: !this.sparkline,
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                show: !this.sparkline,
                color: textColor,
                fontSize: 11,
                formatter: "{value}%",
              },
              splitLine: { show: false },
              scale: true,
            },
          ]
        : {
            type: "value",
            show: !this.sparkline,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              show: this.showYAxisLabels && !this.sparkline,
              color: textColor,
              fontSize: 10,
              formatter: this.yAxisUnit ? `{value}${this.yAxisUnit}` : undefined,
            },
            position: this.yAxisPosition,
            min: this.yAxisMin !== undefined ? this.yAxisMin : (this.type === "bar" ? 0 : undefined),
            max: this.yAxisMax !== undefined ? this.yAxisMax : (this.type === "bar" ? 1 : undefined),
            interval: this.yAxisInterval ?? undefined,
            minInterval: 1,

            splitLine: {
              show: this.showSplitLine && !this.sparkline,
              lineStyle: { type: "dashed", color: splitLineColor },
            },
          },
      series: (this.data || []).map((s, index) => {
        const color = this.colors[index % this.colors.length];
        const isDashed = s.dashed === true || s.name.includes("CO2");
        const isBar = this.type === "bar";

        return {
          name: s.name,
          type: this.type,
          data: s.values,
          yAxisIndex: this.dualAxis && index === 1 ? 1 : 0,
          smooth: !isBar,
          showSymbol: !isBar && s.values && s.values.length === 1,
          symbolSize: 8,
          symbol: "circle",
          lineStyle: isBar
            ? undefined
            : {
                width: 2.5,
                type: isDashed ? "dashed" : "solid",
              },
          itemStyle: {
            color: (params: any) => {
              const val = params.value && params.value[1] !== undefined ? params.value[1] : 0;
              // If noise level is high (> 45 as in user's image logic), use orange
              const baseColor = (this.type === 'bar' && val > 45) ? '#fb923c' : color;
              
              if (isBar) {
                return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: baseColor },
                  { offset: 0.7, color: baseColor + "aa" },
                  { offset: 1, color: baseColor + "22" },
                ]);
              }
              return baseColor;
            },
            borderRadius: isBar ? [2, 2, 0, 0] : 0,
          },
          barWidth: isBar ? "35%" : undefined,
          barMaxWidth: isBar ? 20 : undefined,
          barMinHeight: isBar ? 2 : undefined,
          areaStyle:
            !isBar && this.area
              ? {
                  opacity: 0.2,
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: color },
                    { offset: 1, color: "rgba(0, 0, 0, 0)" },
                  ]),
                }
              : undefined,
        };
      }),
    };

    this.chart.setOption(option, true);
    // Always resize after data update to ensure canvas matches container
    setTimeout(() => this.chart?.resize(), 0);
  }
}
