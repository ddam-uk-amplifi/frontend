"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Eye, EyeOff, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { toast } from "sonner";
import {
  fetchConsolidatedSummary,
  fetchTrackerSummaryData,
  fetchLatestJob,
  type ConsolidatedSummaryResponse,
  type TrackerSummaryItem,
} from "@/lib/api/dashboard";

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
}

// ============================================================================
// Constants
// ============================================================================

const CLIENT_ID_MAP: Record<string, number> = {
  Arla: 1,
  Carlsberg: 2,
  Kering: 3,
};

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
  { id: "mediaType", label: "Media Type", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_net_net_spend", label: "Net Net Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "total_addressable_net_net_spend", label: "Addressable Spend", type: "currency", align: "right", visible: true, order: 2 },
  { id: "total_net_net_measured", label: "Measured Spend", type: "currency", align: "right", visible: true, order: 3 },
  { id: "measured_spend_pct", label: "Measured %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "savings_value", label: "Savings", type: "currency", align: "right", visible: true, order: 5 },
  { id: "savings_pct", label: "Savings %", type: "percentage", align: "right", visible: true, order: 6 },
  { id: "inflation_pct", label: "Inflation %", type: "percentage", align: "right", visible: true, order: 7 },
  { id: "inflation_migration_pct", label: "Inflation Mitigation", type: "percentage", align: "right", visible: true, order: 8 },
  { id: "inflation_after_migration_pct", label: "Inflation After Mitigation %", type: "percentage", align: "right", visible: true, order: 9 },
];

// Columns for Tracker Summary data
const TRACKER_COLUMNS: TableColumn[] = [
  { id: "mediaType", label: "Media Type", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_net_net_spend", label: "Net Net Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "total_non_addressable_spend", label: "Non-Addressable", type: "currency", align: "right", visible: true, order: 2 },
  { id: "total_addressable_spend", label: "Addressable", type: "currency", align: "right", visible: true, order: 3 },
  { id: "measured_spend", label: "Measured Spend", type: "currency", align: "right", visible: true, order: 4 },
  { id: "measured_spend_pct", label: "Measured %", type: "percentage", align: "right", visible: true, order: 5 },
  { id: "benchmark_equivalent_net_net_spend", label: "Benchmark Spend", type: "currency", align: "right", visible: true, order: 6 },
  { id: "value_loss", label: "Value Loss", type: "currency", align: "right", visible: true, order: 7 },
  { id: "value_loss_pct", label: "Value Loss %", type: "percentage", align: "right", visible: true, order: 8 },
];

// ============================================================================
// Query Keys - for cache management
// ============================================================================

export const tableDataKeys = {
  all: ["tableData"] as const,
  latestJob: (client: string) => [...tableDataKeys.all, "latestJob", client] as const,
  summary: (client: string, jobId: string, sheetType: string) =>
    [...tableDataKeys.all, "summary", client, jobId, sheetType] as const,
  // Tracker key only uses client + market (period filtering is done on frontend)
  tracker: (client: string, market: string) =>
    [...tableDataKeys.all, "tracker", client, market] as const,
};

// ============================================================================
// Value Formatting
// ============================================================================

function formatCellValue(value: any, type: string): string {
  if (value === null || value === undefined) return "—";

  switch (type) {
    case "currency":
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
    totals[field] = tableRows.reduce((sum, row) => sum + (row.data[field] || 0), 0);
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

function transformTrackerData(data: TrackerSummaryItem[], selectedPeriod?: string): TableRow[] {
  if (!data || data.length === 0) return [];

  // Filter by selected period (frontend filtering since backend doesn't support it)
  const filteredData = selectedPeriod
    ? data.filter((item) => item.period?.toLowerCase() === selectedPeriod.toLowerCase())
    : data;

  if (filteredData.length === 0) return [];

  // Group by normalized media type to handle duplicates with different capitalizations
  const mediaGroups: Record<string, {
    total_net_net_spend: number;
    total_non_addressable_spend: number;
    total_addressable_spend: number;
    measured_spend: number;
    measured_spend_pct: number | null;
    benchmark_equivalent_net_net_spend: number;
    value_loss: number;
    value_loss_pct: number | null;
  }> = {};

  filteredData.forEach((item) => {
    // Skip "GRAND TOTAL" rows from the API
    if (item.media_type?.toUpperCase() === "GRAND TOTAL") return;
    
    const mediaType = normalizeMediaType(item.media_type);
    if (!mediaGroups[mediaType]) {
      mediaGroups[mediaType] = {
        total_net_net_spend: 0,
        total_non_addressable_spend: 0,
        total_addressable_spend: 0,
        measured_spend: 0,
        measured_spend_pct: null,
        benchmark_equivalent_net_net_spend: 0,
        value_loss: 0,
        value_loss_pct: null,
      };
    }
    const group = mediaGroups[mediaType];
    group.total_net_net_spend += item.total_net_net_spend || 0;
    group.total_non_addressable_spend += item.total_non_addressable_spend || 0;
    group.total_addressable_spend += item.total_addressable_spend || 0;
    group.measured_spend += item.measured_spend || 0;
    group.benchmark_equivalent_net_net_spend += item.benchmark_equivalent_net_net_spend || 0;
    group.value_loss += item.value_loss || 0;
    // Percentages can't be summed - we'll recalculate or leave null
  });

  const tableRows: TableRow[] = Object.entries(mediaGroups).map(([mediaType, groupData], index) => ({
    id: `${mediaType.toLowerCase().replace(/\s+/g, "-")}-${index}`,
    mediaType,
    type: "Actual" as const,
    level: 0,
    data: {
      total_net_net_spend: groupData.total_net_net_spend,
      total_non_addressable_spend: groupData.total_non_addressable_spend,
      total_addressable_spend: groupData.total_addressable_spend,
      measured_spend: groupData.measured_spend,
      measured_spend_pct: groupData.measured_spend_pct,
      benchmark_equivalent_net_net_spend: groupData.benchmark_equivalent_net_net_spend,
      value_loss: groupData.value_loss,
      value_loss_pct: groupData.value_loss_pct,
    },
  }));

  const totals = {
    total_net_net_spend: tableRows.reduce((sum, row) => sum + (row.data.total_net_net_spend || 0), 0),
    total_non_addressable_spend: tableRows.reduce((sum, row) => sum + (row.data.total_non_addressable_spend || 0), 0),
    total_addressable_spend: tableRows.reduce((sum, row) => sum + (row.data.total_addressable_spend || 0), 0),
    measured_spend: tableRows.reduce((sum, row) => sum + (row.data.measured_spend || 0), 0),
    measured_spend_pct: null,
    benchmark_equivalent_net_net_spend: tableRows.reduce((sum, row) => sum + (row.data.benchmark_equivalent_net_net_spend || 0), 0),
    value_loss: tableRows.reduce((sum, row) => sum + (row.data.value_loss || 0), 0),
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

// ============================================================================
// Component
// ============================================================================

export function DataTableView({
  selectedClient,
  selectedDataSource,
  selectedMarket = "",
  onDataChange,
}: DataTableViewProps) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<TableColumn[]>(SUMMARY_COLUMNS);
  const [showColumnControl, setShowColumnControl] = useState(false);

  // Local state for filters not in TopBar
  const [sheetType, setSheetType] = useState<"ytd" | "fyfc">("ytd");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const clientId = selectedClient ? CLIENT_ID_MAP[selectedClient] : undefined;

  // Update columns based on data source
  useEffect(() => {
    if (selectedDataSource === "trackers") {
      setColumns(TRACKER_COLUMNS);
    } else {
      setColumns(SUMMARY_COLUMNS);
    }
  }, [selectedDataSource]);

  // Auto-select January when trackers is selected and market is chosen
  useEffect(() => {
    if (selectedDataSource === "trackers" && selectedMarket && !selectedPeriod) {
      setSelectedPeriod("Jan");
    }
  }, [selectedDataSource, selectedMarket, selectedPeriod]);

  // Query: Fetch latest job ID (for summary)
  const { data: latestJob } = useQuery({
    queryKey: tableDataKeys.latestJob(selectedClient || ""),
    queryFn: () => fetchLatestJob(selectedClient!),
    enabled: Boolean(selectedClient && selectedDataSource === "summary"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const jobId = latestJob?.consolidation_job_id || "";

  // Query: Fetch Summary data
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
        sheetType,
        fields: SUMMARY_FIELDS,
      }),
    enabled: Boolean(selectedClient && selectedDataSource === "summary" && jobId),
    staleTime: 2 * 60 * 1000, // 2 minutes - data can be cached
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // Keep previous data while loading
    retry: 2,
  });

  // Query: Fetch Tracker data (fetch all periods, filter on frontend)
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
        selectedMarket
        // Don't pass period - backend doesn't support it, we filter on frontend
      ),
    enabled: Boolean(
      selectedClient &&
        selectedDataSource === "trackers" &&
        selectedMarket &&
        clientId
    ),
    staleTime: 5 * 60 * 1000, // Cache longer since we filter on frontend
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Transform data to rows (with frontend period filtering for trackers)
  const rows = useMemo(() => {
    if (selectedDataSource === "summary" && summaryData) {
      return transformSummaryData(summaryData);
    }
    if (selectedDataSource === "trackers" && trackerData && selectedPeriod) {
      // Filter by period on frontend
      return transformTrackerData(trackerData, selectedPeriod);
    }
    return [];
  }, [selectedDataSource, summaryData, trackerData, selectedPeriod]);

  const isLoading =
    (selectedDataSource === "summary" && isSummaryLoading) ||
    (selectedDataSource === "trackers" && isTrackerLoading);

  const lastUpdated = useMemo(() => {
    const timestamp =
      selectedDataSource === "summary" ? summaryUpdatedAt : trackerUpdatedAt;
    return timestamp ? new Date(timestamp) : null;
  }, [selectedDataSource, summaryUpdatedAt, trackerUpdatedAt]);

  // Column visibility helpers
  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  const frozenColumns = useMemo(
    () => visibleColumns.filter((col) => col.frozen),
    [visibleColumns]
  );

  const scrollableColumns = useMemo(
    () => visibleColumns.filter((col) => !col.frozen),
    [visibleColumns]
  );

  const handleToggleColumn = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleRefresh = () => {
    if (selectedDataSource === "summary") {
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
      return sheetType === "ytd" ? "YTD Summary" : "FYFC Summary";
    }
    if (selectedDataSource === "trackers") {
      const parts = ["Tracker Summary"];
      if (selectedMarket) parts.push(selectedMarket);
      if (selectedPeriod) parts.push(selectedPeriod);
      return parts.join(" - ");
    }
    return "Data Table";
  };

  // Check if we need period selection for trackers
  const needsPeriodSelection =
    selectedDataSource === "trackers" && selectedMarket && !selectedPeriod;

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
          {/* Sheet Type Selector (Summary only) */}
          {selectedDataSource === "summary" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[100px]">
                  {sheetType === "ytd" ? "YTD" : "FYFC"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40" align="end">
                <div className="space-y-1">
                  <button
                    onClick={() => setSheetType("ytd")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      sheetType === "ytd"
                        ? "bg-violet-100 text-violet-700"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    YTD Summary
                  </button>
                  <button
                    onClick={() => setSheetType("fyfc")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      sheetType === "fyfc"
                        ? "bg-violet-100 text-violet-700"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    FYFC Summary
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Period Selector (Trackers only) */}
          {selectedDataSource === "trackers" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[120px]">
                  {selectedPeriod
                    ? AVAILABLE_PERIODS.find((p) => p.code === selectedPeriod)
                        ?.name || selectedPeriod
                    : "Select Period"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {AVAILABLE_PERIODS.map((period) => (
                    <button
                      key={period.code}
                      onClick={() => setSelectedPeriod(period.code)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedPeriod === period.code
                          ? "bg-violet-100 text-violet-700"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      {period.name}
                    </button>
                  ))}
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
                        className={`flex-1 text-sm cursor-pointer select-none ${
                          column.frozen ? "text-slate-400" : ""
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
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] isolate max-w-full relative">
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
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border-b border-slate-200 whitespace-nowrap ${
                        column.align === "right" ? "text-right" : "text-left"
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
                            className={`px-4 py-3 text-sm sticky z-10 left-0 ${rowStyles} ${
                              isTotal ? "font-semibold" : ""
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
                            className={`px-4 py-3 text-sm whitespace-nowrap ${
                              column.align === "right"
                                ? "text-right"
                                : "text-left"
                            } ${
                              isTotal
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
