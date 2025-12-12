"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  BarChart3,
  Sparkles,
  Maximize2,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import {
  applyOthersLogic,
  checkDataDensity,
} from "./utils/dataProcessing";
import { DataDensityWarning } from "./DataDensityWarning";
import { GraphModal } from "./GraphModal";
import { DashboardErrorState, DashboardEmptyState } from "./ErrorState";
import {
  fetchSummaryDataFromSelection,
  ConsolidatedSummaryResponse,
  fetchTrackerComplete,
  fetchTrackerSummaryData,
  TrackerCompleteResponse,
  TrackerSummaryItem,
  TrackerMediaType,
  getTrackerMediaTypeFromFields,
} from "@/lib/api/dashboard";

interface VisualizationCanvasProps {
  selectedFields: Record<string, string[]>;
  selectedGraphType: string | null;
  client: string;
  market: string;
  period: string;
  dataSource?: "summary" | "trackers" | "";
  jobId?: string;
  clientId?: number; // For tracker data - auto-resolves to latest job
  trackerMediaType?: TrackerMediaType; // For tracker data - which media type
  selectedGraphsForPPT?: Set<string>;
  onToggleGraphForPPT?: (
    graphId: string,
    graphTitle: string,
    element?: HTMLElement,
  ) => void;
  onUpdateSlideNumber?: (
    graphId: string,
    slideNumber: number | undefined,
  ) => void;
  getSlideNumber?: (graphId: string) => number | undefined;
  registerChartElement?: (graphId: string, element: HTMLElement | null) => void;
}

export function VisualizationCanvas({
  selectedFields,
  selectedGraphType,
  client,
  market,
  period,
  dataSource = "",
  jobId = "",
  clientId,
  trackerMediaType,
  selectedGraphsForPPT = new Set(),
  onToggleGraphForPPT,
  onUpdateSlideNumber,
  getSlideNumber,
  registerChartElement,
}: VisualizationCanvasProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);

  // Ref to hold the current chart container element for PPT capture
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // Ref for capturing only the chart content (excludes buttons/actions for cleaner PPT export)
  const chartOnlyRef = useRef<HTMLDivElement>(null);

  // API data state - supports both consolidated summary and tracker data
  const [apiData, setApiData] = useState<ConsolidatedSummaryResponse | null>(
    null,
  );
  const [trackerData, setTrackerData] =
    useState<TrackerCompleteResponse | null>(null);
  const [trackerSummaryData, setTrackerSummaryData] = useState<
    TrackerSummaryItem[] | null
  >(null);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Generate a unique graph ID based on current state (include jobId or clientId)
  const graphId = `${selectedGraphType}-${client}-${market}-${period}-${jobId || clientId}`;
  const graphTitle = `${client || "Client"} - ${market || "All Markets"} - ${period || "YTD"}${trackerMediaType ? ` (${trackerMediaType.toUpperCase()})` : ""}`;
  const isIncludedInReport = selectedGraphsForPPT.has(graphId);
  const slideNumber = getSlideNumber?.(graphId);

  // Register chart element when included in PPT selection
  useEffect(() => {
    if (isIncludedInReport && chartOnlyRef.current && registerChartElement) {
      registerChartElement(graphId, chartOnlyRef.current);
    }
    return () => {
      // Cleanup when unmounting or when no longer included
      if (registerChartElement) {
        registerChartElement(graphId, null);
      }
    };
  }, [isIncludedInReport, graphId, registerChartElement]);

  // Track when chart container is ready (ref is available)
  useEffect(() => {
    // Small delay to ensure DOM is ready after render
    const timer = setTimeout(() => {
      setIsChartReady(!!chartOnlyRef.current);
    }, 300); // Increased timeout to ensure chart renders
    return () => clearTimeout(timer);
  }, [selectedGraphType, client, market, period, apiData, trackerData, trackerSummaryData, isLoadingApiData]); // Re-check when these change

  // Handle toggle with element ref - uses chartOnlyRef for clean capture without buttons
  const handleToggleForPPT = useCallback(() => {
    console.log("[VisualizationCanvas] handleToggleForPPT called");
    console.log("[VisualizationCanvas] graphId:", graphId);
    console.log("[VisualizationCanvas] isChartReady:", isChartReady);
    console.log(
      "[VisualizationCanvas] chartOnlyRef.current:",
      chartOnlyRef.current,
    );

    // If already included, allow removal without element
    const isCurrentlyIncluded = selectedGraphsForPPT.has(graphId);

    // Double-check if ref is available now (fallback if isChartReady state is stale)
    if (!isCurrentlyIncluded && !chartOnlyRef.current) {
      console.warn("[VisualizationCanvas] Cannot add to PPT - chart not ready");
      return;
    }

    // Update isChartReady if it was false but ref is now available
    if (!isChartReady && chartOnlyRef.current) {
      setIsChartReady(true);
    }

    if (onToggleGraphForPPT) {
      onToggleGraphForPPT(
        graphId,
        graphTitle,
        chartOnlyRef.current || undefined,
      );
    }
  }, [
    graphId,
    graphTitle,
    onToggleGraphForPPT,
    isChartReady,
    selectedGraphsForPPT,
  ]);

  // Fetch data from API when data source is selected and fields change
  useEffect(() => {
    const fetchData = async () => {
      const totalSelected = Object.values(selectedFields).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );

      // Reset data when no fields selected
      if (totalSelected === 0) {
        setApiData(null);
        setTrackerData(null);
        return;
      }

      // Only fetch for Arla client
      if (client !== "Arla") {
        setApiData(null);
        setTrackerData(null);
        return;
      }

      setIsLoadingApiData(true);
      setApiError(null);

      try {
        if (dataSource === "summary" && jobId) {
          // Fetch consolidated summary data
          // market is now a code string like "UK", "DK" instead of an ID
          const response = await fetchSummaryDataFromSelection(
            client,
            jobId,
            selectedFields,
            undefined, // deprecated marketId
            undefined, // mediaType
            market || undefined, // markets parameter (code string)
          );
          setApiData(response);
          setTrackerData(null);
          setTrackerSummaryData(null);
        } else if (dataSource === "trackers" && clientId) {
          // Auto-detect media type from selected fields if not explicitly provided
          const detectedMediaType =
            trackerMediaType || getTrackerMediaTypeFromFields(selectedFields);

          if (!detectedMediaType) {
            console.warn(
              "Could not determine tracker media type from selected fields",
            );
            setApiError(
              "Please select fields from a specific media type (Summary, TV, Radio, Print, etc.)",
            );
            setTrackerData(null);
            setTrackerSummaryData(null);
            setApiData(null);
            setIsLoadingApiData(false);
            return;
          }

          // market is now a code string like "UK", "DK"
          const marketsParam = market || undefined;

          // Handle Summary vs specific media types
          if (detectedMediaType === "summary") {
            // Fetch tracker summary data (aggregated by media type)
            const response = await fetchTrackerSummaryData(
              client,
              clientId,
              undefined, // deprecated marketId
              undefined, // mediaType
              marketsParam, // markets parameter (code string)
            );
            setTrackerSummaryData(response);
            setTrackerData(null);
            setApiData(null);
          } else {
            // Fetch complete tracker data using /tracker/{media}/complete endpoint
            const response = await fetchTrackerComplete(
              client,
              clientId,
              detectedMediaType as TrackerMediaType,
              undefined, // deprecated marketId
              marketsParam, // markets parameter (code string)
            );
            setTrackerData(response);
            setTrackerSummaryData(null);
            setApiData(null);
          }
        } else {
          setApiData(null);
          setTrackerData(null);
          setTrackerSummaryData(null);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setApiError(
          error instanceof Error ? error.message : "Failed to fetch data",
        );
        setApiData(null);
        setTrackerData(null);
        setTrackerSummaryData(null);
      } finally {
        setIsLoadingApiData(false);
      }
    };

    fetchData();
  }, [
    client,
    dataSource,
    jobId,
    clientId,
    trackerMediaType,
    selectedFields,
    market,
  ]);

  const getTotalSelected = () => {
    return Object.values(selectedFields).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
  };

  // Transform API data into chart-compatible format (for consolidated summary)
  const getApiChartData = useMemo(() => {
    if (!apiData || apiData.data.length === 0) return null;

    // Group data by media_type and aggregate
    const mediaAggregates: Record<string, any> = {};

    apiData.data.forEach((row) => {
      const mediaType = row.media_type || "Unknown";

      if (!mediaAggregates[mediaType]) {
        mediaAggregates[mediaType] = {
          name: mediaType,
          market_name: row.market_name,
          market_id: row.market_id,
          year: row.year,
        };

        // Initialize all requested fields to 0
        apiData.requested_fields.forEach((field) => {
          mediaAggregates[mediaType][field] = 0;
        });
      }

      // Sum up the values for each requested field
      apiData.requested_fields.forEach((field) => {
        const value = row[field];
        if (typeof value === "number") {
          mediaAggregates[mediaType][field] += value;
        }
      });
    });

    return Object.values(mediaAggregates).filter((item: any) => {
      // Filter out items where all numeric fields are 0 or null
      return apiData.requested_fields.some((field) => {
        const val = item[field];
        return typeof val === "number" && val !== 0;
      });
    });
  }, [apiData]);

  // Transform tracker data into chart-compatible format
  // TrackerCompleteResponse has { general, monthly, percentile } arrays
  const getTrackerChartData = useMemo(() => {
    if (!trackerData) return null;

    // Get all available data from the complete response
    const generalData = trackerData.general || [];
    const monthlyData = trackerData.monthly || [];
    const percentileData = trackerData.percentile || [];

    // Check if we have any data
    if (
      generalData.length === 0 &&
      monthlyData.length === 0 &&
      percentileData.length === 0
    ) {
      return null;
    }

    // Determine which data level to use based on selected fields
    // For now, prioritize monthly data if available (good for time series), else general
    if (monthlyData.length > 0) {
      // Group by month
      const monthAggregates: Record<string, Record<string, unknown>> = {};

      // Get all numeric fields from first row
      const sampleRow = monthlyData[0] as Record<string, unknown>;
      const numericFields = Object.keys(sampleRow).filter((key) => {
        const val = sampleRow[key];
        return (
          typeof val === "number" &&
          ![
            "id",
            "market_id",
            "tv_data_general_id",
            "print_data_general_id",
            "ooh_data_general_id",
            "radio_data_general_id",
            "online_data_general_id",
            "cinema_data_general_id",
          ].includes(key)
        );
      });

      monthlyData.forEach((row) => {
        const rowData = row as Record<string, unknown>;
        const month = (rowData.month as string) || "Unknown";

        if (!monthAggregates[month]) {
          monthAggregates[month] = { name: month };
          numericFields.forEach((field) => {
            monthAggregates[month][field] = 0;
          });
        }

        numericFields.forEach((field) => {
          const value = rowData[field];
          if (typeof value === "number") {
            (monthAggregates[month][field] as number) += value;
          }
        });
      });

      // Sort by month order
      const monthOrder = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];
      return Object.values(monthAggregates).sort((a, b) => {
        return (
          monthOrder.indexOf(a.name as string) -
          monthOrder.indexOf(b.name as string)
        );
      });
    } else if (generalData.length > 0) {
      // Use general data - each row is a campaign/line item
      // Get all numeric fields from first row
      const sampleRow = generalData[0] as Record<string, unknown>;
      const numericFields = Object.keys(sampleRow).filter((key) => {
        const val = sampleRow[key];
        return (
          typeof val === "number" &&
          !["id", "market_id", "row_index", "extracted_file_id"].includes(key)
        );
      });

      return generalData
        .map((row, index) => {
          const rowData = row as Record<string, unknown>;
          const result: Record<string, unknown> = {
            name: `Row ${index + 1}`,
          };

          // Try to get a better name from buy_specifics
          const buySpecifics = rowData.buy_specifics as Record<
            string,
            unknown
          > | null;
          if (buySpecifics && typeof buySpecifics === "object") {
            const campaign =
              buySpecifics["Campaign Name"] || buySpecifics["campaign_name"];
            if (campaign) {
              result.name = campaign;
            }
          }

          // Copy all numeric fields
          numericFields.forEach((field) => {
            result[field] = rowData[field] || 0;
          });

          return result;
        })
        .filter((item) => {
          // Filter out rows where all numeric fields are 0
          return numericFields.some((field) => {
            const val = item[field];
            return typeof val === "number" && val !== 0;
          });
        });
    }

    return null;
  }, [trackerData]);

  // Transform tracker summary data into chart-compatible format
  // Each row represents a media type with aggregated metrics
  const getTrackerSummaryChartData = useMemo(() => {
    if (!trackerSummaryData || trackerSummaryData.length === 0) return null;

    // Transform each summary row - use media_type as the name
    return trackerSummaryData.map((row) => {
      return {
        name: row.media_type || "Unknown",
        period: row.period,
        total_net_net_spend: row.total_net_net_spend || 0,
        total_non_addressable_spend: row.total_non_addressable_spend || 0,
        total_addressable_spend: row.total_addressable_spend || 0,
        measured_spend: row.measured_spend || 0,
        measured_spend_pct: row.measured_spend_pct || 0,
        benchmark_equivalent_net_net_spend:
          row.benchmark_equivalent_net_net_spend || 0,
        value_loss: row.value_loss || 0,
        value_loss_pct: row.value_loss_pct || 0,
      };
    });
  }, [trackerSummaryData]);

  // Get real Arla data based on data source selection
  // Only returns actual API data, no static fallbacks
  const getArlaData = useMemo(() => {
    if (client !== "Arla") return null;

    // Use API data for summary
    if (
      dataSource === "summary" &&
      getApiChartData &&
      getApiChartData.length > 0
    ) {
      return getApiChartData;
    }

    // Use tracker data for trackers
    if (dataSource === "trackers") {
      // Check for tracker summary data first (when Summary category is selected)
      if (getTrackerSummaryChartData && getTrackerSummaryChartData.length > 0) {
        return getTrackerSummaryChartData;
      }
      // Fall back to media-specific tracker data
      if (getTrackerChartData && getTrackerChartData.length > 0) {
        return getTrackerChartData;
      }
      // No data available - return null (no static fallback)
      return null;
    }

    // No fallback for summary - return null if no API data
    return null;
  }, [
    client,
    dataSource,
    getApiChartData,
    getTrackerChartData,
    getTrackerSummaryChartData,
  ]);

  // Get chart data - only returns real data, no sample/mock data
  const getChartData = () => {
    // For Arla summary data
    if (client === "Arla" && dataSource === "summary") {
      if (getArlaData && getArlaData.length > 0) {
        return getArlaData;
      }
      // Return empty array - no mock data
      return [];
    }

    // For Arla tracker data
    if (client === "Arla" && dataSource === "trackers") {
      if (getArlaData && getArlaData.length > 0) {
        return getArlaData;
      }
      // Return empty array - no mock data
      return [];
    }

    // For non-Arla clients - return empty array (no mock/random data)
    // Real data should be fetched from API when implemented
    return [];
  };

  const rawData = getChartData();

  // Check if we have actual data to display
  const hasData = rawData.length > 0;

  // Determine which data keys to use based on data type
  const isArlaData = client === "Arla" && getArlaData && getArlaData.length > 0;
  const isApiData = apiData && apiData.data.length > 0;
  const isTrackerApiData =
    trackerData &&
    ((trackerData.general && trackerData.general.length > 0) ||
      (trackerData.monthly && trackerData.monthly.length > 0) ||
      (trackerData.percentile && trackerData.percentile.length > 0));

  // Get available fields from tracker complete response
  const trackerAvailableFields = useMemo(() => {
    if (!trackerData) return [];

    // Get fields from general, monthly, or percentile data
    const sampleData =
      trackerData.monthly?.[0] ||
      trackerData.general?.[0] ||
      trackerData.percentile?.[0];
    if (!sampleData) return [];

    // Extract numeric field names
    return Object.keys(sampleData as Record<string, unknown>).filter((key) => {
      const val = (sampleData as Record<string, unknown>)[key];
      return (
        typeof val === "number" &&
        ![
          "id",
          "market_id",
          "row_index",
          "extracted_file_id",
          "tv_data_general_id",
          "print_data_general_id",
          "ooh_data_general_id",
          "radio_data_general_id",
          "online_data_general_id",
          "cinema_data_general_id",
        ].includes(key)
      );
    });
  }, [trackerData]);

  // Get the first field from API response for primary data key (for charts)
  const primaryApiField =
    isApiData && apiData.requested_fields.length > 0
      ? apiData.requested_fields[0]
      : isTrackerApiData && trackerAvailableFields.length > 0
        ? trackerAvailableFields[0]
        : null;

  // Get all requested fields from either API source
  const allApiFields = isApiData
    ? apiData.requested_fields
    : isTrackerApiData
      ? trackerAvailableFields
      : [];

  const dataKeys = {
    spend: primaryApiField || (isArlaData ? "total_net_net_spend" : "spend"),
    savings: allApiFields.includes("savings_value")
      ? "savings_value"
      : allApiFields.includes("fy_total_savings")
        ? "fy_total_savings"
        : allApiFields.includes("fy_savings")
          ? "fy_savings"
          : isArlaData
            ? "savings_value"
            : "savings",
    savingsPct: allApiFields.includes("savings_pct")
      ? "savings_pct"
      : allApiFields.includes("fy_total_savings_pct")
        ? "fy_total_savings_pct"
        : allApiFields.includes("fy_savings_pct")
          ? "fy_savings_pct"
          : isArlaData
            ? "savings_pct"
            : "savingsPct",
    inflationPct: allApiFields.includes("inflation_pct")
      ? "inflation_pct"
      : isArlaData
        ? "inflation_pct"
        : "inflation",
    measuredPct: allApiFields.includes("measured_spend_pct")
      ? "measured_spend_pct"
      : isArlaData
        ? "measured_spend_pct"
        : "measuredPct",
    index: isArlaData ? "index" : "index",
    // All API fields for multi-field charts
    apiFields: allApiFields,
  };

  // Apply data density handling
  const getProcessedData = (chartType: string) => {
    if (!chartType) return rawData;

    const limits: Record<string, number> = {
      "pie-chart": 9,
      "bar-chart": 20,
      "grouped-bar": 15,
      "stacked-bar": 12,
      "line-chart": 25,
      "area-chart": 20,
    };

    const maxItems = limits[chartType];
    if (maxItems && rawData.length > maxItems) {
      return applyOthersLogic(rawData, maxItems, dataKeys.spend);
    }

    return rawData;
  };

  const sampleData = getProcessedData(selectedGraphType || "");

  // Check data density and show warnings
  const densityCheck = selectedGraphType
    ? checkDataDensity(rawData.length, selectedGraphType)
    : { isHigh: false };

  // Filter data if a filter is active
  const filteredData = activeFilter
    ? sampleData.filter((item) => item.name === activeFilter)
    : sampleData;

  const COLORS = [
    "#7C3AED",
    "#8B5CF6",
    "#A78BFA",
    "#C4B5FD",
    "#DDD6FE",
    "#EDE9FE",
  ];

  // Handle clicking on chart elements (cross-filtering)
  const handleChartClick = (dataPoint: any) => {
    if (dataPoint && dataPoint.name) {
      setActiveFilter(activeFilter === dataPoint.name ? null : dataPoint.name);
    }
  };

  // Demo data for chart gallery preview
  const demoData = [
    { name: "TV", spend: 4200, savings: 320 },
    { name: "Digital", spend: 3800, savings: 280 },
    { name: "Radio", spend: 2100, savings: 150 },
    { name: "OOH", spend: 1800, savings: 120 },
    { name: "Print", spend: 1200, savings: 90 },
  ];

  const renderChartGallery = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Available Chart Types
          </h2>
          <p className="text-slate-500">
            Select fields from the Query Builder, then choose a chart type to
            visualize your data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* KPI Cards */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500"></span>
              KPI Cards
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-800">€24.5M</div>
                <div className="text-xs text-slate-500">Total Spend</div>
                <div className="text-xs text-emerald-600">↑ 12.3%</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-800">8.5%</div>
                <div className="text-xs text-slate-500">Savings</div>
                <div className="text-xs text-emerald-600">↑ 0.8pp</div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500"></span>
              Bar Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500"></span>
              Pie Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={demoData}
                  dataKey="spend"
                  cx="50%"
                  cy="50%"
                  outerRadius={50}
                  fill="#EC4899"
                >
                  {demoData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              Line Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={demoData}>
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
              Area Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={demoData}>
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Grouped Bar */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Grouped Bar
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked Bar */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Stacked Bar
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" stackId="a" fill="#7C3AED" />
                <Bar
                  dataKey="savings"
                  stackId="a"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter Plot */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              Scatter Plot
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <ScatterChart>
                <Scatter
                  data={demoData.map((d) => ({ x: d.spend, y: d.savings }))}
                  fill="#F43F5E"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              Data Table
            </h4>
            <div className="text-xs">
              <div className="grid grid-cols-3 gap-1 font-medium text-slate-600 mb-1 pb-1 border-b border-slate-200">
                <span>Media</span>
                <span className="text-right">Spend</span>
                <span className="text-right">Savings</span>
              </div>
              {demoData.slice(0, 3).map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-1 text-slate-800 py-0.5"
                >
                  <span>{row.name}</span>
                  <span className="text-right">
                    €{(row.spend / 1000).toFixed(1)}K
                  </span>
                  <span className="text-right text-emerald-600">
                    €{row.savings}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gauge */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Gauge Chart
            </h4>
            <div className="flex items-center justify-center h-[120px]">
              <div className="relative">
                <svg width="100" height="60" viewBox="0 0 100 60">
                  <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 55 A 40 40 0 0 1 70 20"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <span className="text-lg font-bold text-slate-800">85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap placeholder */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              Heatmap
            </h4>
            <div className="grid grid-cols-5 gap-1 h-[120px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded"
                  style={{
                    backgroundColor: `rgba(124, 58, 237, ${0.2 + Math.random() * 0.8})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
          <p className="text-sm text-violet-800">
            👈 <strong>Step 1:</strong> Select data fields from the Query
            Builder on the left
            <br />👉 <strong>Step 2:</strong> Choose a chart type from the Graph
            Options on the right
          </p>
        </div>
      </div>
    );
  };

  const renderVisualization = () => {
    // Show loading state when fetching API data (for both summary and trackers)
    if (
      isLoadingApiData &&
      (dataSource === "summary" || dataSource === "trackers") &&
      client === "Arla"
    ) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Loading data...
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Fetching{" "}
            {dataSource === "trackers" ? "tracker" : "consolidated summary"}{" "}
            data from the server
          </p>
        </div>
      );
    }

    // Show error state if API call failed (for both summary and trackers)
    if (
      apiError &&
      (dataSource === "summary" || dataSource === "trackers") &&
      client === "Arla" &&
      getTotalSelected() > 0
    ) {
      return (
        <DashboardErrorState
          error={new Error(apiError)}
          title="Failed to load data"
          description={
            dataSource === "trackers"
              ? "Could not fetch tracker data. Please ensure you have selected a valid media type."
              : "Make sure a consolidation job is selected and try again."
          }
        />
      );
    }

    // Show "no data" state when fields are selected but no data returned (for both summary and trackers)
    if (
      client === "Arla" &&
      (dataSource === "summary" || dataSource === "trackers") &&
      getTotalSelected() > 0 &&
      !hasData &&
      !isLoadingApiData
    ) {
      return (
        <DashboardEmptyState
          title="No data available"
          description={
            dataSource === "trackers"
              ? "The selected fields returned no tracker data. Try selecting different fields or media type."
              : "The selected fields returned no data for this consolidation job. Try selecting different fields or ensure the job has been populated."
          }
        />
      );
    }

    // Show message if trackers is selected but no market
    if (dataSource === 'trackers' && !market) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 mb-5">
            <BarChart3 className="w-14 h-14 text-amber-600" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-800 mb-3">
            Select a Market
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Trackers data requires a specific market to be selected. Please choose a market from the top bar to continue.
          </p>
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-amber-700 font-medium">
              Market selection required for Trackers data
            </span>
          </div>
        </div>
      );
    }

    // Show welcome/empty state if no client or data source selected
    if (!client || !dataSource) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-5">
            <BarChart3 className="w-14 h-14 text-slate-400" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-800 mb-3">
            Welcome to Dashboard
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Get started by selecting a client and data source from the top bar
            to visualize your media spend data.
          </p>
          <div className="flex flex-col gap-3 text-left bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <span className="text-sm text-slate-700">
                Select a <strong>Client</strong> from the dropdown
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <span className="text-sm text-slate-700">
                Choose a <strong>Data Source</strong> (Summary or Trackers)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <span className="text-sm text-slate-700">
                Select <strong>Fields</strong> from the Query Builder
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">
                4
              </div>
              <span className="text-sm text-slate-700">
                Choose a <strong>Graph Type</strong> to visualize
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Show message if no graph type selected and no fields selected
    if (!selectedGraphType && getTotalSelected() === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <Sparkles className="w-12 h-12 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Select Fields to Begin
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Use the <strong>Query Builder</strong> on the left to select the
            data fields you want to visualize, then choose a graph type from the{" "}
            <strong>Graph Options</strong> panel on the right.
          </p>
        </div>
      );
    }

    // Show message if fields are selected but no graph type chosen
    if (!selectedGraphType && getTotalSelected() > 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <BarChart3 className="w-12 h-12 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Select a graph type
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            You have selected {getTotalSelected()} field(s). Choose a
            visualization from the Graph Options panel on the right.
          </p>
        </div>
      );
    }

    const graphTitle = `${client || "Client"} - ${market || "All Markets"} - ${period || "YTD"}`;

    // Calculate KPI values from real data with proper fallbacks
    const calculateKPIs = () => {
      if (!sampleData || sampleData.length === 0) {
        return {
          totalSpend: 0,
          totalSavings: 0,
          savingsPct: 0,
          inflationPct: 0,
          avgIndex: 100,
        };
      }

      // Helper to get value with multiple fallback keys
      const getValue = (item: any, ...keys: string[]) => {
        for (const key of keys) {
          if (
            item[key] !== undefined &&
            item[key] !== null &&
            !isNaN(item[key])
          ) {
            return Number(item[key]);
          }
        }
        return 0;
      };

      const totalSpend = sampleData.reduce(
        (sum, item) =>
          sum + getValue(item, dataKeys.spend, "total_net_net_spend", "spend"),
        0,
      );
      const totalSavings = sampleData.reduce(
        (sum, item) =>
          sum + getValue(item, dataKeys.savings, "savings_value", "savings"),
        0,
      );
      const avgSavingsPct =
        sampleData.reduce(
          (sum, item) =>
            sum +
            getValue(item, dataKeys.savingsPct, "savings_pct", "savingsPct"),
          0,
        ) / sampleData.length;
      const avgInflationPct =
        sampleData.reduce(
          (sum, item) =>
            sum +
            getValue(item, dataKeys.inflationPct, "inflation_pct", "inflation"),
          0,
        ) / sampleData.length;
      const avgIndex =
        sampleData.reduce(
          (sum, item) => sum + getValue(item, "index", dataKeys.index),
          0,
        ) / sampleData.length || 100;

      return {
        totalSpend,
        totalSavings,
        savingsPct: isNaN(avgSavingsPct) ? 0 : avgSavingsPct,
        inflationPct: isNaN(avgInflationPct) ? 0 : avgInflationPct,
        avgIndex: isNaN(avgIndex) ? 100 : avgIndex,
      };
    };

    const kpis = calculateKPIs();

    // PPT Button component to avoid duplication
    const PPTButton = () => (
      <button
        onClick={handleToggleForPPT}
        disabled={!isChartReady && !isIncludedInReport}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isIncludedInReport
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm"
          : !isChartReady
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        title={
          isIncludedInReport
            ? "Remove from PPT"
            : !isChartReady
              ? "Chart loading..."
              : "Add to PPT Report"
        }
      >
        {isIncludedInReport ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        {isIncludedInReport ? "In PPT" : "Add to PPT"}
      </button>
    );

    switch (selectedGraphType) {
      case "pie-chart":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture - includes title and chart only */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Click on any slice to filter and see details below
              </p>
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={sampleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: €${(Number(value) / 1000).toFixed(0)}K`
                    }
                    outerRadius={140}
                    fill="#8884d8"
                    dataKey={dataKeys.spend}
                    onClick={handleChartClick}
                    style={{ cursor: "pointer" }}
                  >
                    {sampleData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === activeFilter
                            ? "#F59E0B"
                            : COLORS[index % COLORS.length]
                        }
                        opacity={
                          activeFilter && entry.name !== activeFilter ? 0.3 : 1
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "donut-chart":
        const totalValue = sampleData.reduce(
          (sum, item) => sum + (item[dataKeys.spend] || 0),
          0,
        );
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Click on any slice to filter and see details below
              </p>
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={sampleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: €${(Number(value) / 1000).toFixed(0)}K`
                    }
                    outerRadius={140}
                    innerRadius={90}
                    fill="#8884d8"
                    dataKey={dataKeys.spend}
                    onClick={handleChartClick}
                    style={{ cursor: "pointer" }}
                  >
                    {sampleData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === activeFilter
                            ? "#F59E0B"
                            : COLORS[index % COLORS.length]
                        }
                        opacity={
                          activeFilter && entry.name !== activeFilter ? 0.3 : 1
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-2xl font-bold fill-slate-800"
                  >
                    €{(totalValue / 1000).toFixed(0)}K
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "horizontal-bar":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Click on any bar to filter and see details below
              </p>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  layout="vertical"
                  onClick={(e: any) =>
                    e &&
                    e.activePayload &&
                    handleChartClick(e.activePayload[0].payload)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar
                    dataKey={dataKeys.spend}
                    fill="#0891B2"
                    radius={[0, 8, 8, 0]}
                    name="Spend (€)"
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "combo-chart":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar
                    dataKey={dataKeys.spend}
                    fill="#7C3AED"
                    radius={[8, 8, 0, 0]}
                    name="Total Spend"
                  />
                  <Line
                    type="monotone"
                    dataKey={dataKeys.savings}
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Savings Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "bar-chart":
        const hasIndexData = sampleData.some(
          (item) => item.index !== undefined,
        );
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Click on any bar to filter and see details below
              </p>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  onClick={(e: any) =>
                    e &&
                    e.activePayload &&
                    handleChartClick(e.activePayload[0].payload)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {hasIndexData && (
                    <ReferenceLine
                      y={100}
                      stroke="#EF4444"
                      strokeDasharray="3 3"
                      label={{
                        value: "Benchmark: 100",
                        position: "right",
                        fill: "#EF4444",
                        fontSize: 12,
                      }}
                    />
                  )}
                  <Bar
                    dataKey={dataKeys.spend}
                    fill="#7C3AED"
                    radius={[8, 8, 0, 0]}
                    name="Spend (€)"
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "grouped-bar":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar
                    dataKey={dataKeys.spend}
                    fill="#7C3AED"
                    radius={[8, 8, 0, 0]}
                    name="Total Spend"
                  />
                  <Bar
                    dataKey={dataKeys.savings}
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                    name="Savings Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "stacked-bar":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar
                    dataKey={dataKeys.spend}
                    stackId="a"
                    fill="#7C3AED"
                    radius={[0, 0, 0, 0]}
                    name="Total Spend"
                  />
                  <Bar
                    dataKey={dataKeys.savings}
                    stackId="a"
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                    name="Savings Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "line-chart":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={dataKeys.spend}
                    stroke="#7C3AED"
                    strokeWidth={2}
                    name="Total Spend"
                  />
                  <Line
                    type="monotone"
                    dataKey={dataKeys.savings}
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Savings Value"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "area-chart":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <AreaChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `€${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey={dataKeys.spend}
                    stackId="1"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.6}
                    name="Total Spend"
                  />
                  <Area
                    type="monotone"
                    dataKey={dataKeys.savings}
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="Savings Value"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "scatter":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {graphTitle}
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    dataKey={dataKeys.spend}
                    name="Spend"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    type="number"
                    dataKey={dataKeys.savings}
                    name="Savings"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: number, name: string) => [
                      `€${value.toLocaleString()}`,
                      name,
                    ]}
                  />
                  <Scatter name="Media" data={sampleData} fill="#7C3AED" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "table":
        return (
          <div
            ref={chartContainerRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden relative"
          >
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">
                  {graphTitle}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">
                        Dimension
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">
                        Spend (€K)
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">
                        Savings (€K)
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">
                        Savings %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-100 hover:bg-slate-50/50"
                      >
                        <td className="px-6 py-4 text-slate-800">{row.name}</td>
                        <td className="px-6 py-4 text-right text-slate-800">
                          €{Math.round(row.spend).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-800">
                          €{Math.round(row.savings || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                            {(row.savingsPct || 6.5).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <BarChart3 className="w-16 h-16 text-slate-300" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-8 bg-gradient-to-br from-slate-50 to-slate-100/80 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Active Filter Indicator */}
        {activeFilter && (
          <div className="mb-4 flex items-center gap-3">
            <div className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center gap-2 shadow-sm">
              <span className="text-sm">Filtered by: {activeFilter}</span>
              <button
                onClick={() => setActiveFilter(null)}
                className="ml-2 hover:bg-white/20 rounded p-1"
              >
                <span className="text-xs">✕</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Density Warning */}
        {densityCheck.isHigh && densityCheck.message && (
          <DataDensityWarning
            message={densityCheck.message}
            severity={densityCheck.suggestedChart ? "warning" : "info"}
            suggestedChart={densityCheck.suggestedChart}
            onSwitchChart={() => {
              // Auto-switching removed
            }}
          />
        )}

        {renderVisualization()}

        {/* Cross-filtering Detail Table */}
        {activeFilter && selectedGraphType !== "table" && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Detailed View: {activeFilter}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Click the filter badge above to clear and see all data
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">
                      Metric
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">
                      Value
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">
                      vs Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-6 py-4 text-slate-800">Spend</td>
                      <td className="px-6 py-4 text-right text-slate-800">
                        €{Math.round(item.spend).toLocaleString()}K
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-emerald-600">+12%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Graph Modal - Expanded View with Include in PPT Button */}
        <GraphModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          graphId={graphId}
          title={graphTitle}
          isIncluded={isIncludedInReport}
          onToggleInclude={() => onToggleGraphForPPT?.(graphId, graphTitle)}
          slideNumber={slideNumber}
          onUpdateSlideNumber={(num) => onUpdateSlideNumber?.(graphId, num)}
        >
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 shadow-sm">
            {renderVisualization()}
          </div>
        </GraphModal>
      </div>
    </div>
  );
}
