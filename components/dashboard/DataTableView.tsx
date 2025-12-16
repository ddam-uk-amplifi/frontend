"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Settings2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

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
  frozen?: boolean; // For sticky columns
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

interface ApiDataItem {
  media_type: string;
  net_net: number | null;
  addressable: number | null;
  non_addressable: number | null;
  [key: string]: any;
}

interface DataTableViewProps {
  selectedClient?: string;
  onVisualizationRequest?: (columns: string[], rows: TableRow[]) => void;
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

const DEFAULT_COLUMNS: TableColumn[] = [
  { id: "mediaType", label: "Media Type", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "type", label: "Type", type: "text", align: "left", visible: true, order: 1, frozen: true },
  { id: "mediaNet", label: "Media Net", type: "currency", align: "right", visible: true, order: 2 },
  { id: "netNet", label: "Net Net", type: "currency", align: "right", visible: true, order: 3 },
  { id: "shareOfSpend", label: "Share of Spend %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "addressable", label: "Addressable", type: "currency", align: "right", visible: true, order: 5 },
  { id: "nonAddressable", label: "Non-addressable", type: "currency", align: "right", visible: true, order: 6 },
  { id: "auditShare", label: "Audit Share %", type: "percentage", align: "right", visible: true, order: 7 },
  { id: "audited", label: "Audited", type: "currency", align: "right", visible: true, order: 8 },
  { id: "nonAudited", label: "Non Audited", type: "currency", align: "right", visible: true, order: 9 },
  { id: "netAddressable", label: "Net Addressable", type: "currency", align: "right", visible: true, order: 10 },
  { id: "netNonAddressable", label: "Net Non Addressable", type: "currency", align: "right", visible: true, order: 11 },
  { id: "gNetNet", label: "G Net Net", type: "currency", align: "right", visible: true, order: 12 },
];

// ============================================================================
// Data Transformation Utilities
// ============================================================================

function createEmptyRowData(): Record<string, any> {
  return {
    netNet: null,
    addressable: null,
    nonAddressable: null,
    mediaNet: null,
    shareOfSpend: null,
    auditShare: null,
    audited: null,
    nonAudited: null,
    netAddressable: null,
    netNonAddressable: null,
    gNetNet: null,
  };
}

function transformApiDataToRows(apiData: { data?: ApiDataItem[] }): TableRow[] {
  if (!apiData.data || apiData.data.length === 0) {
    return [];
  }

  const transformedRows: TableRow[] = [];
  const mediaTypeMap: Record<string, ApiDataItem[]> = {};

  // Group data by media type
  apiData.data.forEach((item: ApiDataItem) => {
    if (!mediaTypeMap[item.media_type]) {
      mediaTypeMap[item.media_type] = [];
    }
    mediaTypeMap[item.media_type].push(item);
  });

  // Create rows for each media type (Actual + Planned)
  Object.entries(mediaTypeMap).forEach(([mediaType, items]) => {
    // Aggregate totals from all periods for this media type
    const totals = items.reduce(
      (acc, item) => ({
        netNet: (acc.netNet || 0) + (item.net_net || 0),
        addressable: (acc.addressable || 0) + (item.addressable || 0),
        nonAddressable: (acc.nonAddressable || 0) + (item.non_addressable || 0),
      }),
      { netNet: 0, addressable: 0, nonAddressable: 0 }
    );

    // Actual row (from API data)
    transformedRows.push({
      id: `${mediaType.toLowerCase().replace(/\s+/g, "-")}-actual`,
      mediaType,
      type: "Actual",
      level: 0,
      data: {
        ...createEmptyRowData(),
        netNet: totals.netNet,
        addressable: totals.addressable,
        nonAddressable: totals.nonAddressable,
      },
    });

    // Planned row (null data - API doesn't provide planned yet)
    transformedRows.push({
      id: `${mediaType.toLowerCase().replace(/\s+/g, "-")}-planned`,
      mediaType,
      type: "Planned",
      level: 0,
      data: createEmptyRowData(),
    });
  });

  // Calculate and add Total rows
  const totalActual = transformedRows
    .filter((row) => row.type === "Actual")
    .reduce(
      (acc, row) => ({
        netNet: (acc.netNet || 0) + (row.data.netNet || 0),
        addressable: (acc.addressable || 0) + (row.data.addressable || 0),
        nonAddressable: (acc.nonAddressable || 0) + (row.data.nonAddressable || 0),
      }),
      { netNet: 0, addressable: 0, nonAddressable: 0 }
    );

  transformedRows.push(
    {
      id: "total-actual",
      mediaType: "Total",
      type: "Actual",
      level: 0,
      data: {
        ...createEmptyRowData(),
        netNet: totalActual.netNet,
        addressable: totalActual.addressable,
        nonAddressable: totalActual.nonAddressable,
      },
    },
    {
      id: "total-planned",
      mediaType: "Total",
      type: "Planned",
      level: 0,
      data: createEmptyRowData(),
    }
  );

  return transformedRows;
}

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
      return `${value.toFixed(1)}%`;
    case "number":
      return value.toLocaleString("en-US");
    default:
      return String(value);
  }
}

// ============================================================================
// Component
// ============================================================================

export function DataTableView({ selectedClient, onDataChange }: DataTableViewProps) {
  const [columns, setColumns] = useState<TableColumn[]>(DEFAULT_COLUMNS);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showColumnControl, setShowColumnControl] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!selectedClient) {
      setRows([]);
      return;
    }

    const clientId = CLIENT_ID_MAP[selectedClient];
    if (!clientId) {
      console.error("Unknown client:", selectedClient);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `/api/v1/client/${selectedClient.toLowerCase()}/default-table`,
        { params: { client_id: clientId } }
      );

      const transformedRows = transformApiDataToRows(response.data);
      setRows(transformedRows);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch default table data:", error);
      toast.error("Failed to load table data");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient]);

  // Fetch on client change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Row filtering
  const visibleRows = useMemo(() => {
    return rows.filter((row) => row.level === 0);
  }, [rows]);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      const columnIds = visibleColumns.map((col) => col.id);
      onDataChange(columnIds, visibleRows);
    }
  }, [visibleColumns, visibleRows, onDataChange]);

  // Get cell value
  const getCellValue = (row: TableRow, columnId: string): any => {
    if (columnId === "mediaType") return row.mediaType;
    if (columnId === "type") return row.type;
    return row.data[columnId];
  };

  // Row styling
  const getRowStyles = (row: TableRow) => {
    const isTotal = row.mediaType === "Total";
    const isPlanned = row.type === "Planned";
    const isActual = row.type === "Actual";

    if (isTotal) return "bg-slate-100 font-semibold";
    if (isPlanned) return "bg-slate-50/50";
    if (isActual) return "bg-white";
    return "bg-white";
  };

  return (
    <div className="bg-white border-b border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 font-semibold">Default Table</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Media spend overview by type
            {visibleRows.length > 0 && (
              <span className="ml-2 text-slate-400">
                • {visibleRows.length} rows
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
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
                  <h4 className="text-sm font-medium text-slate-900">Manage Columns</h4>
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
                          <span className="ml-1 text-xs text-slate-400">(fixed)</span>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading data...</p>
            </div>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-slate-500">
                {selectedClient
                  ? "No data available for this client"
                  : "Select a client to view data"}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] isolate">
            <table className="w-full border-collapse min-w-max">
              {/* Header */}
              <thead className="sticky top-0 z-20">
                <tr>
                  {/* Frozen columns */}
                  {frozenColumns.map((column, idx) => (
                    <th
                      key={column.id}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border-b border-slate-200 text-left sticky z-30 ${
                        idx === 0 ? "left-0" : "left-[120px]"
                      }`}
                      style={{
                        minWidth: idx === 0 ? "120px" : "80px",
                        boxShadow: idx === frozenColumns.length - 1 ? "2px 0 4px -2px rgba(0,0,0,0.1)" : undefined,
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                  {/* Scrollable columns */}
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

              {/* Body */}
              <tbody>
                {visibleRows.map((row) => {
                  const rowStyles = getRowStyles(row);
                  const isTotal = row.mediaType === "Total";

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${rowStyles}`}
                    >
                      {/* Frozen columns */}
                      {frozenColumns.map((column, idx) => {
                        const value = getCellValue(row, column.id);
                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-4 py-3 text-sm sticky z-10 ${
                              idx === 0 ? "left-0" : "left-[120px]"
                            } ${rowStyles} ${isTotal ? "font-semibold" : ""}`}
                            style={{
                              minWidth: idx === 0 ? "120px" : "80px",
                              boxShadow: idx === frozenColumns.length - 1 ? "2px 0 4px -2px rgba(0,0,0,0.1)" : undefined,
                            }}
                          >
                            {column.id === "type" ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  value === "Actual"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {value}
                              </span>
                            ) : (
                              <span className={isTotal ? "text-slate-900" : "text-slate-700"}>
                                {value}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {/* Scrollable columns */}
                      {scrollableColumns.map((column) => {
                        const value = getCellValue(row, column.id);
                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-4 py-3 text-sm whitespace-nowrap ${
                              column.align === "right" ? "text-right" : "text-left"
                            } ${isTotal ? "font-semibold text-slate-900" : "text-slate-600"}`}
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
      {visibleRows.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>
            {visibleRows.length} rows • {scrollableColumns.length + frozenColumns.length} columns
          </span>
          {lastUpdated && (
            <span>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
