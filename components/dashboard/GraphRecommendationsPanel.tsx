"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Activity,
  Table2,
  Grid3x3,
  TrendingUp,
  Layers,
  AlertCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  isChartCompatible,
  getRecommendedCharts,
  analyzeSelectedFields,
} from "./utils/dataProcessing";

interface GraphRecommendationsPanelProps {
  selectedFields: Record<string, string[]>;
  onSelectGraph: (graphType: string) => void;
  selectedGraphType: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GraphRecommendationsPanel({
  selectedFields,
  onSelectGraph,
  selectedGraphType,
  isOpen = false,
  onOpenChange,
}: GraphRecommendationsPanelProps) {
  const [hoveredGraph, setHoveredGraph] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(isOpen);

  // Use controlled or uncontrolled mode
  const isPanelOpen = onOpenChange ? isOpen : internalOpen;
  const setIsPanelOpen = onOpenChange || setInternalOpen;

  // Auto-open panel when fields are selected (first time)
  const hasSelectedFields = Object.values(selectedFields).some(
    (arr) => arr.length > 0,
  );

  useEffect(() => {
    // Auto-open when fields are first selected
    if (hasSelectedFields && !isPanelOpen) {
      setIsPanelOpen(true);
    }
  }, [hasSelectedFields]);

  const graphTypes = [
    {
      id: "pie-chart",
      name: "Pie Chart",
      icon: PieIcon,
      color: "#EC4899",
      description: "Part-to-whole comparison",
      supportedFields: ["1 dimension + 1 metric (Media × Spend)"],
      tooltip:
        "Best for showing composition or market share. Works well with 3-7 categories. Not suitable for time-series data.",
    },
    {
      id: "donut-chart",
      name: "Donut Chart",
      icon: PieIcon,
      color: "#A855F7",
      description: "Part-to-whole with center label",
      supportedFields: ["1 dimension + 1 metric"],
      tooltip:
        "Similar to pie chart but with a hollow center, perfect for showing totals or percentages in the middle.",
    },
    {
      id: "bar-chart",
      name: "Bar Chart",
      icon: BarChart3,
      color: "#004D9F",
      description: "Compare values across categories",
      supportedFields: ["1 dimension + 1 metric"],
      tooltip:
        "Compare values across different categories like markets, media types, or suppliers. Easy to read and versatile.",
    },
    {
      id: "horizontal-bar",
      name: "Horizontal Bar",
      icon: BarChart3,
      color: "#0891B2",
      description: "Rankings and long labels",
      supportedFields: ["1 dimension + 1 metric"],
      tooltip:
        "Perfect for ranking data or when category names are long. Makes comparing values easier with horizontal orientation.",
    },
    {
      id: "grouped-bar",
      name: "Grouped Bar",
      icon: Grid3x3,
      color: "#F59E0B",
      description: "Compare multiple metrics",
      supportedFields: ["1 dimension + 2+ metrics (same scale)"],
      tooltip:
        "Compare 2-3 metrics side by side (e.g., Spend vs Savings vs Budget). Works best when metrics have the same scale.",
    },
    {
      id: "dual-axis-bar",
      name: "Dual-Axis Bar",
      icon: BarChart3,
      color: "#7C3AED",
      description: "Compare different scales",
      supportedFields: ["Percentage + Absolute value metrics"],
      tooltip:
        "Perfect for comparing metrics with different scales (e.g., Spend in millions vs Savings %). Uses two Y-axes for accurate comparison.",
    },
    {
      id: "stacked-bar",
      name: "Stacked Bar",
      icon: Layers,
      color: "#10B981",
      description: "Show composition over categories",
      supportedFields: ["2 dimensions + 1 metric"],
      tooltip:
        "Show how totals break down into subcategories. Perfect for analyzing spend composition across markets.",
    },
    {
      id: "combo-chart",
      name: "Combo Chart",
      icon: TrendingUp,
      color: "#8B5CF6",
      description: "Bar + Line combination",
      supportedFields: ["1 dimension + 2+ metrics"],
      tooltip:
        "Combine bars and lines to show different metrics together. Great for comparing actuals (bars) vs targets (line).",
    },
    {
      id: "line-chart",
      name: "Line Chart",
      icon: LineIcon,
      color: "#06B6D4",
      description: "Trend over time",
      supportedFields: ["Time dimension + 1+ metrics"],
      tooltip:
        "Track changes over time. Essential for trend analysis, forecasting, and identifying patterns.",
    },
    {
      id: "area-chart",
      name: "Area Chart",
      icon: TrendingUp,
      color: "#6366F1",
      description: "Stacked trend over time",
      supportedFields: ["Time + 2 dimensions + metric"],
      tooltip:
        "Show cumulative trends over time. Great for visualizing how different segments contribute to total over time.",
    },
    {
      id: "scatter",
      name: "Scatter",
      icon: Activity,
      color: "#EF4444",
      description: "Correlation between 2 metrics",
      supportedFields: ["2 metrics (CPU vs Benchmark)"],
      tooltip:
        "Use this to see if high Spend correlates with high CPU Index. Identify outliers and relationships between metrics.",
    },
    {
      id: "table",
      name: "Table",
      icon: Table2,
      color: "#64748B",
      description: "Detailed data view",
      supportedFields: ["Any combination of fields"],
      tooltip:
        "View raw data with formatting. Best for detailed analysis, exporting, or when data density is too high for charts.",
    },
  ];

  const getTotalSelected = () => {
    return Object.values(selectedFields).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
  };

  // Use the smart recommendation function
  const recommendedGraphIds = getRecommendedCharts(selectedFields);
  const fieldAnalysis = analyzeSelectedFields(selectedFields);

  // Sort graph types by compatibility score
  const sortedGraphTypes = [...graphTypes].sort((a, b) => {
    const scoreA = isChartCompatible(a.id, selectedFields).score || 0;
    const scoreB = isChartCompatible(b.id, selectedFields).score || 0;
    return scoreB - scoreA;
  });

  // If no fields selected and panel is not open, don't render
  if (!hasSelectedFields && !isPanelOpen) {
    return null;
  }

  // Collapsed state - show toggle button
  if (!isPanelOpen) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border-l border-slate-200/60 h-full p-2 flex flex-col items-center">
        <button
          onClick={() => setIsPanelOpen(true)}
          className="p-3 hover:bg-slate-100 rounded-xl transition-colors group"
          title="Open Visualizations Panel"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 group-hover:text-violet-600 transition-colors" />
        </button>
        <div className="mt-4 writing-mode-vertical flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-600" />
          <span className="text-xs font-medium text-slate-600 [writing-mode:vertical-lr] rotate-180">
            Visualizations
          </span>
        </div>
        {hasSelectedFields && (
          <div className="mt-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
            {recommendedGraphIds.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-gradient-to-b from-white to-slate-50/50 border-l border-slate-200/60 h-full overflow-y-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              Visualizations
            </h3>
          </div>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors group"
            title="Close Panel"
          >
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {getTotalSelected() > 0
            ? `${recommendedGraphIds.length} recommended`
            : "Select fields first"}
        </p>
      </div>

      {/* Scale Warning Banner */}
      {fieldAnalysis.hasMixedScales && fieldAnalysis.scaleWarning && (
        <div className="mx-3 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-800">
                Mixed Scale Warning
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                You selected both percentages and absolute values. Use{" "}
                <strong>Dual-Axis Bar</strong> or <strong>Table</strong> for
                accurate comparison.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 space-y-2">
        {sortedGraphTypes.map((graph) => {
          const isRecommended = recommendedGraphIds.includes(graph.id);
          const compatibility = isChartCompatible(graph.id, selectedFields);
          const isDisabled = !compatibility.compatible;
          const score = compatibility.score || 0;

          return (
            <div key={graph.id} className="relative group">
              <button
                onClick={() => !isDisabled && onSelectGraph(graph.id)}
                disabled={isDisabled}
                onMouseEnter={() => setHoveredGraph(graph.id)}
                onMouseLeave={() => setHoveredGraph(null)}
                className={`
                  w-full p-3 rounded-xl border text-left transition-all relative
                  ${
                    selectedGraphType === graph.id
                      ? "border-violet-400 bg-gradient-to-r from-violet-50 to-purple-50 shadow-md shadow-violet-100"
                      : isDisabled
                        ? "border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed"
                        : "border-slate-200/60 hover:border-violet-300 hover:shadow-md bg-white cursor-pointer"
                  }
                `}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${graph.color}20, ${graph.color}10)`,
                    }}
                  >
                    <graph.icon
                      className="w-4 h-4"
                      style={{ color: graph.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-sm font-medium text-slate-800">
                        {graph.name}
                      </h4>
                      {isRecommended && score >= 80 && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-medium rounded-full flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Best
                        </span>
                      )}
                      {isRecommended && score >= 60 && score < 80 && (
                        <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-medium rounded-full">
                          Good
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {graph.description}
                    </p>
                    {/* Score indicator */}
                    {!isDisabled && getTotalSelected() > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${score}%`,
                              background:
                                score >= 80
                                  ? "linear-gradient(90deg, #10B981, #14B8A6)"
                                  : score >= 60
                                    ? "linear-gradient(90deg, #3B82F6, #6366F1)"
                                    : "linear-gradient(90deg, #F59E0B, #F97316)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {score}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Tooltip on hover - positioned to the left */}
              {hoveredGraph === graph.id && (
                <div className="absolute right-full mr-2 top-0 z-20 w-56 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-700">
                  <p className="leading-relaxed">{graph.tooltip}</p>
                  {isDisabled && compatibility.reason && (
                    <div className="mt-2 pt-2 border-t border-slate-700 text-rose-300 text-[11px]">
                      ⚠️ {compatibility.reason}
                    </div>
                  )}
                  {!isDisabled && compatibility.reason && (
                    <div className="mt-2 pt-2 border-t border-slate-700 text-amber-300 text-[11px]">
                      💡 {compatibility.reason}
                    </div>
                  )}
                  {!isDisabled && compatibility.scaleWarning && (
                    <div className="mt-2 pt-2 border-t border-slate-700 text-amber-300 text-[11px]">
                      ⚖️ {compatibility.scaleWarning}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
