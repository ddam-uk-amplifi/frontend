"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, X, FileText, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Scatter as RechartsScatter,
  ScatterChart,
} from "recharts";

export interface ChartConfig {
  id: string;
  title: string;
  type:
    | "donut-pie"
    | "pie"
    | "column"
    | "stacked-bar"
    | "clustered-bar"
    | "pareto"
    | "bar-line-combo"
    | "scatter"
    | "scatter-line"
    | "scatter-line-markers";
  dataKey: string;
  secondaryDataKey?: string;
  categoryKey: string;
  colors: string[];
}

interface TableRow {
  id: string;
  mediaType: string;
  type: "Actual" | "Planned";
  level: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
  data: Record<string, any>;
}

interface ChartGridViewProps {
  columns: string[];
  rows: TableRow[];
  selectedGraphsForPPT?: Set<string>;
  onToggleGraphForPPT?: (
    graphId: string,
    graphTitle: string,
    element?: HTMLElement
  ) => void;
  onUpdateSlideNumber?: (graphId: string, slideNumber: number | undefined) => void;
  getSlideNumber?: (graphId: string) => number | undefined;
}

// Define the 10 chart types
const CHART_TYPES: Omit<ChartConfig, "id">[] = [
  {
    title: "Share of Spend by Media Type",
    type: "donut-pie",
    dataKey: "shareOfSpend",
    categoryKey: "mediaType",
    colors: [
      "#8B5CF6",
      "#A78BFA",
      "#C4B5FD",
      "#DDD6FE",
      "#EDE9FE",
      "#F5F3FF",
      "#FAF5FF",
      "#FDFCFE",
    ],
  },
  {
    title: "Media Distribution (2D Pie)",
    type: "pie",
    dataKey: "shareOfSpend",
    categoryKey: "mediaType",
    colors: [
      "#8B5CF6",
      "#A78BFA",
      "#C4B5FD",
      "#DDD6FE",
      "#EDE9FE",
      "#F5F3FF",
      "#FAF5FF",
      "#FDFCFE",
    ],
  },
  {
    title: "Media Net by Type",
    type: "column",
    dataKey: "mediaNet",
    categoryKey: "mediaType",
    colors: ["#8B5CF6"],
  },
  {
    title: "Addressable Spend Breakdown",
    type: "stacked-bar",
    dataKey: "addressable",
    secondaryDataKey: "nonAddressable",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#DDD6FE"],
  },
  {
    title: "Actual vs Planned Comparison",
    type: "clustered-bar",
    dataKey: "mediaNet",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#C084FC"],
  },
  {
    title: "Spend Pareto Analysis",
    type: "pareto",
    dataKey: "mediaNet",
    secondaryDataKey: "shareOfSpend",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#F472B6"],
  },
  {
    title: "Spend & Share Combination",
    type: "bar-line-combo",
    dataKey: "mediaNet",
    secondaryDataKey: "shareOfSpend",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#F472B6"],
  },
  {
    title: "Addressable vs Audited",
    type: "scatter",
    dataKey: "addressable",
    secondaryDataKey: "audited",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"],
  },
  {
    title: "Addressable vs Audited (With Lines)",
    type: "scatter-line",
    dataKey: "addressable",
    secondaryDataKey: "audited",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"],
  },
  {
    title: "Addressable vs Audited (Lines & Markers)",
    type: "scatter-line-markers",
    dataKey: "addressable",
    secondaryDataKey: "audited",
    categoryKey: "mediaType",
    colors: ["#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"],
  },
];

// Dummy sample data for preview when no client is selected
const DUMMY_SAMPLE_DATA = {
  pie: [
    { name: "TV", value: 35 },
    { name: "Digital", value: 40 },
    { name: "OOH", value: 12 },
    { name: "Radio", value: 8 },
    { name: "Print", value: 5 },
  ],
  column: [
    { name: "TV", value: 1200000 },
    { name: "Digital", value: 1400000 },
    { name: "OOH", value: 400000 },
    { name: "Radio", value: 250000 },
    { name: "Print", value: 150000 },
  ],
  clustered: [
    { name: "TV", actual: 1200000, planned: 1190000 },
    { name: "Digital", actual: 1400000, planned: 1450000 },
    { name: "OOH", actual: 400000, planned: 380000 },
    { name: "Radio", actual: 250000, planned: 240000 },
    { name: "Print", actual: 150000, planned: 140000 },
  ],
  stacked: [
    { name: "TV", primary: 600000, secondary: 600000 },
    { name: "Digital", primary: 700000, secondary: 700000 },
    { name: "OOH", primary: 200000, secondary: 200000 },
    { name: "Radio", primary: 125000, secondary: 125000 },
    { name: "Print", primary: 75000, secondary: 75000 },
  ],
  combo: [
    { name: "TV", value: 1200000, percentage: 35 },
    { name: "Digital", value: 1400000, percentage: 40 },
    { name: "OOH", value: 400000, percentage: 12 },
    { name: "Radio", value: 250000, percentage: 8 },
    { name: "Print", value: 150000, percentage: 5 },
  ],
  pareto: [
    { name: "Digital", value: 1400000, percentage: 40, cumulative: 40 },
    { name: "TV", value: 1200000, percentage: 35, cumulative: 75 },
    { name: "OOH", value: 400000, percentage: 12, cumulative: 87 },
    { name: "Radio", value: 250000, percentage: 8, cumulative: 95 },
    { name: "Print", value: 150000, percentage: 5, cumulative: 100 },
  ],
  scatter: [
    { name: "TV", x: 600000000, y: 600000000, z: 100 },
    { name: "Digital", x: 700000000, y: 700000000, z: 100 },
    { name: "OOH", x: 200000000, y: 200000000, z: 100 },
    { name: "Radio", x: 125000000, y: 125000000, z: 100 },
    { name: "Print", x: 75000000, y: 75000000, z: 100 },
  ],
};

export function ChartGridView({
  columns,
  rows,
  selectedGraphsForPPT = new Set(),
  onToggleGraphForPPT,
  onUpdateSlideNumber,
  getSlideNumber,
}: ChartGridViewProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [fullScreenChart, setFullScreenChart] = useState<ChartConfig | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set());

  // Refs for chart elements (for PPT capture)
  const chartRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const fullScreenChartRef = useRef<HTMLDivElement | null>(null);

  // Handle PPT toggle for a chart
  const handleToggleForPPT = useCallback(
    (chartId: string, chartTitle: string, element?: HTMLElement) => {
      if (onToggleGraphForPPT) {
        onToggleGraphForPPT(chartId, chartTitle, element);
      }
    },
    [onToggleGraphForPPT]
  );

  // Check if a chart is included in PPT
  const isChartInPPT = useCallback(
    (chartId: string) => selectedGraphsForPPT.has(chartId),
    [selectedGraphsForPPT]
  );

  // Initialize charts on mount
  useEffect(() => {
    const initializedCharts = CHART_TYPES.map((chartType, index) => ({
      ...chartType,
      id: `chart-${index}`,
    }));
    setCharts(initializedCharts);
  }, []);

  // Generate chart data from table rows
  const generateChartData = (chart: ChartConfig) => {
    if (!rows || rows.length === 0) return [];

    // Filter out Total rows and group data by media type
    const mediaTypeMap = new Map<
      string,
      { actual?: TableRow; planned?: TableRow }
    >();

    rows.forEach((row) => {
      if (row.mediaType === "Total") return;

      const existing = mediaTypeMap.get(row.mediaType) || {};
      if (row.type === "Actual") {
        existing.actual = row;
      } else {
        existing.planned = row;
      }
      mediaTypeMap.set(row.mediaType, existing);
    });

    const mediaTypes = Array.from(mediaTypeMap.keys());

    if (chart.type === "pie" || chart.type === "donut-pie") {
      return mediaTypes
        .map((mediaType) => {
          const data = mediaTypeMap.get(mediaType);
          const actualRow = data?.actual;
          const value = actualRow?.data[chart.dataKey];
          return {
            name: mediaType,
            value: typeof value === "number" ? value : 0,
          };
        })
        .filter((item) => item.value > 0);
    }

    if (chart.type === "column") {
      return mediaTypes
        .map((mediaType) => {
          const data = mediaTypeMap.get(mediaType);
          const actualRow = data?.actual;
          const value = actualRow?.data[chart.dataKey];
          return {
            name: mediaType,
            value: typeof value === "number" ? value : 0,
          };
        })
        .filter((item) => item.value > 0);
    }

    if (chart.type === "clustered-bar") {
      return mediaTypes.map((mediaType) => {
        const data = mediaTypeMap.get(mediaType);
        const actualRow = data?.actual;
        const plannedRow = data?.planned;
        const actualValue = actualRow?.data[chart.dataKey];
        const plannedValue = plannedRow?.data[chart.dataKey];
        return {
          name: mediaType,
          actual: typeof actualValue === "number" ? actualValue : 0,
          planned: typeof plannedValue === "number" ? plannedValue : 0,
        };
      });
    }

    if (chart.type === "stacked-bar") {
      return mediaTypes.map((mediaType) => {
        const data = mediaTypeMap.get(mediaType);
        const actualRow = data?.actual;
        const primaryValue = actualRow?.data[chart.dataKey];
        const secondaryValue =
          actualRow?.data[chart.secondaryDataKey || chart.dataKey];
        return {
          name: mediaType,
          primary: typeof primaryValue === "number" ? primaryValue : 0,
          secondary: typeof secondaryValue === "number" ? secondaryValue : 0,
        };
      });
    }

    if (chart.type === "bar-line-combo" || chart.type === "pareto") {
      const chartData = mediaTypes.map((mediaType) => {
        const data = mediaTypeMap.get(mediaType);
        const actualRow = data?.actual;
        const dataValue = actualRow?.data[chart.dataKey];
        const percentValue =
          actualRow?.data[chart.secondaryDataKey || "shareOfSpend"];
        return {
          name: mediaType,
          value: typeof dataValue === "number" ? dataValue : 0,
          percentage: typeof percentValue === "number" ? percentValue : 0,
        };
      });

      if (chart.type === "pareto") {
        chartData.sort((a, b) => b.value - a.value);
        let cumulative = 0;
        chartData.forEach((item) => {
          cumulative += item.percentage;
          (item as any).cumulative = cumulative;
        });
      }

      return chartData;
    }

    if (
      chart.type === "scatter" ||
      chart.type === "scatter-line" ||
      chart.type === "scatter-line-markers"
    ) {
      return mediaTypes
        .map((mediaType) => {
          const data = mediaTypeMap.get(mediaType);
          const actualRow = data?.actual;
          const xValue = actualRow?.data[chart.dataKey];
          const yValue =
            actualRow?.data[chart.secondaryDataKey || chart.dataKey];
          return {
            name: mediaType,
            x: typeof xValue === "number" ? xValue : 0,
            y: typeof yValue === "number" ? yValue : 0,
            z: 100,
          };
        })
        .filter((item) => item.x > 0 && item.y > 0);
    }

    return [];
  };

  const renderChart = (chart: ChartConfig, height: number = 250) => {
    // If no rows at all (no client selected), show "No data available"
    if (!rows || rows.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded">
          <p className="text-xs text-slate-400">No data available</p>
        </div>
      );
    }

    // Client is selected, use real data from table
    const data = generateChartData(chart);

    // If still no data, show placeholder
    if (!data || data.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded">
          <p className="text-xs text-slate-400">No data available</p>
        </div>
      );
    }

    if (chart.type === "pie" || chart.type === "donut-pie") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={height * 0.32}
              innerRadius={chart.type === "donut-pie" ? height * 0.2 : 0}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chart.colors[index % chart.colors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === "column") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: any) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Bar dataKey="value" fill={chart.colors[0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === "clustered-bar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: any) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Legend />
            <Bar dataKey="actual" fill={chart.colors[0]} name="Actual" />
            <Bar dataKey="planned" fill={chart.colors[1]} name="Planned" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === "stacked-bar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: any) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Legend />
            <Bar
              dataKey="primary"
              stackId="a"
              fill={chart.colors[0]}
              name="Addressable"
            />
            <Bar
              dataKey="secondary"
              stackId="a"
              fill={chart.colors[1]}
              name="Non-Addressable"
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === "bar-line-combo" || chart.type === "pareto") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: any) =>
                typeof value === "number" ? `${value.toFixed(1)}` : value
              }
            />
            <Legend />
            <Bar dataKey="value" fill={chart.colors[0]} name="Spend" />
            <Line
              type="monotone"
              dataKey={chart.type === "pareto" ? "cumulative" : "percentage"}
              stroke={chart.colors[1]}
              strokeWidth={2}
              name={chart.type === "pareto" ? "Cumulative %" : "Percentage"}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    if (
      chart.type === "scatter" ||
      chart.type === "scatter-line" ||
      chart.type === "scatter-line-markers"
    ) {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="Addressable" />
            <YAxis dataKey="y" name="Audited" />
            <Tooltip
              formatter={(value: any) => `$${(value / 1000000).toFixed(1)}M`}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Legend />
            <RechartsScatter
              name="Media Types"
              data={data}
              fill={chart.colors[0]}
              line={chart.type !== "scatter"}
              lineType={chart.type !== "scatter" ? "joint" : undefined}
              shape={chart.type === "scatter-line" ? undefined : "circle"}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  // Toggle chart selection
  const handleChartClick = (chartId: string) => {
    setSelectedCharts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white border-t border-slate-200 max-w-full overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-slate-900 font-semibold">Chart Visualizations</h3>
        <p className="text-sm text-slate-500 mt-1">
          10 chart types automatically updated based on your selected data
        </p>
      </div>

      {/* Chart Grid - 5 columns × 2 rows */}
      <div className="p-6 overflow-x-auto">
        <div className="grid grid-cols-5 gap-4 min-w-[1000px]">
          {charts.map((chart) => {
            const isSelected = selectedCharts.has(chart.id);
            return (
              <Card
                key={chart.id}
                className={`overflow-hidden transition-all cursor-pointer ${
                  isSelected
                    ? "border-2 border-violet-600 shadow-lg"
                    : "border-slate-200 hover:shadow-lg"
                } relative group`}
                onClick={() => handleChartClick(chart.id)}
              >
                {/* Chart Header */}
                <div
                  className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-violet-600 text-white"
                      : "bg-slate-50 text-slate-900"
                  }`}
                >
                  <h5
                    className={`text-xs font-medium truncate ${
                      isSelected ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {chart.title}
                  </h5>
                  <div className="flex items-center gap-1">
                    {/* Add to PPT Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const chartElement = chartRefs.current.get(chart.id);
                        handleToggleForPPT(
                          `table-${chart.id}`,
                          chart.title,
                          chartElement || undefined
                        );
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center ${
                        isChartInPPT(`table-${chart.id}`)
                          ? "bg-emerald-500 opacity-100"
                          : isSelected
                            ? "hover:bg-violet-700"
                            : "hover:bg-slate-200"
                      }`}
                      title={isChartInPPT(`table-${chart.id}`) ? "Remove from PPT" : "Add to PPT"}
                    >
                      {isChartInPPT(`table-${chart.id}`) ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <FileText
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-white" : "text-slate-600"
                          }`}
                        />
                      )}
                    </button>
                    {/* Expand Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenChart(chart);
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center ${
                        isSelected ? "hover:bg-violet-700" : "hover:bg-slate-200"
                      }`}
                      title="Expand to full screen"
                    >
                      <Maximize2
                        className={`w-4 h-4 ${
                          isSelected ? "text-white" : "text-slate-600"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Chart Content */}
                <div
                  ref={(el) => {
                    chartRefs.current.set(chart.id, el);
                  }}
                  className="p-4 bg-white h-48"
                >
                  {renderChart(chart, 160)}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Chart Modal - positioned within main content area */}
      {fullScreenChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFullScreenChart(null)}
          />

          {/* Modal - constrained to not overlap sidebar */}
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
                {/* Add to PPT Button */}
                <button
                  onClick={() => {
                    const element = fullScreenChartRef.current;
                    handleToggleForPPT(
                      `table-${fullScreenChart.id}`,
                      fullScreenChart.title,
                      element || undefined
                    );
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-medium shadow-sm ${
                    isChartInPPT(`table-${fullScreenChart.id}`)
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200"
                      : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-violet-200"
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
                      <span>Add to PPT Report</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setFullScreenChart(null)}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Slide Number Configuration - visible when included in PPT */}
            {isChartInPPT(`table-${fullScreenChart.id}`) && (
              <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">
                      Target Slide:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={getSlideNumber?.(`table-${fullScreenChart.id}`) || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const num = value ? parseInt(value, 10) : undefined;
                        onUpdateSlideNumber?.(`table-${fullScreenChart.id}`, num);
                      }}
                      placeholder="Auto"
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm bg-white"
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    Leave empty for auto-placement
                  </span>
                </div>
              </div>
            )}

            {/* Modal Content - Chart for PPT capture */}
            <div className="flex-1 p-8 overflow-auto min-h-0 bg-gradient-to-br from-slate-50 to-slate-100/50">
              <div
                ref={fullScreenChartRef}
                className="bg-white rounded-xl p-6 shadow-sm max-w-4xl mx-auto"
              >
                <h4 className="text-lg font-semibold text-slate-800 mb-4">
                  {fullScreenChart.title}
                </h4>
                <div style={{ height: "calc(85vh - 280px)", minHeight: "400px" }}>
                  {renderChart(fullScreenChart, Math.max(400, window.innerHeight - 350))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
