"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X, FileText, Check } from "lucide-react";
import { Card } from "../ui/card";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";

// ============================================================================
// Types
// ============================================================================

type ChartType =
  | "bar"
  | "pie"
  | "donut"
  | "line"
  | "area"
  | "stacked-bar"
  | "horizontal-bar"
  | "combo"
  | "radar"
  | "grouped-bar";

interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  dataKeys: string[];
  colors: string[];
}

interface TableRow {
  id: string;
  mediaType: string;
  type: "Actual" | "Planned";
  level: number;
  data: Record<string, any>;
}

interface ChartGridViewProps {
  columns: string[];
  rows: TableRow[];
  selectedGraphsForPPT?: Set<string> | string[];
  onToggleGraphForPPT?: (
    graphId: string,
    graphTitle: string,
    element?: HTMLElement,
    chartData?: Array<{ name: string; [key: string]: any }>,
    dataKeys?: string[],
  ) => void;
  onUpdateSlideNumber?: (
    graphId: string,
    slideNumber: number | undefined,
  ) => void;
  getSlideNumber?: (graphId: string) => number | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = [
  "#8B5CF6",
  "#A78BFA",
  "#C4B5FD",
  "#7C3AED",
  "#6D28D9",
  "#5B21B6",
  "#4C1D95",
  "#DDD6FE",
  "#EDE9FE",
  "#F5F3FF",
];

const COLUMN_LABELS: Record<string, string> = {
  total_net_net_spend: "Net Net Spend",
  total_addressable_net_net_spend: "Addressable Spend",
  total_net_net_measured: "Measured Spend",
  measured_spend_pct: "Measured %",
  savings_value: "Savings",
  savings_pct: "Savings %",
  inflation_pct: "Inflation %",
  inflation_migration_pct: "Inflation Mitigation",
  inflation_after_migration_pct: "Inflation After Mitigation %",
  total_non_addressable_spend: "Non-Addressable",
  total_addressable_spend: "Addressable",
  measured_spend: "Measured Spend",
  benchmark_equivalent_net_net_spend: "Benchmark Spend",
  value_loss: "Value Loss",
  value_loss_pct: "Value Loss %",
};

const getColumnLabel = (col: string) => COLUMN_LABELS[col] || col;

// ============================================================================
// Chart Generation Logic
// ============================================================================

function generateChartConfigs(columns: string[]): ChartConfig[] {
  // Filter out non-numeric columns
  const numericCols = columns.filter((col) => col !== "mediaType");
  if (numericCols.length === 0) return [];

  const charts: ChartConfig[] = [];
  let chartIndex = 0;

  // 1. Bar Chart - First numeric column
  if (numericCols[0]) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} by Media Type`,
      type: "bar",
      dataKeys: [numericCols[0]],
      colors: [CHART_COLORS[0]],
    });
  }

  // 2. Pie Chart - First numeric column distribution
  if (numericCols[0]) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} Distribution`,
      type: "pie",
      dataKeys: [numericCols[0]],
      colors: CHART_COLORS,
    });
  }

  // 3. Donut Chart - Second numeric column or first
  const donutCol = numericCols[1] || numericCols[0];
  if (donutCol) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(donutCol)} Share`,
      type: "donut",
      dataKeys: [donutCol],
      colors: CHART_COLORS,
    });
  }

  // 4. Horizontal Bar - Third column or first
  const hBarCol = numericCols[2] || numericCols[0];
  if (hBarCol) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(hBarCol)} Comparison`,
      type: "horizontal-bar",
      dataKeys: [hBarCol],
      colors: [CHART_COLORS[3]],
    });
  }

  // 5. Stacked Bar - Two columns if available
  if (numericCols.length >= 2) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} vs ${getColumnLabel(numericCols[1])}`,
      type: "stacked-bar",
      dataKeys: [numericCols[0], numericCols[1]],
      colors: [CHART_COLORS[0], CHART_COLORS[2]],
    });
  } else if (numericCols[0]) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} Stacked`,
      type: "bar",
      dataKeys: [numericCols[0]],
      colors: [CHART_COLORS[0]],
    });
  }

  // 6. Line Chart - Trend view
  const lineCol = numericCols[3] || numericCols[0];
  if (lineCol) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(lineCol)} Trend`,
      type: "line",
      dataKeys: [lineCol],
      colors: [CHART_COLORS[4]],
    });
  }

  // 7. Area Chart
  const areaCol = numericCols[4] || numericCols[1] || numericCols[0];
  if (areaCol) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(areaCol)} Area`,
      type: "area",
      dataKeys: [areaCol],
      colors: [CHART_COLORS[1]],
    });
  }

  // 8. Combo Chart - Bar + Line
  if (numericCols.length >= 2) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} & ${getColumnLabel(numericCols[1])} Combo`,
      type: "combo",
      dataKeys: [numericCols[0], numericCols[1]],
      colors: [CHART_COLORS[0], CHART_COLORS[5]],
    });
  } else if (numericCols[0]) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} Overview`,
      type: "bar",
      dataKeys: [numericCols[0]],
      colors: [CHART_COLORS[0]],
    });
  }

  // 9. Radar Chart - Multiple metrics
  const radarCols = numericCols.slice(0, Math.min(5, numericCols.length));
  if (radarCols.length >= 2) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: "Multi-Metric Radar",
      type: "radar",
      dataKeys: radarCols,
      colors: [CHART_COLORS[0]],
    });
  } else if (numericCols[0]) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} Radar`,
      type: "radar",
      dataKeys: [numericCols[0]],
      colors: [CHART_COLORS[0]],
    });
  }

  // 10. Grouped Bar - Compare multiple metrics
  if (numericCols.length >= 2) {
    const groupedCols = numericCols.slice(0, Math.min(3, numericCols.length));
    charts.push({
      id: `chart-${chartIndex++}`,
      title: "Metrics Comparison",
      type: "grouped-bar",
      dataKeys: groupedCols,
      colors: groupedCols.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
    });
  } else if (numericCols[0]) {
    charts.push({
      id: `chart-${chartIndex++}`,
      title: `${getColumnLabel(numericCols[0])} Summary`,
      type: "bar",
      dataKeys: [numericCols[0]],
      colors: [CHART_COLORS[0]],
    });
  }

  return charts.slice(0, 10);
}

// ============================================================================
// Value Formatting
// ============================================================================

function formatValue(value: number, isPercentage: boolean = false): string {
  if (value === null || value === undefined) return "—";
  if (isPercentage) return `${value.toFixed(1)}%`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(1);
}

// ============================================================================
// Component
// ============================================================================

export function ChartGridView({
  columns,
  rows,
  selectedGraphsForPPT = new Set(),
  onToggleGraphForPPT,
  onUpdateSlideNumber,
  getSlideNumber,
}: ChartGridViewProps) {
  const [fullScreenChart, setFullScreenChart] = useState<ChartConfig | null>(
    null,
  );
  const fullScreenChartRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate charts based on visible columns
  const charts = useMemo(() => generateChartConfigs(columns), [columns]);

  // Prepare chart data from rows
  const chartData = useMemo((): Array<{ name: string; [key: string]: any }> => {
    if (!rows || rows.length === 0) return [];
    return rows
      .filter((row) => row.mediaType !== "Total")
      .map((row) => ({
        name: row.mediaType,
        ...row.data,
      }));
  }, [rows]);

  // Check if a chart is in PPT
  const isChartInPPT = useCallback(
    (chartId: string) => {
      if (!selectedGraphsForPPT) return false;
      if (selectedGraphsForPPT instanceof Set)
        return selectedGraphsForPPT.has(chartId);
      if (Array.isArray(selectedGraphsForPPT))
        return selectedGraphsForPPT.includes(chartId);
      return false;
    },
    [selectedGraphsForPPT],
  );

  const handleToggleForPPT = useCallback(
    (
      chartId: string,
      chartTitle: string,
      element?: HTMLElement,
      chartConfig?: ChartConfig,
    ) => {
      if (onToggleGraphForPPT) {
        // Pass chart data and data keys for the table
        onToggleGraphForPPT(
          chartId,
          chartTitle,
          element,
          chartData,
          chartConfig?.dataKeys,
        );
      }
    },
    [onToggleGraphForPPT, chartData],
  );

  // Render individual chart
  // showLabels: true for full-screen view, false for thumbnail grid
  const renderChart = (
    chart: ChartConfig,
    height: number = 160,
    showLabels: boolean = false,
  ) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded">
          <p className="text-xs text-slate-400">No data available</p>
        </div>
      );
    }

    const isPercentage = chart.dataKeys.some((k) => k.includes("pct"));
    const fontSize = showLabels ? 12 : 9;
    const tickFontSize = showLabels ? 11 : 9;

    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: showLabels ? 30 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={showLabels ? { fontSize: tickFontSize } : false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                labelFormatter={(label) => label}
                contentStyle={{ fontSize: fontSize }}
              />
              <Bar
                dataKey={chart.dataKeys[0]}
                fill={chart.colors[0]}
                radius={[4, 4, 0, 0]}
                label={
                  {
                    position: "top",
                    fontSize: showLabels ? 10 : 8,
                    fill: "#475569",
                    formatter: (v: any) => formatValue(v, isPercentage),
                  } as any
                }
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "horizontal-bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 10,
                right: 30,
                left: showLabels ? 80 : 50,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: tickFontSize }}
                width={showLabels ? 70 : 45}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
              <Bar
                dataKey={chart.dataKeys[0]}
                fill={chart.colors[0]}
                radius={[0, 4, 4, 0]}
                label={
                  {
                    position: "right",
                    fontSize: showLabels ? 10 : 8,
                    fill: "#475569",
                    formatter: (v: any) => formatValue(v, isPercentage),
                  } as any
                }
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        // Filter out zero/null values for pie chart
        const pieData = chartData.filter((d) => {
          const val = d[chart.dataKeys[0]];
          return val !== null && val !== undefined && val !== 0;
        });
        // Custom label renderer with lines pointing to slices
        const renderPieLabel = (props: any) => {
          const { name, value } = props;
          if (!value || value === 0) return null;
          return `${name}: ${formatValue(value, isPercentage)}`;
        };
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={showLabels ? Math.min(height * 0.32, 140) : Math.min(height * 0.38, 55)}
                dataKey={chart.dataKeys[0]}
                label={showLabels ? renderPieLabel : false}
                labelLine={showLabels}
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chart.colors[index % chart.colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [
                  formatValue(v, isPercentage),
                  name,
                ]}
                contentStyle={{ fontSize: fontSize }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case "donut":
        // Filter out zero/null values for donut chart
        const donutData = chartData.filter((d) => {
          const val = d[chart.dataKeys[0]];
          return val !== null && val !== undefined && val !== 0;
        });
        // Custom label renderer with lines pointing to slices
        const renderDonutLabel = (props: any) => {
          const { name, value } = props;
          if (!value || value === 0) return null;
          return `${name}: ${formatValue(value, isPercentage)}`;
        };
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsPieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={showLabels ? Math.min(height * 0.18, 70) : Math.min(height * 0.2, 25)}
                outerRadius={showLabels ? Math.min(height * 0.32, 140) : Math.min(height * 0.38, 55)}
                dataKey={chart.dataKeys[0]}
                label={showLabels ? renderDonutLabel : false}
                labelLine={showLabels}
              >
                {donutData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chart.colors[index % chart.colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [
                  formatValue(v, isPercentage),
                  name,
                ]}
                contentStyle={{ fontSize: fontSize }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: showLabels ? 30 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={showLabels ? { fontSize: tickFontSize } : false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
              <Line
                type="monotone"
                dataKey={chart.dataKeys[0]}
                stroke={chart.colors[0]}
                strokeWidth={2}
                dot={{ r: showLabels ? 5 : 3 }}
                label={
                  {
                    position: "top",
                    fontSize: showLabels ? 11 : 9,
                    fill: "#475569",
                    formatter: (v: any) => formatValue(v, isPercentage),
                  } as any
                }
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: showLabels ? 30 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={showLabels ? { fontSize: tickFontSize } : false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
              <Area
                type="monotone"
                dataKey={chart.dataKeys[0]}
                stroke={chart.colors[0]}
                fill={chart.colors[0]}
                fillOpacity={0.3}
                label={
                  {
                    position: "top",
                    fontSize: showLabels ? 11 : 9,
                    fill: "#475569",
                    formatter: (v: any) => formatValue(v, isPercentage),
                  } as any
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "stacked-bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: showLabels ? 30 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={showLabels ? { fontSize: tickFontSize } : false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
              {showLabels && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {chart.dataKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={chart.colors[i]}
                  name={getColumnLabel(key)}
                  label={
                    i === chart.dataKeys.length - 1
                      ? ({
                          position: "top",
                          fontSize: showLabels ? 11 : 9,
                          fill: "#475569",
                          formatter: (v: any, entry: any, index: number) => {
                            // Show total of stacked values for the top segment only
                            // entry.payload contains the original data object
                            const dataPoint = entry?.payload || entry || {};
                            const total = chart.dataKeys.reduce((sum, k) => {
                              const val = dataPoint[k];
                              return sum + (typeof val === "number" ? val : 0);
                            }, 0);
                            return formatValue(total, isPercentage);
                          },
                        } as any)
                      : false
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "combo":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: showLabels ? 30 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={showLabels ? { fontSize: tickFontSize } : false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
              {showLabels && <Legend wrapperStyle={{ fontSize: 11 }} />}
              <Bar
                dataKey={chart.dataKeys[0]}
                fill={chart.colors[0]}
                name={getColumnLabel(chart.dataKeys[0])}
                label={
                  {
                    position: "top",
                    fontSize: showLabels ? 11 : 9,
                    fill: "#475569",
                    formatter: (v: any) => formatValue(v, isPercentage),
                  } as any
                }
              />
              {chart.dataKeys[1] && (
                <Line
                  type="monotone"
                  dataKey={chart.dataKeys[1]}
                  stroke={chart.colors[1]}
                  strokeWidth={2}
                  name={getColumnLabel(chart.dataKeys[1])}
                  label={
                    {
                      position: "top",
                      fontSize: showLabels ? 11 : 9,
                      fill: chart.colors[1],
                      formatter: (v: any) => formatValue(v, isPercentage),
                    } as any
                  }
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "radar":
        const radarData = chartData.map((d) => ({
          name: d.name,
          value: d[chart.dataKeys[0]] || 0,
        }));
        // Custom tick renderer to show name + value (only when showLabels=true)
        const renderRadarTick = (props: any) => {
          const { x, y, payload } = props;
          if (showLabels) {
            const item = radarData.find((d) => d.name === payload.value);
            const val = item ? formatValue(item.value, isPercentage) : "";
            return (
              <text x={x} y={y} textAnchor="middle" fill="#475569" fontSize={10}>
                <tspan x={x} dy="0">{payload.value}</tspan>
                <tspan x={x} dy="12" fontWeight="600">{val}</tspan>
              </text>
            );
          }
          return (
            <text x={x} y={y} textAnchor="middle" fill="#475569" fontSize={8}>
              {payload.value}
            </text>
          );
        };
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart
              data={radarData}
              cx="50%"
              cy="50%"
              outerRadius={showLabels ? "60%" : "70%"}
              margin={{ top: 25, right: 30, left: 30, bottom: 25 }}
            >
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="name" tick={renderRadarTick} />
              <Radar
                dataKey="value"
                stroke={chart.colors[0]}
                fill={chart.colors[0]}
                fillOpacity={0.5}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "grouped-bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: showLabels ? 30 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={showLabels ? { fontSize: tickFontSize } : false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: tickFontSize }}
                tickFormatter={(v) => formatValue(v, isPercentage)}
                width={55}
              />
              <Tooltip
                formatter={(v: number) => formatValue(v, isPercentage)}
                contentStyle={{ fontSize: fontSize }}
              />
              {showLabels && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {chart.dataKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={chart.colors[i]}
                  name={getColumnLabel(key)}
                  label={
                    {
                      position: "top",
                      fontSize: showLabels ? 10 : 8,
                      fill: "#475569",
                      formatter: (v: any) => formatValue(v, isPercentage),
                    } as any
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Empty state when no charts
  if (charts.length === 0) {
    return (
      <div className="bg-white border-t border-slate-200 max-w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-slate-900 font-semibold">Chart Visualizations</h3>
          <p className="text-sm text-slate-500 mt-1">
            Select data to generate charts
          </p>
        </div>
        <div className="p-12 text-center">
          <p className="text-slate-400">No data available for visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-slate-200 max-w-full overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-slate-900 font-semibold">Chart Visualizations</h3>
        <p className="text-sm text-slate-500 mt-1">
          {charts.length} charts based on{" "}
          {columns.filter((c) => c !== "mediaType").length} visible columns
        </p>
      </div>

      {/* Chart Grid - 5 columns × 2 rows */}
      <div className="p-6 overflow-x-auto">
        <div className="grid grid-cols-5 gap-4 min-w-[1000px]">
          {charts.map((chart) => (
            <Card
              key={chart.id}
              className="overflow-hidden border-slate-200 hover:shadow-lg transition-all relative group"
            >
              {/* Chart Header */}
              <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h5 className="text-xs font-medium text-slate-900 truncate flex-1">
                  {chart.title}
                </h5>
                <div className="flex items-center gap-1">
                  {/* Expand Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenChart(chart);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200"
                    title="Expand"
                  >
                    <Maximize2 className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Chart Content */}
              <div className="p-3 bg-white h-44">
                {renderChart(chart, 160)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Full-Screen Modal - rendered via portal to ensure it's above everything */}
      {fullScreenChart &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setFullScreenChart(null)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200/60">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {fullScreenChart.title}
                    </h3>
                    <p className="text-sm text-slate-500">Expanded view</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      // For removal, no element needed
                      if (isChartInPPT(`table-${fullScreenChart.id}`)) {
                        handleToggleForPPT(
                          `table-${fullScreenChart.id}`,
                          fullScreenChart.title,
                          undefined,
                          fullScreenChart,
                        );
                        return;
                      }
                      // For adding, get element (should be available since modal is already open)
                      const element = fullScreenChartRef.current;
                      if (element) {
                        handleToggleForPPT(
                          `table-${fullScreenChart.id}`,
                          fullScreenChart.title,
                          element,
                          fullScreenChart,
                        );
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-medium shadow-sm ${
                      isChartInPPT(`table-${fullScreenChart.id}`)
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                        : "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                    }`}
                  >
                    {isChartInPPT(`table-${fullScreenChart.id}`) ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to PPT</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Add to PPT</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setFullScreenChart(null)}
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100/50">
                <div
                  ref={fullScreenChartRef}
                  className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto"
                >
                  <div style={{ height: "500px" }}>
                    {renderChart(fullScreenChart, 500, true)}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
