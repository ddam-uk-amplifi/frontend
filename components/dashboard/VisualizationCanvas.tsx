"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  BarChart3,
  Sparkles,
  Maximize2,
  FileText,
  Check,
  Loader2,
  Eye,
  EyeOff,
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
  ReferenceLine,
} from "recharts";
import { applyOthersLogic, checkDataDensity } from "./utils/dataProcessing";
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
  TrackerFieldDataResponse,
  getTrackerMediaTypeFromFields,
  fetchKeringBrandSummary,
  mapKeringFieldsToBackend,
  fetchKeringAllBrandSummary,
  fetchKeringConsolidatedBrandSummary, // Keeping for future use if brand filtering is enabled
  type KeringBrandSummaryResponse,
  type KeringAllBrandSummaryItem,
  // Carlsberg consolidated endpoints
  fetchCarlsbergConsolidatedOverview,
  fetchCarlsbergConsolidatedMEU,
  type CarlsbergConsolidatedOverviewResponse,
  type CarlsbergConsolidatedMEUResponse,
} from "@/lib/api/dashboard";

// Field name to readable label mapping
const FIELD_LABELS: Record<string, string> = {
  // Summary fields
  total_net_net_spend: "Net Net Spend",
  savings_value: "Savings Value",
  savings_pct: "Savings %",
  fy_total_savings: "FY Total Savings",
  fy_total_savings_pct: "FY Total Savings %",
  fy_savings: "FY Savings",
  fy_savings_pct: "FY Savings %",
  inflation_pct: "Inflation %",
  measured_spend_pct: "Measured %",
  total_addressable_spend: "Addressable Spend",
  total_non_addressable_spend: "Non-Addressable Spend",
  measured_spend: "Measured Spend",
  benchmark_equivalent_net_net_spend: "Benchmark Spend",
  value_loss: "Value Loss",
  value_loss_pct: "Value Loss %",
  spend: "Spend",
  savings: "Savings",
  // Tracker summary specific fields (from Summary_YTD sheets)
  total_addressable_net_net_spend: "Total Addressable Spend",
  total_net_net_measured: "Measured Spend",
  // Kering consolidated summary fields
  total_spend: "Total Spend",
  addressable_spend: "Addressable Spend",
  measured_savings: "Measured Savings",
  measured_savings_pct: "Measured Savings %",
  added_value: "Added Value",
  added_value_pct: "Added Value %",
  // Carlsberg tracker fields
  measured_net_net_spend: "Measured Spend",
  non_measured_net_net_spend: "Non-Measured Spend",
  net_net_cpu: "Net Net CPU",
  cpu_index: "CPU Index",
  actual_units: "Actual Units",
  // Carlsberg overview fields
  fy_actual_media_expenditure: "FY Actual Media Expenditure",
  fy_yoy_comparable_media_expenditure: "FY YoY Comparable",
  fy_measured_spend_pct: "FY Measured %",
  fy_savings_delivery: "FY Savings Delivery",
  fy_value_achievement: "FY Value Achievement %",
  ytd_total_ytd_media_expenditure: "YTD Media Expenditure",
  ytd_affectable_spend: "YTD Affectable Spend",
  ytd_yoy_comparable_media_expenditure: "YTD YoY Comparable",
  ytd_measured_spend_pct: "YTD Measured %",
  ytd_savings_delivery_vs_adjusted_pitch_grid_for_inflation: "YTD Savings Delivery",
  ytd_value_achievement: "YTD Value Achievement %",
  inflation_media_inflation_pct: "Media Inflation %",
  inflation_cost_avoidance_ytd: "Cost Avoidance YTD",
  inflation_cost_avoidance_fy: "Cost Avoidance FY",
  // Carlsberg MEU fields
  total_spend_budgeted: "Total Spend Budgeted",
  fy_total_cost_avoidance: "FY Cost Avoidance",
  fy_total_cost_avoidance_pct: "FY Cost Avoidance %",
  fy_projected_spend: "FY Projected Spend",
  fy_projected_measured_spend: "FY Projected Measured Spend",
  measured_vs_affectable_media_spend_pct: "Measured vs Affectable %",
  fy_projected_savings_delivery: "FY Projected Savings",
  fy_projected_value_achievement_pct: "FY Value Achievement %",
  h1_total_spend: "H1 Total Spend",
  h1_savings_delivery: "H1 Savings Delivery",
  h1_value_achievement_pct: "H1 Value Achievement %",
};

// Get readable label for a field name
const getFieldLabel = (fieldName: string): string => {
  if (FIELD_LABELS[fieldName]) return FIELD_LABELS[fieldName];
  // Convert snake_case to Title Case
  return fieldName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Check if a field is a percentage field
const isPercentageField = (fieldName: string): boolean => {
  const lowerName = fieldName.toLowerCase();
  return (
    lowerName.includes("pct") ||
    lowerName.includes("percent") ||
    lowerName.includes("%")
  );
};

// Format value based on field type (percentage vs currency)
const formatValue = (value: any, fieldName: string): string => {
  if (value === null || value === undefined || value === 0) return "";
  if (isPercentageField(fieldName)) {
    return `${Number(value).toFixed(1)}%`;
  }
  // Currency formatting
  if (Math.abs(value) >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return `€${Number(value).toFixed(0)}`;
};

// Color palette for multiple fields
const CHART_COLORS = [
  "#7C3AED", // violet
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#3B82F6", // blue
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#8B5CF6", // purple
  "#14B8A6", // teal
  "#F97316", // orange
];

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
    chartData?: Array<{ name: string; [key: string]: any }>,
    dataKeys?: string[],
  ) => void;
  onUpdateSlideNumber?: (
    graphId: string,
    slideNumber: number | undefined,
  ) => void;
  getSlideNumber?: (graphId: string) => number | undefined;
  registerChartElement?: (graphId: string, element: HTMLElement | null) => void;
  // Dynamic tracker field data (from /tracker/{media}/data endpoint)
  dynamicTrackerData?: TrackerFieldDataResponse | null;
  isLoadingDynamicData?: boolean;
  dynamicDataError?: string | null;
  // Callback to expose chart data for smart recommendations
  onChartDataChange?: (data: any[]) => void;
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
  dynamicTrackerData,
  isLoadingDynamicData = false,
  dynamicDataError,
  onChartDataChange,
}: VisualizationCanvasProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const [showDataLabels, setShowDataLabels] = useState(true); // Toggle for data labels

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
  const [keringBrandData, setKeringBrandData] =
    useState<KeringBrandSummaryResponse | null>(null);
  // Carlsberg consolidated data state
  const [carlsbergOverviewData, setCarlsbergOverviewData] =
    useState<CarlsbergConsolidatedOverviewResponse | null>(null);
  const [carlsbergMEUData, setCarlsbergMEUData] =
    useState<CarlsbergConsolidatedMEUResponse | null>(null);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Check if this is Kering client
  const isKering = client?.toLowerCase() === "kering";
  // Check if this is Carlsberg client
  const isCarlsberg = client?.toLowerCase() === "carlsberg";

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
  }, [
    selectedGraphType,
    client,
    market,
    period,
    apiData,
    trackerData,
    trackerSummaryData,
    keringBrandData,
    carlsbergOverviewData,
    carlsbergMEUData,
    isLoadingApiData,
  ]); // Re-check when these change

  // Handle toggle with element ref - uses chartOnlyRef for clean capture without buttons
  const handleToggleForPPT = useCallback(() => {
    console.log("[VisualizationCanvas] handleToggleForPPT called");
    console.log("[VisualizationCanvas] graphId:", graphId);
    console.log("[VisualizationCanvas] isModalOpen:", isModalOpen);
    console.log(
      "[VisualizationCanvas] chartOnlyRef.current:",
      chartOnlyRef.current,
    );

    // If already included, allow removal without element
    const isCurrentlyIncluded = selectedGraphsForPPT.has(graphId);

    if (isCurrentlyIncluded) {
      // Removing from PPT - no element needed
      if (onToggleGraphForPPT) {
        onToggleGraphForPPT(graphId, graphTitle, undefined);
      }
      return;
    }

    // Adding to PPT - need element
    // Use a delay to ensure the portal content is fully rendered
    setTimeout(() => {
      if (chartOnlyRef.current) {
        if (onToggleGraphForPPT) {
          onToggleGraphForPPT(graphId, graphTitle, chartOnlyRef.current);
        }
      } else {
        console.warn(
          "[VisualizationCanvas] Cannot add to PPT - chart element not found",
        );
      }
    }, 100);
  }, [
    graphId,
    graphTitle,
    onToggleGraphForPPT,
    isModalOpen,
    selectedGraphsForPPT,
  ]);

  // Check if we're using dynamic tracker fields (selected via the new /fields endpoint)
  // Dynamic fields have group IDs like "arla-tracker-tv-dynamic"
  const hasDynamicTrackerFields = useMemo(() => {
    return Object.keys(selectedFields).some(
      (groupId) =>
        groupId.includes("-dynamic") && selectedFields[groupId].length > 0,
    );
  }, [selectedFields]);

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
        setCarlsbergOverviewData(null);
        setCarlsbergMEUData(null);
        return;
      }

      // Skip fetching via old endpoints if we're using dynamic tracker fields
      // The data is already fetched via the /tracker/{media}/data endpoint in the parent component
      if (dataSource === "trackers" && hasDynamicTrackerFields) {
        console.log(
          "[VisualizationCanvas] Using dynamic tracker data, skipping /complete fetch",
        );
        setTrackerData(null);
        setTrackerSummaryData(null);
        setApiData(null);
        setCarlsbergOverviewData(null);
        setCarlsbergMEUData(null);
        return;
      }

      setIsLoadingApiData(true);
      setApiError(null);

      try {
        if (dataSource === "summary" && (jobId || (isKering && clientId) || (isCarlsberg && clientId))) {
          if (isCarlsberg && clientId) {
            // Carlsberg Summary data source - calls Overview and/or MEU endpoints
            // Determine which endpoints to call based on selected fields
            const allSelectedFieldIds = Object.values(selectedFields).flat();

            const hasOverviewFields = allSelectedFieldIds.some((f) =>
              f.startsWith("carlsberg-overview-")
            );
            const hasMEUFields = allSelectedFieldIds.some((f) =>
              f.startsWith("carlsberg-meu-")
            );

            // Fetch data from appropriate endpoints
            let overviewResponse: CarlsbergConsolidatedOverviewResponse | null = null;
            let meuResponse: CarlsbergConsolidatedMEUResponse | null = null;

            if (hasOverviewFields) {
              overviewResponse = await fetchCarlsbergConsolidatedOverview(
                clientId,
                market || undefined,
              );
            }

            if (hasMEUFields) {
              meuResponse = await fetchCarlsbergConsolidatedMEU(
                clientId,
                market || undefined,
              );
            }

            setCarlsbergOverviewData(overviewResponse);
            setCarlsbergMEUData(meuResponse);
            setApiData(null);
            setTrackerData(null);
            setTrackerSummaryData(null);
            setKeringBrandData(null);
          } else if (isKering && clientId) {
            // Kering Summary Excel data source
            // Determine if a specific brand is selected
            // Typically brand selection comes from the "dataset" dropdown in Kering context
            // field ID format: kering-consolidated-brand-summary-{brand}-...
            // OR if generic summary, check if specific brand is in context

            // For now, based on user request:
            // "Summary Excel" -> "All Brand Summary" (aggregates) OR "Consolidated Brand Summary" (per brand)
            // If "All Brands" selected (or no brand filter), use fetchKeringAllBrandSummary
            // If specific brand selected, use fetchKeringConsolidatedBrandSummary

            // We need to know if a specific brand is selected.
            // In DataTableView, this was done via `selectedBrand`
            // Here, we might need to rely on `selectedFields` or a prop.
            // Assuming for now "Summary" means Detailed/AllBrand unless we can detect a brand.

            // Actually, based on DataTableView logic:
            // If specific brand selected -> fetchKeringConsolidatedBrandSummary
            // If "All" selected -> fetchKeringAllBrandSummary (Detailed Summary)

            // IMPORTANT: VisualizationCanvas doesn't have explicit `selectedBrand` prop seen in previous view.
            // But let's assume if the user selects fields from "Consolidated Brand Summary", we treat it as such.

            // Map fields first
            // Extract backend field names from selected fields
            let keringFields = mapKeringFieldsToBackend(selectedFields);

            // Kering Consolidated Summary endpoint does not support inflation fields
            // Filter them out to prevent rendering issues
            keringFields = keringFields.filter((f) => !f.includes("inflation"));

            // If no metric fields were selected (e.g., user only selected a brand),
            // default to all available metrics for the brand-summary endpoint
            if (keringFields.length === 0) {
              keringFields = [
                "total_spend",
                "addressable_spend",
                "measured_spend",
                "measured_spend_pct",
                "measured_savings",
                "measured_savings_pct",
              ];
            }

            // For Query Builder "Summary Excel" view, determine endpoint based on field selection:
            // - If "Brands" field group selected (specific brand) -> use /consolidated/brand-summary?brand=X
            // - If "All Brand Summary" field group selected -> use /consolidated/all-brand-summary

            // Kering brand name mapping (field ID slug -> actual brand name)
            const KERING_BRAND_SLUG_MAP: Record<string, string> = {
              "alexander-mcqueen": "Alexander McQueen",
              balenciaga: "Balenciaga",
              "bottega-veneta": "Bottega Veneta",
              boucheron: "Boucheron",
              brioni: "Brioni",
              dodo: "Dodo",
              gucci: "Gucci",
              "kering-eyewear": "Kering Eyewear",
              pomellato: "Pomellato",
              "saint-laurent": "Saint Laurent",
              "kering-corporate": "Kering Corporate",
            };

            // Check if a specific brand is selected from "Brands" field group
            // Field IDs look like: "kering-brand-gucci", "kering-brand-balenciaga"
            const allSelectedFields = Object.values(selectedFields).flat();
            const selectedBrandField = allSelectedFields.find(
              (field) =>
                field.startsWith("kering-brand-") &&
                !field.includes("all-brand"),
            );

            let summaryResponse: any;
            let responseSheetType = "All Brand summary";

            if (selectedBrandField) {
              // Extract brand slug from field ID (e.g., "kering-brand-gucci" -> "gucci")
              const brandSlug = selectedBrandField.replace("kering-brand-", "");
              const brandName = KERING_BRAND_SLUG_MAP[brandSlug];

              if (brandName) {
                // Call brand-specific endpoint
                responseSheetType = brandName;
                summaryResponse = await fetchKeringConsolidatedBrandSummary(
                  brandName,
                  market || undefined,
                  clientId,
                  undefined,
                );
              } else {
                // Fallback to all-brand-summary if brand mapping not found
                summaryResponse = await fetchKeringAllBrandSummary(
                  clientId,
                  undefined,
                  market || undefined,
                );
              }
            } else {
              // No specific brand selected, use all-brand-summary
              summaryResponse = await fetchKeringAllBrandSummary(
                clientId,
                undefined,
                market || undefined,
              );
            }

            // Transform to generic format for `apiData`
            // Map: Tracker Field Name -> Consolidated Response Field Name
            const KERING_CONSOLIDATED_TO_TRACKER_MAP: Record<string, string> = {
              total_net_net_media_spend: "total_spend",
              total_affectable_spend: "addressable_spend",
              measured_spend: "measured_spend",
              measured_spend_pct: "measured_spend_pct",
              measured_savings: "measured_savings",
              measured_savings_pct: "measured_savings_pct",
              total_savings: "added_value",
              total_savings_pct: "added_value_pct",
            };

            // Response field names that can be used directly
            const RESPONSE_FIELDS = [
              "total_spend",
              "addressable_spend",
              "measured_spend",
              "measured_spend_pct",
              "measured_savings",
              "measured_savings_pct",
              "added_value",
              "added_value_pct",
            ];

            const mappedData = summaryResponse.data.map((item: any) => {
              const mappedItem: any = { ...item };

              // Apply mapping: Ensure the keys expected by the chart (keringFields) exist in the item
              keringFields.forEach((field) => {
                // Check if field is already a response field name (direct access)
                if (RESPONSE_FIELDS.includes(field)) {
                  // Field already matches response, no mapping needed
                  if (item[field] !== undefined) {
                    mappedItem[field] = item[field];
                  }
                } else {
                  // Field is a tracker field name, need to map
                  const sourceKey = KERING_CONSOLIDATED_TO_TRACKER_MAP[field];
                  if (sourceKey && item[sourceKey] !== undefined) {
                    mappedItem[field] = item[sourceKey];
                  }
                }
              });

              return mappedItem;
            });

            setApiData({
              data: mappedData,
              requested_fields: keringFields,
              total_records: summaryResponse.total_records,
              consolidation_job_id: summaryResponse.consolidation_job_id,
              sheet_type: "All Brand summary",
            });
            setTrackerData(null);
            setTrackerSummaryData(null);
            setKeringBrandData(null);
            setCarlsbergOverviewData(null);
            setCarlsbergMEUData(null);
          } else {
            // Generic Consolidated Summary logic
            const response = await fetchSummaryDataFromSelection(
              client,
              jobId || "", // handle potentially undefined jobId if strict check needed
              selectedFields,
              undefined,
              undefined,
              market || undefined,
            );
            setApiData(response);
            setTrackerData(null);
            setTrackerSummaryData(null);
            setKeringBrandData(null);
            setCarlsbergOverviewData(null);
            setCarlsbergMEUData(null);
          }
        } else if (dataSource === "trackers" && clientId) {
          // Kering uses brand-summary endpoint for trackers
          if (isKering) {
            // Extract backend field names from selected fields
            const keringFields = mapKeringFieldsToBackend(selectedFields);

            // Detect media type for Kering to ensure correct data filtering
            let keringMediaType: string | undefined;
            const allSelectedIds = Object.values(selectedFields).flat();

            // Simple heuristic to find media type from field ID
            // Kering field IDs are like: kering-social-total-branding-total-spend
            const findMediaType = (ids: string[]) => {
              for (const id of ids) {
                if (id.includes("social-total")) return "SOCIAL TOTAL";
                if (id.includes("social-branding")) return "SOCIAL BRANDING";
                if (id.includes("social-performance"))
                  return "SOCIAL PERFORMANCE";
                if (id.includes("print")) return "PRINT";
                if (id.includes("outdoor")) return "OUTDOOR";
                if (id.includes("digital")) return "DIGITAL";
                if (id.includes("tv")) return "TV";
                if (id.includes("cinema")) return "CINEMA";
                if (id.includes("radio")) return "RADIO";
              }
              return undefined;
            };

            keringMediaType = findMediaType(allSelectedIds);

            const response = await fetchKeringBrandSummary(
              clientId,
              undefined, // brandName - all brands
              undefined, // period
              keringMediaType, // Pass detected media type
              undefined, // type
              undefined, // marketId
              market || undefined, // markets
              keringFields.length > 0 ? keringFields : undefined, // fields - only pass if selected
            );
            setKeringBrandData(response);
            setTrackerData(null);
            setTrackerSummaryData(null);
            setApiData(null);
            setCarlsbergOverviewData(null);
            setCarlsbergMEUData(null);
          } else {
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
              setKeringBrandData(null);
              setApiData(null);
              setCarlsbergOverviewData(null);
              setCarlsbergMEUData(null);
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
              setKeringBrandData(null);
              setApiData(null);
              setCarlsbergOverviewData(null);
              setCarlsbergMEUData(null);
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
              setKeringBrandData(null);
              setApiData(null);
              setCarlsbergOverviewData(null);
              setCarlsbergMEUData(null);
            }
          }
        } else {
          setApiData(null);
          setTrackerData(null);
          setTrackerSummaryData(null);
          setKeringBrandData(null);
          setCarlsbergOverviewData(null);
          setCarlsbergMEUData(null);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setApiError(
          error instanceof Error ? error.message : "Failed to fetch data",
        );
        setApiData(null);
        setTrackerData(null);
        setTrackerSummaryData(null);
        setKeringBrandData(null);
        setCarlsbergOverviewData(null);
        setCarlsbergMEUData(null);
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
    hasDynamicTrackerFields,
    isKering,
    isCarlsberg,
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

  // Transform Carlsberg consolidated data into chart-compatible format
  const getCarlsbergChartData = useMemo(() => {
    const allSelectedFieldIds = Object.values(selectedFields).flat();
    if (!carlsbergOverviewData && !carlsbergMEUData) return null;

    // Extract field names from selected field IDs
    const selectedOverviewFields: string[] = [];
    const selectedMEUFields: string[] = [];
    allSelectedFieldIds.forEach((fieldId) => {
      if (fieldId.startsWith("carlsberg-overview-")) {
        selectedOverviewFields.push(fieldId.replace("carlsberg-overview-", ""));
      } else if (fieldId.startsWith("carlsberg-meu-")) {
        selectedMEUFields.push(fieldId.replace("carlsberg-meu-", ""));
      }
    });

    const allSelectedFields = [...selectedOverviewFields, ...selectedMEUFields];
    if (allSelectedFields.length === 0) return null;

    // Group data by market
    const marketAggregates: Record<string, Record<string, unknown>> = {};

    // Process Overview data - aggregate by market (since it has multiple media rows per market)
    // Only use TOTAL rows or sum up individual media types
    if (carlsbergOverviewData?.data && selectedOverviewFields.length > 0) {
      carlsbergOverviewData.data.forEach((row) => {
        const rowData = row as unknown as Record<string, unknown>;
        const marketName = String(rowData.market || `Market ${row.market_id}`);
        const mediaType = String(rowData.media || "");

        // Only use TOTAL rows for market-level aggregation
        if (mediaType.toUpperCase() !== "TOTAL") return;

        if (!marketAggregates[marketName]) {
          marketAggregates[marketName] = {
            name: marketName,
          };
        }

        // Copy selected fields from TOTAL row
        selectedOverviewFields.forEach((field) => {
          const value = rowData[field];
          if (value !== undefined && value !== null && typeof value === "number") {
            marketAggregates[marketName][field] = value;
          }
        });
      });
    }

    // Process MEU data - direct mapping (one row per market)
    if (carlsbergMEUData?.data && selectedMEUFields.length > 0) {
      carlsbergMEUData.data.forEach((row) => {
        const rowData = row as unknown as Record<string, unknown>;
        const marketName = String(rowData.market || `Market ${row.market_id}`);

        // Skip numeric-only market names (like "100", "89", "99") - these are likely invalid
        if (/^\d+$/.test(marketName)) return;

        if (!marketAggregates[marketName]) {
          marketAggregates[marketName] = {
            name: marketName,
          };
        }

        // Copy selected fields
        selectedMEUFields.forEach((field) => {
          const value = rowData[field];
          if (value !== undefined && value !== null && typeof value === "number") {
            marketAggregates[marketName][field] = value;
          }
        });
      });
    }

    // Convert to array and filter out rows where all selected fields are empty/null/zero
    const result = Object.values(marketAggregates).filter((item) => {
      return allSelectedFields.some((field) => {
        const val = item[field];
        return val !== undefined && val !== null && val !== 0;
      });
    });

    console.log("[getCarlsbergChartData] Result:", result);
    return result.length > 0 ? result : null;
  }, [carlsbergOverviewData, carlsbergMEUData, selectedFields]);

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
  // Data comes with multiple periods per media_type, so we need to aggregate
  const getTrackerSummaryChartData = useMemo(() => {
    if (!trackerSummaryData || trackerSummaryData.length === 0) return null;

    // Get first valid row (not null/undefined)
    const sampleRow = trackerSummaryData.find((row) => row != null) as unknown as Record<
      string,
      unknown
    > | undefined;

    // If no valid rows, return null
    if (!sampleRow) return null;

    // Get numeric field names from first row (excluding id, market_id)
    const numericFields = Object.keys(sampleRow).filter((key) => {
      return !["id", "market_id", "period", "data_type", "media_type", "summary_type", "media_or_category"].includes(
        key,
      );
    });

    // Group by media_type and aggregate numeric values
    // Use the latest period's data (Dec/YTD) for each media type
    const mediaAggregates: Record<string, Record<string, unknown>> = {};

    trackerSummaryData.forEach((row) => {
      const rowData = row as unknown as Record<string, unknown>;
      // Support both Arla (media_type) and Carlsberg (media_or_category) field names
      const mediaType = row.media_type || row.media_or_category || "Unknown";
      // Support both Arla (period) and Carlsberg (summary_type) field names
      const period = row.period || row.summary_type || "";

      // Skip GRAND TOTAL rows - we want individual media types
      if (mediaType === "GRAND TOTAL" || mediaType === "CATEGORIES") return;

      // Use the latest period data (prefer Dec/FullYear, then Nov, etc.)
      // Support both Arla period format (Dec, Nov) and Carlsberg (FullYear, YTD_Dec)
      const periodOrder = [
        "FullYear",
        "YTD_Dec",
        "Dec",
        "YTD_Nov",
        "Nov",
        "YTD_Oct",
        "Oct",
        "YTD_Sep",
        "Sep",
        "YTD_Aug",
        "Aug",
        "YTD_Jul",
        "Jul",
        "YTD_Jun",
        "Jun",
        "YTD_May",
        "May",
        "YTD_Apr",
        "Apr",
        "YTD_Mar",
        "Mar",
        "YTD_Feb",
        "Feb",
        "YTD_Jan",
        "Jan",
      ];
      const currentPeriodIndex = periodOrder.indexOf(period);
      const existingPeriod = mediaAggregates[mediaType]?._period as
        | string
        | undefined;
      const existingPeriodIndex = existingPeriod
        ? periodOrder.indexOf(existingPeriod)
        : 999;

      // Only update if this is a later period (lower index = later in year)
      if (
        currentPeriodIndex < existingPeriodIndex ||
        !mediaAggregates[mediaType]
      ) {
        mediaAggregates[mediaType] = {
          name: mediaType,
          _period: period,
        };

        // Copy all numeric fields
        numericFields.forEach((field) => {
          const val = rowData[field];
          if (typeof val === "number") {
            mediaAggregates[mediaType][field] = val;
          } else if (val !== null && val !== undefined) {
            const parsed = Number(val);
            if (!isNaN(parsed)) {
              mediaAggregates[mediaType][field] = parsed;
            }
          }
        });
      }
    });

    // Convert to array and filter out media types with no data
    return Object.values(mediaAggregates)
      .filter((item) => {
        // Check if at least one numeric field has a non-zero value
        return numericFields.some((field) => {
          const val = item[field];
          return typeof val === "number" && val !== 0;
        });
      })
      .map((item) => {
        // Remove internal _period field
        const { _period, ...rest } = item;
        return rest;
      });
  }, [trackerSummaryData]);

  // Transform Kering brand summary data into chart-compatible format
  const getKeringBrandChartData = useMemo(() => {
    if (
      !keringBrandData ||
      !keringBrandData.data ||
      keringBrandData.data.length === 0
    )
      return null;

    // Group by brand_name and aggregate numeric values
    const brandAggregates: Record<string, Record<string, unknown>> = {};

    // Numeric fields to aggregate
    const numericFields = [
      "total_net_net_media_spend",
      "measured_spend",
      "total_savings",
      "total_savings_pct",
      "measured_savings",
      "measured_savings_pct",
      "total_affectable_spend",
      "total_non_affectable_spend",
    ];

    // Find the best period to use (prefer FY, then 1H, then any available)
    const availablePeriods = new Set(
      keringBrandData.data.map((row) => row.period),
    );
    const preferredPeriod = availablePeriods.has("FY")
      ? "FY"
      : availablePeriods.has("1H")
        ? "1H"
        : availablePeriods.has("YTD")
          ? "YTD"
          : Array.from(availablePeriods)[0] || null;

    console.log(
      "[getKeringBrandChartData] Available periods:",
      Array.from(availablePeriods),
    );
    console.log("[getKeringBrandChartData] Using period:", preferredPeriod);

    keringBrandData.data.forEach((row) => {
      const brandName = row.brand_name || "Unknown";

      // Use the preferred period for aggregation
      if (preferredPeriod && row.period !== preferredPeriod) return;

      // Only use ALL type (skip DIRECT BUY, CENTRAL HUB, CLIENT BUY breakdowns)
      if (row.type !== "ALL") return;

      // Skip GRAND TOTAL media type - we want individual media types
      if (row.media_type === "GRAND TOTAL") return;

      if (!brandAggregates[brandName]) {
        brandAggregates[brandName] = {
          name: brandName,
        };
        numericFields.forEach((field) => {
          brandAggregates[brandName][field] = 0;
        });
      }

      // Sum up values across media types (treat null as 0)
      numericFields.forEach((field) => {
        const value = row[field as keyof typeof row];
        if (typeof value === "number") {
          (brandAggregates[brandName][field] as number) += value;
        }
        // If value is null but we've seen this field before, keep the accumulated value
        // This ensures we don't reset to 0 when encountering nulls
      });
    });

    console.log(
      "[getKeringBrandChartData] Aggregated brands:",
      Object.keys(brandAggregates),
    );
    console.log(
      "[getKeringBrandChartData] Sample aggregate:",
      Object.values(brandAggregates)[0],
    );

    // Convert to array - don't filter out brands with zero/null values
    // The data might legitimately have zeros or nulls
    const result = Object.values(brandAggregates);

    console.log("[getKeringBrandChartData] Returning", result.length, "brands");

    return result;
  }, [keringBrandData]);

  // Get chart data based on data source selection
  // Only returns actual API data, no static fallbacks
  // Works for any client, not just Arla
  const getClientData = useMemo(() => {
    // Use API data for summary
    if (dataSource === "summary") {
      // Carlsberg uses consolidated Overview/MEU data
      if (
        isCarlsberg &&
        getCarlsbergChartData &&
        getCarlsbergChartData.length > 0
      ) {
        return getCarlsbergChartData;
      }
      // Other clients use generic API data
      if (getApiChartData && getApiChartData.length > 0) {
        return getApiChartData;
      }
      return null;
    }

    // Use tracker data for trackers
    if (dataSource === "trackers") {
      // Kering uses brand summary data
      if (
        isKering &&
        getKeringBrandChartData &&
        getKeringBrandChartData.length > 0
      ) {
        return getKeringBrandChartData;
      }
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
    dataSource,
    getApiChartData,
    getCarlsbergChartData,
    getTrackerChartData,
    getTrackerSummaryChartData,
    getKeringBrandChartData,
    isKering,
    isCarlsberg,
  ]);

  // Alias for backwards compatibility
  const getArlaData = getClientData;

  // Get chart data - only returns real data, no sample/mock data
  // Works for any client
  const getChartData = () => {
    // For summary data (any client)
    if (dataSource === "summary") {
      if (getClientData && getClientData.length > 0) {
        return getClientData;
      }
      // Return empty array - no mock data
      return [];
    }

    // For tracker data with dynamic field selection (new normalized flow)
    // The API now returns field_value directly in each record - no lookup needed!
    if (dataSource === "trackers" && dynamicTrackerData) {
      const monthlyData = dynamicTrackerData.monthly || [];
      const generalData = dynamicTrackerData.general || [];

      // Debug: log first item to verify field_value is present
      if (monthlyData.length > 0) {
        console.log("[getChartData] First monthly item (normalized):", {
          field_value: monthlyData[0].field_value,
          month: monthlyData[0].month,
          allKeys: Object.keys(monthlyData[0]),
        });
      }

      // Get unique field values (channel names) from the data
      const uniqueFieldValues = new Set<string>();
      monthlyData.forEach((item) => {
        if (item.field_value) {
          uniqueFieldValues.add(item.field_value);
        }
      });

      // Auto-detect numeric fields from the data (excluding metadata fields)
      const excludedFields = [
        "field_value",
        "month",
        "period", // Carlsberg uses 'period' instead of 'month'
        "id",
        "market_id",
        "general_id",
        "general_data_id", // Carlsberg uses this
        "tv_data_general_id",
        "print_data_general_id",
        "ooh_data_general_id",
        "radio_data_general_id",
        "online_data_general_id",
        "cinema_data_general_id",
        "row_index",
        "extracted_file_id",
      ];
      const getNumericFields = (item: Record<string, unknown>): string[] => {
        return Object.keys(item).filter(
          (key) =>
            typeof item[key] === "number" && !excludedFields.includes(key),
        );
      };

      // Get the first numeric field to use as the metric
      const sampleItem = monthlyData[0] || generalData[0];
      const numericFields = sampleItem
        ? getNumericFields(sampleItem as Record<string, unknown>)
        : [];
      const metricField = numericFields[0] || "value"; // fallback to "value" if no numeric field found

      // Helper to get the metric value from an item
      const getMetricValue = (item: Record<string, unknown>): number => {
        // Try each numeric field until we find a value
        for (const field of numericFields) {
          if (typeof item[field] === "number") return item[field] as number;
        }
        return 0;
      };

      // Check if multiple channels - show grouped comparison
      if (uniqueFieldValues.size > 1 && monthlyData.length > 0) {
        // Group data by month, with each field_value (channel) as a separate key
        const monthlyMap = new Map<string, Record<string, string | number>>();
        const channelNames = Array.from(uniqueFieldValues);

        monthlyData.forEach((item) => {
          // Support both 'month' (Arla) and 'period' (Carlsberg) field names
          const month = String(item.month || (item as any).period || "Unknown");
          const channelName = item.field_value || "Unknown";
          const value = getMetricValue(item as Record<string, unknown>);

          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { name: month });
          }
          const existing = monthlyMap.get(month)!;

          // Add or accumulate the value for this channel
          const currentValue = existing[channelName];
          const numericCurrent =
            typeof currentValue === "number" ? currentValue : 0;
          existing[channelName] = numericCurrent + value;
        });

        console.log(
          "[getChartData] Multi-channel monthlyMap:",
          Object.fromEntries(monthlyMap),
        );

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
        const result = Array.from(monthlyMap.values()).sort((a, b) => {
          const aIdx = monthOrder.indexOf(String(a.name).toUpperCase());
          const bIdx = monthOrder.indexOf(String(b.name).toUpperCase());
          return aIdx - bIdx;
        });

        // Check if all values are 0 - return empty array to show "No data" state
        const hasNonZeroValue = result.some((row) => {
          return channelNames.some((channel) => {
            const value = row[channel];
            return typeof value === "number" && value !== 0;
          });
        });
        if (!hasNonZeroValue) {
          console.log("[getChartData] All values are 0, returning empty array");
          return [];
        }

        return result;
      }

      // Single channel: show monthly trend using channel name as key (for legend consistency)
      if (monthlyData.length > 0) {
        // Get the single channel name from the data
        const singleChannelName =
          Array.from(uniqueFieldValues)[0] || metricField;

        const monthlyMap = new Map<string, Record<string, string | number>>();
        monthlyData.forEach((item) => {
          // Support both 'month' (Arla) and 'period' (Carlsberg) field names
          const month = String(item.month || (item as any).period || "Unknown");
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { name: month });
          }
          const existing = monthlyMap.get(month)!;

          const value = getMetricValue(item as Record<string, unknown>);
          // Use channel name as key for legend consistency
          const currentValue = existing[singleChannelName];
          const numericCurrent =
            typeof currentValue === "number" ? currentValue : 0;
          existing[singleChannelName] = numericCurrent + value;
        });

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
        const result = Array.from(monthlyMap.values()).sort((a, b) => {
          const aIdx = monthOrder.indexOf(String(a.name).toUpperCase());
          const bIdx = monthOrder.indexOf(String(b.name).toUpperCase());
          return aIdx - bIdx;
        });

        // Check if all values are 0 - return empty array to show "No data" state
        const hasNonZeroValue = result.some((row) => {
          const value = row[singleChannelName];
          return typeof value === "number" && value !== 0;
        });
        if (!hasNonZeroValue) {
          console.log("[getChartData] All values are 0, returning empty array");
          return [];
        }

        return result;
      }

      // Fallback to general data
      if (generalData.length > 0) {
        return generalData.map((item, idx) => {
          const itemName = item.field_value || `Record ${idx + 1}`;
          const value = getMetricValue(item as Record<string, unknown>);
          return {
            name: itemName,
            [metricField]: value,
          };
        });
      }
    }

    // For tracker data (existing flow - static field selection, any client)
    if (dataSource === "trackers") {
      if (getClientData && getClientData.length > 0) {
        return getClientData;
      }
      // Return empty array - no mock data
      return [];
    }

    // Default: return empty array (no mock/random data)
    return [];
  };

  // Memoize rawData to prevent infinite loops
  const rawData = useMemo(
    () => getChartData(),
    [dataSource, getClientData, dynamicTrackerData, keringBrandData, isKering],
  );

  // Track previous rawData to avoid unnecessary parent updates
  const prevRawDataRef = useRef<typeof rawData>(rawData);

  // Notify parent of chart data changes for smart recommendations
  useEffect(() => {
    if (onChartDataChange) {
      // Only notify if data actually changed (deep comparison by JSON)
      const prevJson = JSON.stringify(prevRawDataRef.current);
      const currentJson = JSON.stringify(rawData);
      if (prevJson !== currentJson) {
        prevRawDataRef.current = rawData;
        onChartDataChange(rawData);
      }
    }
  }, [rawData, onChartDataChange]);

  // Check if we have actual data to display
  const hasData = rawData.length > 0;

  // Determine which data keys to use based on data type
  const hasClientData = getClientData && getClientData.length > 0;
  // Alias for backwards compatibility
  const isArlaData = hasClientData;
  const isApiData = apiData && apiData.data.length > 0;
  const _isTrackerApiData =
    (trackerData &&
      ((trackerData.general && trackerData.general.length > 0) ||
        (trackerData.monthly && trackerData.monthly.length > 0) ||
        (trackerData.percentile && trackerData.percentile.length > 0))) ||
    (trackerSummaryData && trackerSummaryData.length > 0);

  // Get available fields from tracker data (complete or summary)
  const _trackerAvailableFields = useMemo(() => {
    // Check tracker summary data first
    if (trackerSummaryData && trackerSummaryData.length > 0) {
      const sampleRow = trackerSummaryData[0] as unknown as Record<
        string,
        unknown
      >;
      return Object.keys(sampleRow).filter((key) => {
        const val = sampleRow[key];
        return typeof val === "number" && !["id", "market_id"].includes(key);
      });
    }

    // Fall back to tracker complete data
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
  }, [trackerData, trackerSummaryData]);

  // Get selected field names from the Query Builder
  // For trackers, strip the prefix (e.g., "summary-total-net-net-spend" -> "total_net_net_spend")
  // Also convert dashes to underscores to match API field names
  const selectedFieldNames = useMemo(() => {
    const rawFields = Object.values(selectedFields).flat();

    // For tracker data source, strip the media type prefix and convert to API format
    if (dataSource === "trackers") {
      return rawFields.map((field) => {
        // Handle Carlsberg field IDs: "carlsberg-tracker-summary-total_net_net_spend"
        // or "carlsberg-tracker-tv-measured_net_net_spend"
        if (field.startsWith("carlsberg-tracker-")) {
          // Remove "carlsberg-tracker-{mediaType}-" prefix
          const withoutPrefix = field.replace(/^carlsberg-tracker-[^-]+-/, "");
          // Carlsberg fields already use underscores, just return as-is
          return withoutPrefix;
        }

        // Handle Arla/other field IDs with simple prefixes
        const prefixes = [
          "summary-",
          "tv-",
          "radio-",
          "print-",
          "ooh-",
          "online-",
          "cinema-",
        ];
        let cleanField = field;
        for (const prefix of prefixes) {
          if (field.startsWith(prefix)) {
            cleanField = field.substring(prefix.length);
            break;
          }
        }
        // Convert dashes to underscores to match API field names
        // e.g., "total-net-net-spend" -> "total_net_net_spend"
        return cleanField.replace(/-/g, "_");
      });
    }

    return rawFields;
  }, [selectedFields, dataSource]);

  // Priority order for tracker metrics - show these first/only
  const _PRIORITY_TRACKER_FIELDS = [
    "ytd_net_net_spend",
    "ytd_total_net_net_spend",
    "ytd_savings",
    "ytd_savings_pct",
    "ytd_measured_spend",
    "ytd_cg_equivalent",
    "fy_net_net_spend",
    "fy_total_net_net_spend",
    "fy_savings",
    "fy_savings_pct",
    "benchmark_spend",
    "calculated_value_loss",
  ];

  // Extract unique channel names from dynamic tracker data (using field_value from normalized API)
  const selectedDynamicChannels = useMemo(() => {
    if (!dynamicTrackerData) return [];

    // Get unique field_value from monthly data
    const channels = new Set<string>();
    (dynamicTrackerData.monthly || []).forEach((item) => {
      if (item.field_value) {
        channels.add(item.field_value);
      }
    });
    return Array.from(channels);
  }, [dynamicTrackerData]);

  // Get the first field from API response for primary data key (for charts)
  // For dynamic tracker data with multiple channels, return channel names as fields
  // For single channel, return the metric field names
  const dynamicTrackerNumericFields = useMemo(() => {
    if (!dynamicTrackerData) return [];

    // Always return channel names as the fields for legend consistency
    // This ensures single channel shows "Channel Name" instead of "ytd_total_net_net_spend"
    if (selectedDynamicChannels.length >= 1) {
      return selectedDynamicChannels;
    }

    return [];
  }, [dynamicTrackerData, selectedDynamicChannels]);

  /* 
    Moved primaryApiField definition AFTER allApiFields because it depends on correct field resolution.
    See below.
  */

  // Get all requested fields from either API source
  // For summary: use apiData.requested_fields
  // For Carlsberg summary: extract from selectedFields
  // For Kering trackers: use mapped backend fields
  // For dynamic trackers: use actual numeric fields from the response
  // For static trackers: use the selected fields from Query Builder, or auto-detect from data
  const allApiFields = useMemo(() => {
    if (isApiData) {
      return apiData.requested_fields;
    }
    // Carlsberg summary uses Overview and MEU data
    if (isCarlsberg && (carlsbergOverviewData || carlsbergMEUData)) {
      const fields: string[] = [];
      const allSelectedFieldIds = Object.values(selectedFields).flat();
      allSelectedFieldIds.forEach((fieldId) => {
        if (fieldId.startsWith("carlsberg-overview-")) {
          fields.push(fieldId.replace("carlsberg-overview-", ""));
        } else if (fieldId.startsWith("carlsberg-meu-")) {
          fields.push(fieldId.replace("carlsberg-meu-", ""));
        }
      });
      return fields;
    }
    if (isKering && keringBrandData) {
      return mapKeringFieldsToBackend(selectedFields);
    }
    if (dynamicTrackerData && dynamicTrackerNumericFields.length > 0) {
      return dynamicTrackerNumericFields;
    }
    if (dataSource === "trackers") {
      // If fields are explicitly selected, use them
      if (selectedFieldNames.length > 0) {
        return selectedFieldNames;
      }
      // Auto-detect numeric fields from tracker summary data
      if (trackerSummaryData && trackerSummaryData.length > 0) {
        const sampleRow = trackerSummaryData[0] as unknown as Record<string, unknown>;
        const numericFields = Object.keys(sampleRow).filter((key) => {
          // Exclude non-metric fields
          if (["id", "market_id", "period", "data_type", "media_type", "summary_type", "media_or_category", "name"].includes(key)) {
            return false;
          }
          // Check if the value is numeric
          const val = sampleRow[key];
          return typeof val === "number" || (val !== null && val !== undefined && !isNaN(Number(val)));
        });
        return numericFields;
      }
    }
    return [];
  }, [isApiData, apiData, isCarlsberg, carlsbergOverviewData, carlsbergMEUData, isKering, keringBrandData, selectedFields, dynamicTrackerData, dynamicTrackerNumericFields, dataSource, selectedFieldNames, trackerSummaryData]);

  const primaryApiField =
    isApiData && apiData.requested_fields.length > 0
      ? apiData.requested_fields[0]
      : dynamicTrackerData && dynamicTrackerNumericFields.length > 0
        ? dynamicTrackerNumericFields.find(
            (f) =>
              f.includes("net_net_spend") || f.includes("ytd_net_net_spend"),
          ) || dynamicTrackerNumericFields[0]
        : allApiFields.length > 0
          ? allApiFields[0]
          : null;

  // Helper to find field in allApiFields
  const findField = (patterns: string[]) => {
    for (const pattern of patterns) {
      const found = allApiFields.find((f) => f.includes(pattern));
      if (found) return found;
    }
    return null;
  };

  const dataKeys = {
    spend:
      primaryApiField ||
      findField([
        "ytd_net_net_spend",
        "net_net_spend",
        "total_net_net_spend",
      ]) ||
      (isArlaData ? "total_net_net_spend" : "spend"),
    savings:
      findField([
        "ytd_savings",
        "savings_value",
        "fy_total_savings",
        "fy_savings",
      ]) || (isArlaData ? "savings_value" : "savings"),
    savingsPct:
      findField([
        "ytd_savings_pct",
        "savings_pct",
        "fy_total_savings_pct",
        "fy_savings_pct",
      ]) || (isArlaData ? "savings_pct" : "savingsPct"),
    inflationPct:
      findField(["inflation_pct"]) ||
      (isArlaData ? "inflation_pct" : "inflation"),
    measuredPct:
      findField(["measured_spend_pct", "ytd_measured_spend"]) ||
      (isArlaData ? "measured_spend_pct" : "measuredPct"),
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

  // Debug logging for dynamic tracker data
  if (dynamicTrackerData && selectedDynamicChannels.length > 0) {
    console.log("[VisualizationCanvas] Debug:", {
      selectedDynamicChannels,
      dynamicTrackerNumericFields,
      allApiFields,
      dataKeysApiFields: dataKeys.apiFields,
      rawDataSample: rawData.slice(0, 3),
      sampleDataSample: sampleData.slice(0, 3),
    });
  }

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

  const _renderChartGallery = () => {
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
    // Show loading state when fetching API data (for both summary and trackers, any client)
    if (
      isLoadingApiData &&
      (dataSource === "summary" || dataSource === "trackers")
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

    // Show loading state for dynamic tracker data
    if (isLoadingDynamicData && dataSource === "trackers") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Loading tracker data...
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Fetching monthly and percentile data for the selected field
          </p>
        </div>
      );
    }

    // Show error state if dynamic tracker data fetch failed
    if (dynamicDataError && dataSource === "trackers") {
      return (
        <DashboardErrorState
          error={new Error(dynamicDataError)}
          title="Failed to load tracker data"
          description="Could not fetch data for the selected field. Please try selecting a different field."
        />
      );
    }

    // Show error state if API call failed (for both summary and trackers, any client)
    if (
      apiError &&
      (dataSource === "summary" || dataSource === "trackers") &&
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

    // Show "no data" state when fields are selected but no data returned (any client)
    if (
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
    if (dataSource === "trackers" && !market) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 mb-5">
            <BarChart3 className="w-14 h-14 text-amber-600" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-800 mb-3">
            Select a Market
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Trackers data requires a specific market to be selected. Please
            choose a market from the top bar to continue.
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

    // Show message if graph type is selected but no fields selected
    if (selectedGraphType && getTotalSelected() === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <Sparkles className="w-12 h-12 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Select Fields to Visualize
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Use the <strong>Query Builder</strong> on the left to select the
            data fields you want to display in your{" "}
            {selectedGraphType.replace("-", " ")}.
          </p>
        </div>
      );
    }

    const _graphTitle = `${client || "Client"} - ${market || "All Markets"} - ${period || "YTD"}`;

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

    const _kpis = calculateKPIs();

    // PPT Button component to avoid duplication
    const _PPTButton = () => (
      <button
        onClick={handleToggleForPPT}
        disabled={!isChartReady && !isIncludedInReport}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isIncludedInReport
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
            {/* Expand Button */}
            {!isModalOpen && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={sampleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ${formatValue(value, dataKeys.spend)}`
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
                    formatter={(value: number) =>
                      formatValue(value, dataKeys.spend)
                    }
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
            {/* Expand Button */}
            {!isModalOpen && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={sampleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ${formatValue(value, dataKeys.spend)}`
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
                    formatter={(value: number) =>
                      formatValue(value, dataKeys.spend)
                    }
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
            {/* Expand Button */}
            {!isModalOpen && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}

            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  layout="vertical"
                  margin={{ top: 20, right: 80, left: 20, bottom: 5 }}
                  onClick={(e: any) =>
                    e &&
                    e.activePayload &&
                    handleChartClick(e.activePayload[0].payload)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      formatValue(value, name as string)
                    }
                  />
                  <Legend />
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend]
                  ).map((field, index) => (
                    <Bar
                      key={field}
                      dataKey={field}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      radius={[0, 8, 8, 0]}
                      name={getFieldLabel(field)}
                      style={{ cursor: "pointer" }}
                      label={{
                        position: "right",
                        fontSize: 10,
                        fill: "#475569",
                        formatter: (value: any) => formatValue(value, field),
                      }}
                    />
                  ))}
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
            {/* Expand Button */}
            {!isModalOpen && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}

            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  margin={{ top: 60, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={80}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      formatValue(value, name as string)
                    }
                  />
                  <Legend />
                  {/* First half of fields as bars */}
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend]
                  )
                    .slice(
                      0,
                      Math.ceil((dataKeys.apiFields.length || 1) / 2) || 1,
                    )
                    .map((field, index) => (
                      <Bar
                        key={field}
                        dataKey={field}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        radius={[8, 8, 0, 0]}
                        name={getFieldLabel(field)}
                        label={{
                          position: "top",
                          fontSize: 9,
                          fill: "#475569",
                          angle: -90,
                          textAnchor: "start",
                          dy: -5,
                          formatter: (value: any) => formatValue(value, field),
                        }}
                      />
                    ))}
                  {/* Second half of fields as lines */}
                  {(dataKeys.apiFields.length > 1
                    ? dataKeys.apiFields
                    : [dataKeys.savings]
                  )
                    .slice(Math.ceil((dataKeys.apiFields.length || 2) / 2))
                    .map((field, index) => (
                      <Line
                        key={field}
                        type="monotone"
                        dataKey={field}
                        stroke={
                          CHART_COLORS[
                            (index +
                              Math.ceil((dataKeys.apiFields.length || 2) / 2)) %
                              CHART_COLORS.length
                          ]
                        }
                        strokeWidth={3}
                        name={getFieldLabel(field)}
                        label={{
                          position: "top",
                          fontSize: 9,
                          fill: CHART_COLORS[
                            (index +
                              Math.ceil((dataKeys.apiFields.length || 2) / 2)) %
                              CHART_COLORS.length
                          ],
                          angle: -90,
                          textAnchor: "start",
                          dy: -5,
                          formatter: (value: any) => formatValue(value, field),
                        }}
                      />
                    ))}
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
            {/* Chart Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShowDataLabels(!showDataLabels)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${showDataLabels ? "bg-violet-100 text-violet-600" : "hover:bg-slate-100 text-slate-500"}`}
                title={showDataLabels ? "Hide labels" : "Show labels"}
              >
                {showDataLabels ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {!isModalOpen && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>

            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  margin={{ top: 60, right: 20, left: 20, bottom: 5 }}
                  onClick={(e: any) =>
                    e &&
                    e.activePayload &&
                    handleChartClick(e.activePayload[0].payload)
                  }
                >
                  {/* Gradient definitions */}
                  <defs>
                    {CHART_COLORS.map((color, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`barGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor={color}
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={80}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
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
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend]
                  ).map((field, index) => (
                    <Bar
                      key={field}
                      dataKey={field}
                      fill={`url(#barGradient-${index % CHART_COLORS.length})`}
                      radius={[8, 8, 0, 0]}
                      name={getFieldLabel(field)}
                      style={{ cursor: "pointer" }}
                      label={
                        showDataLabels
                          ? {
                              position: "top",
                              fontSize: 9,
                              fill: "#475569",
                              angle: -90,
                              textAnchor: "start",
                              dy: -5,
                              formatter: (value: any) =>
                                formatValue(value, field),
                            }
                          : false
                      }
                    />
                  ))}
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
            {/* Chart Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShowDataLabels(!showDataLabels)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${showDataLabels ? "bg-violet-100 text-violet-600" : "hover:bg-slate-100 text-slate-500"}`}
                title={showDataLabels ? "Hide labels" : "Show labels"}
              >
                {showDataLabels ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {!isModalOpen && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  margin={{ top: 60, right: 20, left: 20, bottom: 5 }}
                >
                  {/* Gradient definitions */}
                  <defs>
                    {CHART_COLORS.map((color, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`groupedGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor={color}
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={80}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      formatValue(value, name as string)
                    }
                  />
                  <Legend />
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend, dataKeys.savings]
                  ).map((field, index) => (
                    <Bar
                      key={field}
                      dataKey={field}
                      fill={`url(#groupedGradient-${index % CHART_COLORS.length})`}
                      radius={[8, 8, 0, 0]}
                      name={getFieldLabel(field)}
                      label={
                        showDataLabels
                          ? {
                              position: "top",
                              fontSize: 9,
                              fill: "#475569",
                              angle: -90,
                              textAnchor: "start",
                              dy: -5,
                              formatter: (value: any) =>
                                formatValue(value, field),
                            }
                          : false
                      }
                    />
                  ))}
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
            {/* Chart Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShowDataLabels(!showDataLabels)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${showDataLabels ? "bg-violet-100 text-violet-600" : "hover:bg-slate-100 text-slate-500"}`}
                title={showDataLabels ? "Hide labels" : "Show labels"}
              >
                {showDataLabels ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {!isModalOpen && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={sampleData}
                  margin={{ top: 60, right: 20, left: 20, bottom: 5 }}
                >
                  {/* Gradient definitions */}
                  <defs>
                    {CHART_COLORS.map((color, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`stackedGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor={color}
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={80}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      formatValue(value, name as string)
                    }
                  />
                  <Legend />
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend, dataKeys.savings]
                  ).map((field, index, arr) => (
                    <Bar
                      key={field}
                      dataKey={field}
                      stackId="a"
                      fill={`url(#stackedGradient-${index % CHART_COLORS.length})`}
                      radius={
                        index === arr.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]
                      }
                      name={getFieldLabel(field)}
                      label={
                        showDataLabels && index === arr.length - 1
                          ? {
                              position: "top",
                              fontSize: 9,
                              fill: "#475569",
                              angle: -90,
                              textAnchor: "start",
                              dy: -5,
                              formatter: (value: any) =>
                                formatValue(value, field),
                            }
                          : false
                      }
                    />
                  ))}
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
            {/* Chart Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShowDataLabels(!showDataLabels)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${showDataLabels ? "bg-violet-100 text-violet-600" : "hover:bg-slate-100 text-slate-500"}`}
                title={showDataLabels ? "Hide labels" : "Show labels"}
              >
                {showDataLabels ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {!isModalOpen && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <LineChart
                  data={sampleData}
                  margin={{ top: 40, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={80}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      formatValue(value, name as string)
                    }
                  />
                  <Legend />
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend, dataKeys.savings]
                  ).map((field, index) => (
                    <Line
                      key={field}
                      type="monotone"
                      dataKey={field}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      name={getFieldLabel(field)}
                      label={{
                        position: index % 2 === 0 ? "top" : "bottom",
                        fontSize: 10,
                        fill: CHART_COLORS[index % CHART_COLORS.length],
                        formatter: (value: any) => formatValue(value, field),
                      }}
                    />
                  ))}
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
            {/* Chart Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShowDataLabels(!showDataLabels)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${showDataLabels ? "bg-violet-100 text-violet-600" : "hover:bg-slate-100 text-slate-500"}`}
                title={showDataLabels ? "Hide labels" : "Show labels"}
              >
                {showDataLabels ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {!isModalOpen && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            {/* Chart content for PPT capture */}
            <div
              ref={chartOnlyRef}
              className="bg-white rounded-xl p-4 overflow-visible"
            >
              <ResponsiveContainer width="100%" height={450}>
                <AreaChart
                  data={sampleData}
                  margin={{ top: 40, right: 20, left: 20, bottom: 5 }}
                >
                  {/* Gradient definitions for area fills */}
                  <defs>
                    {CHART_COLORS.map((color, index) => (
                      <linearGradient
                        key={`areaGradient-${index}`}
                        id={`areaGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                        <stop
                          offset="100%"
                          stopColor={color}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={80}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000)
                        return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      formatValue(value, name as string)
                    }
                  />
                  <Legend />
                  {(dataKeys.apiFields.length > 0
                    ? dataKeys.apiFields
                    : [dataKeys.spend, dataKeys.savings]
                  ).map((field, index) => (
                    <Area
                      key={field}
                      type="monotone"
                      dataKey={field}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={`url(#areaGradient-${index % CHART_COLORS.length})`}
                      name={getFieldLabel(field)}
                    />
                  ))}
                  {/* Invisible line for labels on first field */}
                  {showDataLabels && (
                    <Line
                      type="monotone"
                      dataKey={dataKeys.apiFields[0] || dataKeys.spend}
                      stroke="transparent"
                      dot={false}
                      legendType="none"
                      label={
                        {
                          position: "top",
                          fontSize: 10,
                          fill: CHART_COLORS[0],
                          formatter: (value: any) =>
                            formatValue(
                              value,
                              dataKeys.apiFields[0] || dataKeys.spend,
                            ),
                        } as any
                      }
                    />
                  )}
                </AreaChart>
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
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white">
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
          onToggleInclude={handleToggleForPPT}
          slideNumber={slideNumber}
          onUpdateSlideNumber={(num) => onUpdateSlideNumber?.(graphId, num)}
        >
          <div
            ref={chartOnlyRef}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 shadow-sm"
          >
            {renderVisualization()}
          </div>
        </GraphModal>
      </div>
    </div>
  );
}
