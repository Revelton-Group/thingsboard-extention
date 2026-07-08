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
   * Render a step line instead of a smoothed/straight line (for on/off style
   * binary series such as window open/closed). false disables stepping.
   */
  @Input() step: "start" | "middle" | "end" | false = false;

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

  /**
   * Optional override for the tooltip's value text (e.g. render a binary
   * 1/0 series as "Open"/"Closed" instead of the raw number).
   */
  @Input() valueFormatter?: (val: number) => string;
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
    if ((changes["data"] || changes["title"] || changes["colors"] || changes["step"]) && this.chart) {
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
        backgroundColor: "#1e293b", // Dark Slate background as in design
        borderWidth: 0,
        borderRadius: 8,
        shadowBlur: 10,
        shadowColor: "rgba(0,0,0,0.2)",
        textStyle: { color: "#f8fafc" },
        padding: [8, 12],
        axisPointer: {
          type: "line",
          lineStyle: {
            color: this.colors[0] || "#94a3b8", // Vertical line matching series color
            width: 1,
            type: "solid"
          }
        },
        formatter: (params: any) => {
          if (!params || !params.length) return '';

          let timeLabel = '';
          if (params[0].value && params[0].value[0]) {
            const date = new Date(params[0].value[0]);
            const hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h = hours % 12 || 12;
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            timeLabel = `${dateLabel}, ${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
          }

          const rawVal = params[0].value && params[0].value[1] !== undefined ? params[0].value[1] : 0;
          const color = params[0].color;
          const unit = this.yAxisUnit || '';
          const val = this.valueFormatter ? this.valueFormatter(rawVal) : `${rawVal} ${unit}`;

          return `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;">
              <span style="font-size:11px; font-weight:500; color:#cbd5e1;">${timeLabel}</span>
              <span style="font-size:13px; font-weight:700; color:${color};">${val}</span>
            </div>
          `;
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
              formatter: this.valueFormatter ? ((val: any) => this.valueFormatter!(val)) : (this.yAxisUnit ? `{value}${this.yAxisUnit}` : undefined),
            },
            position: this.yAxisPosition,
            min: this.yAxisMin !== undefined ? this.yAxisMin : (this.type === "bar" ? 0 : undefined),
            max: this.yAxisMax,
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
          step: !isBar && this.step ? this.step : undefined,
          smooth: !isBar && !this.step,
          showSymbol: !isBar && s.values && s.values.length === 1,
          symbolSize: 10,
          symbol: "circle",
          lineStyle: isBar
            ? undefined
            : {
                width: 2.0,
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
            borderColor: color,
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: color,
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
