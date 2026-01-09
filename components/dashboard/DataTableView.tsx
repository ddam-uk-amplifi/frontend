"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Settings2,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  fetchConsolidatedSummary,
  fetchTrackerSummaryData,
  fetchLatestJob,
  type ConsolidatedSummaryResponse,
  type TrackerSummaryItem,
} from "@/lib/api/dashboard";
import {
  getClientIdByName,
  getClientTableView,
  getClientTrackerColumns,
  getClientSummaryColumns,
  getClientBrands,
  clientHasBrandsIn,
  useTableViewData,
  type TableColumnConfig,
} from "@/lib/clients";

// ============================================================================
// Type Definitions
// ============================================================================

interface TableColumn {
  id: string;
  label: string;
  type: "text" | "currency" | "percentage" | "number";
  align?: "left" | "right" | "center";
  visible: boolean;
  order: number;
  frozen?: boolean;
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

interface DataTableViewProps {
  selectedClient?: string;
  selectedDataSource?: "summary" | "trackers" | "";
  selectedMarket?: string; // From TopBar
  onDataChange?: (columns: string[], rows: TableRow[]) => void;
  selectedGraphsForPPT?: Set<string> | string[];
  onToggleGraphForPPT?: (
    graphId: string,
    graphTitle: string,
    element?: HTMLElement,
    chartData?: Array<{ name: string;[key: string]: any }>,
    dataKeys?: string[],
  ) => void;
}

// ============================================================================
// Constants
// ============================================================================

// Available periods for tracker data
const AVAILABLE_PERIODS = [
  { code: "Jan", name: "January" },
  { code: "Feb", name: "February" },
  { code: "Mar", name: "March" },
  { code: "Apr", name: "April" },
  { code: "May", name: "May" },
  { code: "Jun", name: "June" },
  { code: "Jul", name: "July" },
  { code: "Aug", name: "August" },
  { code: "Sep", name: "September" },
  { code: "Oct", name: "October" },
  { code: "Nov", name: "November" },
  { code: "Dec", name: "December" },
];

// Summary fields to fetch (FYFC and YTD)
const SUMMARY_FIELDS = [
  "total_net_net_spend",
  "total_addressable_net_net_spend",
  "total_net_net_measured",
  "measured_spend_pct",
  "savings_value",
  "savings_pct",
  "inflation_pct",
  "inflation_migration_pct",
  "inflation_after_migration_pct",
];

// Columns for Summary data
const SUMMARY_COLUMNS: TableColumn[] = [
  {
    id: "mediaType",
    label: "Media Type",
    type: "text",
    align: "left",
    visible: true,
    order: 0,
    frozen: true,
  },
  {
    id: "total_net_net_spend",
    label: "Net Net Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 1,
  },
  {
    id: "total_addressable_net_net_spend",
    label: "Addressable Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 2,
  },
  {
    id: "total_net_net_measured",
    label: "Measured Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 3,
  },
  {
    id: "measured_spend_pct",
    label: "Measured %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 4,
  },
  {
    id: "savings_value",
    label: "Savings",
    type: "currency",
    align: "right",
    visible: true,
    order: 5,
  },
  {
    id: "savings_pct",
    label: "Savings %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 6,
  },
  {
    id: "inflation_pct",
    label: "Inflation %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 7,
  },
  {
    id: "inflation_migration_pct",
    label: "Inflation Mitigation",
    type: "percentage",
    align: "right",
    visible: true,
    order: 8,
  },
  {
    id: "inflation_after_migration_pct",
    label: "Inflation After Mitigation %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 9,
  },
];

// Columns for Tracker Summary data
const TRACKER_COLUMNS: TableColumn[] = [
  {
    id: "mediaType",
    label: "Media Type",
    type: "text",
    align: "left",
    visible: true,
    order: 0,
    frozen: true,
  },
  {
    id: "total_net_net_spend",
    label: "Net Net Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 1,
  },
  {
    id: "total_non_addressable_spend",
    label: "Non-Addressable",
    type: "currency",
    align: "right",
    visible: true,
    order: 2,
  },
  {
    id: "total_addressable_spend",
    label: "Addressable",
    type: "currency",
    align: "right",
    visible: true,
    order: 3,
  },
  {
    id: "measured_spend",
    label: "Measured Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 4,
  },
  {
    id: "measured_spend_pct",
    label: "Measured %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 5,
  },
  {
    id: "benchmark_equivalent_net_net_spend",
    label: "Benchmark Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 6,
  },
  {
    id: "value_loss",
    label: "Value Loss",
    type: "currency",
    align: "right",
    visible: true,
    order: 7,
  },
  {
    id: "value_loss_pct",
    label: "Value Loss %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 8,
  },
];

// ============================================================================
// Query Keys - for cache management
// ============================================================================

export const tableDataKeys = {
  all: ["tableData"] as const,
  latestJob: (client: string) =>
    [...tableDataKeys.all, "latestJob", client] as const,
  summary: (client: string, jobId: string, sheetType: string) =>
    [...tableDataKeys.all, "summary", client, jobId, sheetType] as const,
  // Tracker key only uses client + market (period filtering is done on frontend)
  tracker: (client: string, market: string) =>
    [...tableDataKeys.all, "tracker", client, market] as const,
};

// ============================================================================
// Column Config Helpers
// ============================================================================

/**
 * Convert TableColumnConfig (from client config) to TableColumn (for component state)
 * Ensures all required fields have default values
 */
function configToTableColumn(config: TableColumnConfig, index: number): TableColumn {
  return {
    id: config.id,
    label: config.label,
    type: config.type,
    align: config.align || "left",
    visible: config.visible ?? true,
    order: config.order ?? index,
    frozen: config.frozen,
  };
}

/**
 * Convert array of TableColumnConfig to TableColumn[]
 */
function configsToTableColumns(configs: TableColumnConfig[] | null): TableColumn[] | null {
  if (!configs) return null;
  return configs.map((config, index) => configToTableColumn(config, index));
}

// ============================================================================
// Value Formatting
// ============================================================================

function formatCellValue(value: any, type: string): string {
  if (value === null || value === undefined) return "—";

  switch (type) {
    case "currency":
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    case "percentage":
      return `${(typeof value === "number" ? value : 0).toFixed(1)}%`;
    case "number":
      return value.toLocaleString("en-US");
    default:
      return String(value);
  }
}

// ============================================================================
// Transform Functions
// ============================================================================

// Normalize media type to title case for consistent grouping
function normalizeMediaType(mediaType: string): string {
  if (!mediaType) return "Unknown";
  // Convert to title case: "ONLINE" -> "Online", "tv" -> "Tv"
  return mediaType
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function transformSummaryData(data: ConsolidatedSummaryResponse): TableRow[] {
  if (!data.data || data.data.length === 0) return [];

  const mediaGroups: Record<string, Record<string, number>> = {};

  data.data.forEach((item) => {
    // Normalize media type to handle different capitalizations (e.g., "ONLINE" vs "Online")
    const mediaType = normalizeMediaType(item.media_type);
    if (!mediaGroups[mediaType]) {
      mediaGroups[mediaType] = {};
      data.requested_fields.forEach((f) => (mediaGroups[mediaType][f] = 0));
    }
    data.requested_fields.forEach((field) => {
      const val = item[field];
      if (typeof val === "number") {
        mediaGroups[mediaType][field] += val;
      }
    });
  });

  const tableRows: TableRow[] = [];
  Object.entries(mediaGroups).forEach(([mediaType, rowData]) => {
    tableRows.push({
      id: mediaType.toLowerCase().replace(/\s+/g, "-"),
      mediaType,
      type: "Actual",
      level: 0,
      data: rowData,
    });
  });

  const totals: Record<string, number> = {};
  data.requested_fields.forEach((field) => {
    totals[field] = tableRows.reduce(
      (sum, row) => sum + (row.data[field] || 0),
      0,
    );
  });
  tableRows.push({
    id: "total",
    mediaType: "Total",
    type: "Actual",
    level: 0,
    data: totals,
  });

  return tableRows;
}

function transformTrackerData(
  data: TrackerSummaryItem[],
  selectedPeriod?: string,
): TableRow[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  // Filter by selected period (frontend filtering since backend doesn't support it)
  const filteredData = selectedPeriod
    ? data.filter(
      (item) => item.period?.toLowerCase() === selectedPeriod.toLowerCase(),
    )
    : data;

  if (filteredData.length === 0) return [];

  // Find the GRAND TOTAL row from API for the totals
  const grandTotalRow = filteredData.find(
    (item) => item.media_type?.toUpperCase() === "GRAND TOTAL",
  );

  // Create table rows directly from API data (no recalculation needed)
  const tableRows: TableRow[] = filteredData
    .filter((item) => item.media_type?.toUpperCase() !== "GRAND TOTAL")
    .map((item, index) => {
      const mediaType = normalizeMediaType(item.media_type || "");
      return {
        id: `${mediaType.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        mediaType,
        type: "Actual" as const,
        level: 0,
        data: {
          total_net_net_spend: item.total_net_net_spend,
          total_non_addressable_spend: item.total_non_addressable_spend,
          total_addressable_spend: item.total_addressable_spend,
          measured_spend: item.measured_spend,
          measured_spend_pct: item.measured_spend_pct,
          benchmark_equivalent_net_net_spend:
            item.benchmark_equivalent_net_net_spend,
          value_loss: item.value_loss,
          value_loss_pct: item.value_loss_pct,
        },
      };
    });

  // Use GRAND TOTAL from API if available, otherwise calculate totals
  const totals = grandTotalRow
    ? {
      total_net_net_spend: grandTotalRow.total_net_net_spend,
      total_non_addressable_spend: grandTotalRow.total_non_addressable_spend,
      total_addressable_spend: grandTotalRow.total_addressable_spend,
      measured_spend: grandTotalRow.measured_spend,
      measured_spend_pct: grandTotalRow.measured_spend_pct,
      benchmark_equivalent_net_net_spend:
        grandTotalRow.benchmark_equivalent_net_net_spend,
      value_loss: grandTotalRow.value_loss,
      value_loss_pct: grandTotalRow.value_loss_pct,
    }
    : {
      total_net_net_spend: tableRows.reduce(
        (sum, row) => sum + (row.data.total_net_net_spend || 0),
        0,
      ),
      total_non_addressable_spend: tableRows.reduce(
        (sum, row) => sum + (row.data.total_non_addressable_spend || 0),
        0,
      ),
      total_addressable_spend: tableRows.reduce(
        (sum, row) => sum + (row.data.total_addressable_spend || 0),
        0,
      ),
      measured_spend: tableRows.reduce(
        (sum, row) => sum + (row.data.measured_spend || 0),
        0,
      ),
      measured_spend_pct: null,
      benchmark_equivalent_net_net_spend: tableRows.reduce(
        (sum, row) =>
          sum + (row.data.benchmark_equivalent_net_net_spend || 0),
        0,
      ),
      value_loss: tableRows.reduce(
        (sum, row) => sum + (row.data.value_loss || 0),
        0,
      ),
      value_loss_pct: null,
    };

  tableRows.push({
    id: "total",
    mediaType: "Total",
    type: "Actual",
    level: 0,
    data: totals,
  });

  return tableRows;
}

// Note: Kering-specific transform functions have been moved to lib/clients/transforms.ts
// and are now handled by the generic transformDataWithConfig function via useTableViewData hook

// ============================================================================
// Component
// ============================================================================

export function DataTableView({
  selectedClient,
  selectedDataSource,
  selectedMarket = "",
  onDataChange,
  selectedGraphsForPPT = new Set(),
  onToggleGraphForPPT,
}: DataTableViewProps) {
  const [columns, setColumns] = useState<TableColumn[]>(SUMMARY_COLUMNS);
  const [showColumnControl, setShowColumnControl] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Local state for filters not in TopBar
  // For Kering: sheetType can be "ytd" (All Brand Summary) or a brand name
  // For others: sheetType is "ytd" or "fyfc"
  const [sheetType, setSheetType] = useState<string>("ytd");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [trackerPeriodFilter, setTrackerPeriodFilter] = useState<string>(""); // Initialized from client config in useEffect
  const [isSheetTypeOpen, setIsSheetTypeOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isPeriodFilterOpen, setIsPeriodFilterOpen] = useState(false);

  // Get client-specific configuration
  const clientSlug = selectedClient?.toLowerCase() || "";
  const clientBrands = useMemo(() => getClientBrands(clientSlug), [clientSlug]);
  const clientHasBrandsTrackers = useMemo(() => clientHasBrandsIn(clientSlug, "trackers"), [clientSlug]);

  // Check if current sheetType is a brand (for Summary)
  const isBrandSelected = clientBrands.includes(sheetType);
  const selectedBrand = isBrandSelected ? sheetType : undefined;

  // Check if selectedPeriod is a brand name for trackers (defined early for column selection)
  const isTrackerBrandSelected =
    clientHasBrandsTrackers &&
    selectedDataSource === "trackers" &&
    clientBrands.includes(selectedPeriod);
  const selectedTrackerBrand = isTrackerBrandSelected
    ? selectedPeriod
    : undefined;

  // PPT state - unique ID based on data source and filters
  const tableId = useMemo(() => {
    if (selectedDataSource === "summary") {
      return `data-table-summary-${sheetType}`;
    }
    if (selectedDataSource === "trackers") {
      return `data-table-tracker-${selectedMarket}-${selectedPeriod}`;
    }
    return "data-table-main";
  }, [selectedDataSource, sheetType, selectedMarket, selectedPeriod]);

  const isTableInPPT = useMemo(() => {
    if (selectedGraphsForPPT instanceof Set) {
      return selectedGraphsForPPT.has(tableId);
    }
    if (Array.isArray(selectedGraphsForPPT)) {
      return selectedGraphsForPPT.includes(tableId);
    }
    return false;
  }, [selectedGraphsForPPT, tableId]);

  const handleToggleTableForPPT = () => {
    if (onToggleGraphForPPT && tableContainerRef.current) {
      const tableTitle = getTableTitle();
      onToggleGraphForPPT(tableId, tableTitle, tableContainerRef.current);
    }
  };

  const clientId = selectedClient
    ? getClientIdByName(selectedClient)
    : undefined;

  // Check if client has custom table view config
  const clientTableView = useMemo(() => getClientTableView(clientSlug), [clientSlug]);
  const hasClientConfig = clientTableView !== null;

  // Config-driven UI settings
  const summaryDefaultView = clientTableView?.summary?.defaultView || "ytd";
  const summaryDefaultViewLabel = clientTableView?.summary?.defaultViewLabel || "YTD Summary";
  const summarySheetTypes = clientTableView?.summary?.sheetTypes || [
    { code: "ytd", name: "YTD Summary" },
    { code: "fyfc", name: "FYFC Summary" },
  ];
  const trackerDefaultView = clientTableView?.trackers?.defaultView;
  const trackerDefaultViewLabel = clientTableView?.trackers?.defaultViewLabel || "Detailed Summary";
  const hasPeriodFilter = clientTableView?.trackers?.hasPeriodFilter || false;
  const periodFilterConfig = clientTableView?.trackers?.periodFilter;

  // Check if client uses custom API endpoints
  const useCustomApi = clientTableView?.api?.useCustomEndpoints || false;

  // Use the generic table view data hook for clients with custom API
  const {
    rows: customApiRows,
    isLoading: isCustomApiLoading,
    lastUpdated: customApiLastUpdated,
    refetch: refetchCustomApi,
    noJobFound: customApiNoJobFound,
  } = useTableViewData({
    clientName: useCustomApi ? selectedClient : undefined, // Only use hook for custom API clients
    dataSource: selectedDataSource,
    sheetType,
    selectedPeriod,
    selectedMarket,
    periodFilter: trackerPeriodFilter,
  });


  // Update columns based on data source and client config
  useEffect(() => {
    // Try to get columns from client config first
    if (hasClientConfig && selectedDataSource === "summary") {
      // Pass sheetType for variant-specific columns (e.g., "meu" for Carlsberg)
      const summaryColumns = getClientSummaryColumns(clientSlug, sheetType);
      if (summaryColumns) {
        setColumns(configsToTableColumns(summaryColumns) || SUMMARY_COLUMNS);
        return;
      }
    }

    if (hasClientConfig && selectedDataSource === "trackers") {
      const trackerColumns = getClientTrackerColumns(clientSlug, isTrackerBrandSelected);
      if (trackerColumns) {
        setColumns(configsToTableColumns(trackerColumns) || TRACKER_COLUMNS);
        return;
      }
    }

    // Fall back to default columns
    if (selectedDataSource === "trackers") {
      setColumns(TRACKER_COLUMNS);
    } else {
      setColumns(SUMMARY_COLUMNS);
    }
  }, [
    selectedDataSource,
    clientSlug,
    hasClientConfig,
    isBrandSelected,
    isTrackerBrandSelected,
    sheetType,
  ]);

  // Reset sheetType and trackerPeriodFilter when client changes
  useEffect(() => {
    // Use config-driven default sheet type
    setSheetType(summaryDefaultView);
    // Reset tracker period filter to client's default
    const defaultPeriodFilter = periodFilterConfig?.defaultPeriod || "Jan";
    setTrackerPeriodFilter(defaultPeriodFilter);
  }, [selectedClient, periodFilterConfig?.defaultPeriod, summaryDefaultView]);

  // Auto-select default period/brand when trackers is selected and market is chosen
  useEffect(() => {
    if (
      selectedDataSource === "trackers" &&
      selectedMarket &&
      !selectedPeriod
    ) {
      // Use config-driven default view, fallback to "Jan" for clients without config
      const defaultView = trackerDefaultView || "Jan";
      setSelectedPeriod(defaultView);
    }
  }, [selectedDataSource, selectedMarket, selectedPeriod, trackerDefaultView]);

  // Query: Fetch latest job ID (for summary)
  const {
    data: latestJob,
    isError: isLatestJobError,
  } = useQuery({
    queryKey: tableDataKeys.latestJob(selectedClient || ""),
    queryFn: () => fetchLatestJob(selectedClient!),
    enabled: Boolean(selectedClient && selectedDataSource === "summary"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: false, // Don't retry on 404
  });

  const jobId = latestJob?.consolidation_job_id || "";
  // For custom API clients, use the hook's noJobFound; for others use local check
  const noJobFound = useCustomApi
    ? customApiNoJobFound
    : (isLatestJobError && selectedDataSource === "summary");

  // Query: Fetch Summary data (for default clients - non-custom API)
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    dataUpdatedAt: summaryUpdatedAt,
  } = useQuery({
    queryKey: tableDataKeys.summary(selectedClient || "", jobId, sheetType),
    queryFn: () =>
      fetchConsolidatedSummary({
        clientName: selectedClient!,
        consolidationJobId: jobId,
        sheetType: sheetType as "ytd" | "fyfc",
        fields: SUMMARY_FIELDS,
      }),
    enabled: Boolean(
      selectedClient && selectedDataSource === "summary" && jobId && !useCustomApi,
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes - data can be cached
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // Keep previous data while loading
    retry: 2,
  });

  // Note: Kering-specific summary queries have been moved to useTableViewData hook

  // Query: Fetch Tracker data (for default clients - non-custom API)
  const {
    data: trackerData,
    isLoading: isTrackerLoading,
    refetch: refetchTracker,
    dataUpdatedAt: trackerUpdatedAt,
  } = useQuery({
    // Query key only includes market - period filtering is done on frontend
    queryKey: tableDataKeys.tracker(selectedClient || "", selectedMarket),
    queryFn: () =>
      fetchTrackerSummaryData(
        selectedClient!,
        clientId!,
        undefined,
        undefined,
        selectedMarket,
        // Don't pass period - backend doesn't support it, we filter on frontend
      ),
    enabled: Boolean(
      selectedClient &&
      selectedDataSource === "trackers" &&
      selectedMarket &&
      clientId &&
      !useCustomApi, // Disable for custom API clients - they use the hook
    ),
    staleTime: 5 * 60 * 1000, // Cache longer since we filter on frontend
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Note: Kering-specific tracker queries have been moved to useTableViewData hook

  // Transform data to rows (with frontend period filtering for trackers)
  const rows = useMemo(() => {
    // Use custom API hook data for clients with custom endpoints
    if (useCustomApi && customApiRows.length > 0) {
      return customApiRows;
    }

    // Default transforms for clients without custom config
    // Summary data
    if (selectedDataSource === "summary" && summaryData) {
      return transformSummaryData(summaryData);
    }
    // Tracker data
    if (selectedDataSource === "trackers" && trackerData && selectedPeriod) {
      return transformTrackerData(trackerData, selectedPeriod);
    }
    return [];
  }, [
    useCustomApi,
    customApiRows,
    selectedDataSource,
    summaryData,
    trackerData,
    selectedPeriod,
  ]);

  const isLoading = useCustomApi
    ? isCustomApiLoading
    : (selectedDataSource === "summary" && isSummaryLoading) ||
      (selectedDataSource === "trackers" && isTrackerLoading);

  const lastUpdated = useMemo(() => {
    // Use custom API hook's lastUpdated for custom clients
    if (useCustomApi) {
      return customApiLastUpdated;
    }
    // Default clients
    let timestamp: number | undefined;
    if (selectedDataSource === "summary") {
      timestamp = summaryUpdatedAt;
    } else if (selectedDataSource === "trackers") {
      timestamp = trackerUpdatedAt;
    }
    return timestamp ? new Date(timestamp) : null;
  }, [
    useCustomApi,
    customApiLastUpdated,
    selectedDataSource,
    summaryUpdatedAt,
    trackerUpdatedAt,
  ]);

  // Column visibility helpers
  const visibleColumns = useMemo(
    () =>
      columns.filter((col) => col.visible).sort((a, b) => a.order - b.order),
    [columns],
  );

  const frozenColumns = useMemo(
    () => visibleColumns.filter((col) => col.frozen),
    [visibleColumns],
  );

  const scrollableColumns = useMemo(
    () => visibleColumns.filter((col) => !col.frozen),
    [visibleColumns],
  );

  const handleToggleColumn = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col,
      ),
    );
  };

  const handleRefresh = () => {
    if (useCustomApi) {
      refetchCustomApi();
    } else if (selectedDataSource === "summary") {
      refetchSummary();
    } else if (selectedDataSource === "trackers") {
      refetchTracker();
    }
  };

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      const columnIds = visibleColumns.map((col) => col.id);
      onDataChange(columnIds, rows);
    }
  }, [visibleColumns, rows, onDataChange]);

  const getCellValue = (row: TableRow, columnId: string): any => {
    if (columnId === "mediaType") return row.mediaType;
    return row.data[columnId];
  };

  const getRowStyles = (row: TableRow) => {
    const isTotal = row.mediaType === "Total";
    if (isTotal) return "bg-slate-100 font-semibold";
    return "bg-white";
  };

  const getTableTitle = () => {
    if (selectedDataSource === "summary") {
      // Config-driven title for clients with brands
      if (hasClientConfig && clientHasBrandsIn(clientSlug, "summary")) {
        return selectedBrand ? `${selectedBrand} Summary` : summaryDefaultViewLabel;
      }
      // Config-driven title using sheetTypes (e.g., Carlsberg: Overview, MEU)
      const matchedSheetType = summarySheetTypes.find(st => st.code === sheetType);
      if (matchedSheetType) {
        return matchedSheetType.name;
      }
      // Default YTD/FYFC title
      return sheetType === "ytd" ? "YTD Summary" : "FYFC Summary";
    }
    if (selectedDataSource === "trackers") {
      // Config-driven title for clients with brands in trackers
      if (hasClientConfig && clientHasBrandsIn(clientSlug, "trackers")) {
        const title = selectedTrackerBrand
          ? `${selectedTrackerBrand} Tracker`
          : trackerDefaultViewLabel;
        return selectedMarket ? `${title} - ${selectedMarket}` : title;
      }
      // Config-driven title for clients with period filter (no brands) - e.g., Carlsberg
      if (hasClientConfig && hasPeriodFilter) {
        const title = trackerDefaultViewLabel || "Tracker Summary";
        return selectedMarket ? `${title} - ${selectedMarket}` : title;
      }
      // Default tracker title (shows period for non-config clients)
      const parts = ["Tracker Summary"];
      if (selectedMarket) parts.push(selectedMarket);
      if (selectedPeriod) parts.push(selectedPeriod);
      return parts.join(" - ");
    }
    return "Data Table";
  };

  // Check if we need period selection for trackers
  // Clients with trackerDefaultView don't need manual period selection (they auto-select)
  const needsPeriodSelection =
    selectedDataSource === "trackers" &&
    selectedMarket &&
    !selectedPeriod &&
    !trackerDefaultView;

  return (
    <div className="bg-white border-b border-slate-200 overflow-hidden max-w-full">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 font-semibold">{getTableTitle()}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedDataSource === "summary"
              ? "Consolidated summary data"
              : "Tracker summary by media type"}
            {rows.length > 0 && (
              <span className="ml-2 text-slate-400">• {rows.length} rows</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sheet Type Selector (Summary only) - Config-driven */}
          {selectedDataSource === "summary" && (
            <Popover open={isSheetTypeOpen} onOpenChange={setIsSheetTypeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px]">
                  {/* Config-driven: show selected sheet type name */}
                  {hasClientConfig && clientHasBrandsIn(clientSlug, "summary")
                    ? sheetType === summaryDefaultView
                      ? summaryDefaultViewLabel
                      : sheetType
                    : summarySheetTypes.find(st => st.code === sheetType)?.name || sheetType}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {/* Config-driven: clients with brands in summary */}
                  {hasClientConfig && clientHasBrandsIn(clientSlug, "summary") ? (
                    <>
                      {/* Default view option */}
                      <button
                        onClick={() => {
                          setSheetType(summaryDefaultView);
                          setIsSheetTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${sheetType === summaryDefaultView
                          ? "bg-violet-100 text-violet-700"
                          : "hover:bg-slate-100"
                          }`}
                      >
                        {summaryDefaultViewLabel}
                      </button>
                      {/* Brand options */}
                      {clientBrands.length > 0 && (
                        <>
                          <div className="border-t border-slate-100 my-1 pt-1">
                            <p className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide">
                              Brands
                            </p>
                          </div>
                          {clientBrands.map((brand) => (
                            <button
                              key={brand}
                              onClick={() => {
                                setSheetType(brand);
                                setIsSheetTypeOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${sheetType === brand
                                ? "bg-violet-100 text-violet-700"
                                : "hover:bg-slate-100"
                                }`}
                            >
                              {brand}
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Config-driven sheet type options */}
                      {summarySheetTypes.map((st) => (
                        <button
                          key={st.code}
                          onClick={() => {
                            setSheetType(st.code);
                            setIsSheetTypeOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${sheetType === st.code
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                            }`}
                        >
                          {st.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Period/Brand Selector (Trackers only) - Config-driven */}
          {/* Hide this dropdown if client uses hasPeriodFilter without brands (e.g., Carlsberg) */}
          {selectedDataSource === "trackers" && !(hasPeriodFilter && !clientHasBrandsTrackers) && (
            <Popover open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px]">
                  {/* Config-driven: clients with brands in trackers show brand/detailed view */}
                  {hasClientConfig && clientHasBrandsIn(clientSlug, "trackers")
                    ? selectedPeriod === trackerDefaultView || !selectedPeriod
                      ? trackerDefaultViewLabel
                      : selectedPeriod
                    : selectedPeriod
                      ? AVAILABLE_PERIODS.find((p) => p.code === selectedPeriod)
                        ?.name || selectedPeriod
                      : "Select Period"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {/* Config-driven: clients with brands in trackers */}
                  {hasClientConfig && clientHasBrandsIn(clientSlug, "trackers") ? (
                    <>
                      {/* Default view option */}
                      <button
                        onClick={() => {
                          setSelectedPeriod(trackerDefaultView || "detailed");
                          setIsPeriodOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedPeriod === trackerDefaultView || !selectedPeriod
                          ? "bg-violet-100 text-violet-700"
                          : "hover:bg-slate-100"
                          }`}
                      >
                        {trackerDefaultViewLabel}
                      </button>
                      {/* Brand options */}
                      {clientBrands.length > 0 && (
                        <>
                          <div className="border-t border-slate-100 my-1 pt-1">
                            <p className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide">
                              Brands
                            </p>
                          </div>
                          {clientBrands.map((brand) => (
                            <button
                              key={brand}
                              onClick={() => {
                                setSelectedPeriod(brand);
                                setIsPeriodOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedPeriod === brand
                                ? "bg-violet-100 text-violet-700"
                                : "hover:bg-slate-100"
                                }`}
                            >
                              {brand}
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Default period options for clients without brand config */}
                      {AVAILABLE_PERIODS.map((period) => (
                        <button
                          key={period.code}
                          onClick={() => {
                            setSelectedPeriod(period.code);
                            setIsPeriodOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedPeriod === period.code
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                            }`}
                        >
                          {period.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Tracker Period Filter - Config-driven (shown for clients with hasPeriodFilter) */}
          {selectedDataSource === "trackers" && hasPeriodFilter && periodFilterConfig && (
            <Popover open={isPeriodFilterOpen} onOpenChange={setIsPeriodFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px]">
                  {periodFilterConfig.periods.find((p) => p.code === trackerPeriodFilter)?.name || trackerPeriodFilter}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {/* First group of periods */}
                  {periodFilterConfig.firstGroupLabel && (
                    <p className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide">
                      {periodFilterConfig.firstGroupLabel}
                    </p>
                  )}
                  {periodFilterConfig.periods.slice(0, periodFilterConfig.groupSeparatorIndex || periodFilterConfig.periods.length).map((period) => (
                    <button
                      key={period.code}
                      onClick={() => {
                        setTrackerPeriodFilter(period.code);
                        setIsPeriodFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        trackerPeriodFilter === period.code
                          ? "bg-violet-100 text-violet-700"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      {period.name}
                    </button>
                  ))}
                  {/* Second group of periods (if separator defined) */}
                  {periodFilterConfig.groupSeparatorIndex && periodFilterConfig.groupSeparatorIndex < periodFilterConfig.periods.length && (
                    <>
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <p className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide">
                          {periodFilterConfig.secondGroupLabel || "Other"}
                        </p>
                      </div>
                      {periodFilterConfig.periods.slice(periodFilterConfig.groupSeparatorIndex).map((period) => (
                        <button
                          key={period.code}
                          onClick={() => {
                            setTrackerPeriodFilter(period.code);
                            setIsPeriodFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            trackerPeriodFilter === period.code
                              ? "bg-violet-100 text-violet-700"
                              : "hover:bg-slate-100"
                          }`}
                        >
                          {period.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-slate-600"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          {/* Add to PPT Button */}
          {onToggleGraphForPPT && rows.length > 0 && (
            <Button
              variant={isTableInPPT ? "default" : "outline"}
              size="sm"
              onClick={handleToggleTableForPPT}
              className={
                isTableInPPT ? "bg-emerald-600 hover:bg-emerald-700" : ""
              }
            >
              {isTableInPPT ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Added to PPT
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Add to PPT
                </>
              )}
            </Button>
          )}

          {/* Column Control */}
          <Popover open={showColumnControl} onOpenChange={setShowColumnControl}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    Manage Columns
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Toggle column visibility
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-3 py-1.5 px-2 hover:bg-slate-50 rounded"
                    >
                      <Checkbox
                        id={column.id}
                        checked={column.visible}
                        onCheckedChange={() => handleToggleColumn(column.id)}
                        disabled={column.frozen}
                      />
                      <label
                        htmlFor={column.id}
                        className={`flex-1 text-sm cursor-pointer select-none ${column.frozen ? "text-slate-400" : ""
                          }`}
                      >
                        {column.label}
                        {column.frozen && (
                          <span className="ml-1 text-xs text-slate-400">
                            (fixed)
                          </span>
                        )}
                      </label>
                      {column.visible ? (
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table Container */}
      <div className="relative overflow-hidden">
        {!selectedClient || !selectedDataSource ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-slate-500">
                Select a client and data source to view data
              </p>
            </div>
          </div>
        ) : noJobFound ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">
                No consolidation job found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Please run a consolidation for {selectedClient} first
              </p>
            </div>
          </div>
        ) : selectedDataSource === "trackers" && !selectedMarket ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-slate-500">
                Please select a market from the top bar to view tracker data
              </p>
            </div>
          </div>
        ) : needsPeriodSelection ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-slate-500">
                Please select a period to view tracker data
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Use the period dropdown above
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading data...</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-slate-500">No data available</p>
            </div>
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto max-h-[600px] isolate max-w-full relative"
          >
            <table className="w-full border-collapse min-w-max">
              <thead className="sticky top-0 z-20">
                <tr>
                  {frozenColumns.map((column, idx) => (
                    <th
                      key={column.id}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border-b border-slate-200 text-left sticky z-30 left-0"
                      style={{
                        minWidth: "150px",
                        boxShadow:
                          idx === frozenColumns.length - 1
                            ? "2px 0 4px -2px rgba(0,0,0,0.1)"
                            : undefined,
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                  {scrollableColumns.map((column) => (
                    <th
                      key={column.id}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border-b border-slate-200 whitespace-nowrap ${column.align === "right" ? "text-right" : "text-left"
                        }`}
                      style={{ minWidth: "130px" }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowStyles = getRowStyles(row);
                  const isTotal = row.mediaType === "Total";

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${rowStyles}`}
                    >
                      {frozenColumns.map((column, idx) => {
                        const value = getCellValue(row, column.id);
                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-4 py-3 text-sm sticky z-10 left-0 ${rowStyles} ${isTotal ? "font-semibold" : ""
                              }`}
                            style={{
                              minWidth: "150px",
                              boxShadow:
                                idx === frozenColumns.length - 1
                                  ? "2px 0 4px -2px rgba(0,0,0,0.1)"
                                  : undefined,
                            }}
                          >
                            <span
                              className={
                                isTotal ? "text-slate-900" : "text-slate-700"
                              }
                            >
                              {value}
                            </span>
                          </td>
                        );
                      })}
                      {scrollableColumns.map((column) => {
                        const value = getCellValue(row, column.id);
                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-4 py-3 text-sm whitespace-nowrap ${column.align === "right"
                              ? "text-right"
                              : "text-left"
                              } ${isTotal
                                ? "font-semibold text-slate-900"
                                : "text-slate-600"
                              }`}
                          >
                            {formatCellValue(value, column.type)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {rows.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>
            {rows.length} rows •{" "}
            {scrollableColumns.length + frozenColumns.length} columns
          </span>
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      )}
    </div>
  );
}
