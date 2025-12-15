"use client";

import { useState, useMemo, useEffect } from "react";
import { Settings2, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

// Define table structure
interface TableColumn {
  id: string;
  label: string;
  type: "text" | "currency" | "percentage" | "number";
  align?: "left" | "right" | "center";
  visible: boolean;
  order: number;
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

// Sample columns matching the reference image
const DEFAULT_COLUMNS: TableColumn[] = [
  { id: "mediaType", label: "Media Type", type: "text", align: "left", visible: true, order: 0 },
  { id: "type", label: "Type", type: "text", align: "left", visible: true, order: 1 },
  { id: "mediaNet", label: "Media Net", type: "currency", align: "right", visible: true, order: 2 },
  { id: "netNet", label: "Net Net", type: "currency", align: "right", visible: true, order: 3 },
  { id: "shareOfSpend", label: "Share of Spend %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "addressable", label: "Addressable", type: "currency", align: "right", visible: true, order: 5 },
  { id: "nonAddressable", label: "Non-addressable", type: "currency", align: "right", visible: true, order: 6 },
  { id: "auditShare", label: "Audit Share %", type: "percentage", align: "right", visible: true, order: 7 },
  { id: "audited", label: "Audited", type: "currency", align: "right", visible: true, order: 8 },
  { id: "nonAudited", label: "Non Audited", type: "currency", align: "right", visible: true, order: 9 },
  { id: "netAddressable", label: "Net Addressable (Audited)", type: "currency", align: "right", visible: true, order: 10 },
  { id: "netNonAddressable", label: "Net Non Addressable (Audited)", type: "currency", align: "right", visible: true, order: 11 },
  { id: "gNetNet", label: "G Net Net", type: "currency", align: "right", visible: true, order: 12 },
];

// Sample data matching the structure
const SAMPLE_DATA: TableRow[] = [
  {
    id: "tv-actual",
    mediaType: "TV",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 39.1,
      addressable: 600723238.88,
      nonAddressable: 600963998.10,
      auditShare: 100,
      audited: 600243648.88,
      nonAudited: 0.00,
      netAddressable: 600723238.88,
      netNonAddressable: 600963998.10,
      mediaNet: 1201447.00,
      netNet: 1201447.00,
      gNetNet: 1201447.00,
    },
  },
  {
    id: "tv-planned",
    mediaType: "TV",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 38.5,
      addressable: 595000000.00,
      nonAddressable: 595000000.00,
      auditShare: 100,
      audited: 595000000.00,
      nonAudited: 0.00,
      netAddressable: 595000000.00,
      netNonAddressable: 595000000.00,
      mediaNet: 1190000.00,
      netNet: 1190000.00,
      gNetNet: 1190000.00,
    },
  },
  {
    id: "digital-actual",
    mediaType: "Digital",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 44.3,
      addressable: 600372068.96,
      nonAddressable: 600372068.96,
      auditShare: 100,
      audited: 600372068.96,
      nonAudited: 0.00,
      netAddressable: 600372068.96,
      netNonAddressable: 600372068.96,
      mediaNet: 1201373.00,
      netNet: 1201373.00,
      gNetNet: 1201373.00,
    },
  },
  {
    id: "digital-planned",
    mediaType: "Digital",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 45.0,
      addressable: 610000000.00,
      nonAddressable: 610000000.00,
      auditShare: 100,
      audited: 610000000.00,
      nonAudited: 0.00,
      netAddressable: 610000000.00,
      netNonAddressable: 610000000.00,
      mediaNet: 1220000.00,
      netNet: 1220000.00,
      gNetNet: 1220000.00,
    },
  },
  {
    id: "ooh-actual",
    mediaType: "OOH",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 9.9,
      addressable: 600152679.11,
      nonAddressable: 600152679.11,
      auditShare: 100,
      audited: 600152679.11,
      nonAudited: 0.00,
      netAddressable: 600152679.11,
      netNonAddressable: 600152679.11,
      mediaNet: 1201305.00,
      netNet: 1201305.00,
      gNetNet: 1201305.00,
    },
  },
  {
    id: "ooh-planned",
    mediaType: "OOH",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 9.5,
      addressable: 145000000.00,
      nonAddressable: 145000000.00,
      auditShare: 100,
      audited: 145000000.00,
      nonAudited: 0.00,
      netAddressable: 145000000.00,
      netNonAddressable: 145000000.00,
      mediaNet: 290000.00,
      netNet: 290000.00,
      gNetNet: 290000.00,
    },
  },
  {
    id: "radio-actual",
    mediaType: "Radio",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 3.6,
      addressable: 60053179.83,
      nonAddressable: 60053179.83,
      auditShare: 100,
      audited: 60053179.83,
      nonAudited: 0.00,
      netAddressable: 60053179.83,
      netNonAddressable: 60053179.83,
      mediaNet: 120107.00,
      netNet: 120107.00,
      gNetNet: 120107.00,
    },
  },
  {
    id: "radio-planned",
    mediaType: "Radio",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 3.5,
      addressable: 55000000.00,
      nonAddressable: 55000000.00,
      auditShare: 100,
      audited: 55000000.00,
      nonAudited: 0.00,
      netAddressable: 55000000.00,
      netNonAddressable: 55000000.00,
      mediaNet: 110000.00,
      netNet: 110000.00,
      gNetNet: 110000.00,
    },
  },
  {
    id: "print-actual",
    mediaType: "Print",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 2.1,
      addressable: 60052488.80,
      nonAddressable: 60052488.80,
      auditShare: 100,
      audited: 60052488.80,
      nonAudited: 0.00,
      netAddressable: 60052488.80,
      netNonAddressable: 60052488.80,
      mediaNet: 120105.00,
      netNet: 120105.00,
      gNetNet: 120105.00,
    },
  },
  {
    id: "print-planned",
    mediaType: "Print",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 2.0,
      addressable: 30000000.00,
      nonAddressable: 30000000.00,
      auditShare: 100,
      audited: 30000000.00,
      nonAudited: 0.00,
      netAddressable: 30000000.00,
      netNonAddressable: 30000000.00,
      mediaNet: 60000.00,
      netNet: 60000.00,
      gNetNet: 60000.00,
    },
  },
  {
    id: "cinema-actual",
    mediaType: "Cinema",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 0.5,
      addressable: 8000000.00,
      nonAddressable: 8000000.00,
      auditShare: 100,
      audited: 8000000.00,
      nonAudited: 0.00,
      netAddressable: 8000000.00,
      netNonAddressable: 8000000.00,
      mediaNet: 16000.00,
      netNet: 16000.00,
      gNetNet: 16000.00,
    },
  },
  {
    id: "cinema-planned",
    mediaType: "Cinema",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 0.5,
      addressable: 7500000.00,
      nonAddressable: 7500000.00,
      auditShare: 100,
      audited: 7500000.00,
      nonAudited: 0.00,
      netAddressable: 7500000.00,
      netNonAddressable: 7500000.00,
      mediaNet: 15000.00,
      netNet: 15000.00,
      gNetNet: 15000.00,
    },
  },
  {
    id: "online-search-actual",
    mediaType: "Online Search",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 0.5,
      addressable: 600716368.89,
      nonAddressable: 600716368.89,
      auditShare: 100,
      audited: 600716368.89,
      nonAudited: 0.00,
      netAddressable: 600716368.89,
      netNonAddressable: 600716368.89,
      mediaNet: 1201433.00,
      netNet: 1201433.00,
      gNetNet: 1201433.00,
    },
  },
  {
    id: "online-search-planned",
    mediaType: "Online Search",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 0.5,
      addressable: 8000000.00,
      nonAddressable: 8000000.00,
      auditShare: 100,
      audited: 8000000.00,
      nonAudited: 0.00,
      netAddressable: 8000000.00,
      netNonAddressable: 8000000.00,
      mediaNet: 16000.00,
      netNet: 16000.00,
      gNetNet: 16000.00,
    },
  },
  {
    id: "total-actual",
    mediaType: "Total",
    type: "Actual",
    level: 0,
    data: {
      shareOfSpend: 100,
      addressable: 6007340485.87,
      nonAddressable: 6006204229.00,
      auditShare: 100,
      audited: 6007340485.87,
      nonAudited: 0.00,
      netAddressable: 6007340485.87,
      netNonAddressable: 6006204229.00,
      mediaNet: 12014681.00,
      netNet: 12014681.00,
      gNetNet: 12014681.00,
    },
  },
  {
    id: "total-planned",
    mediaType: "Total",
    type: "Planned",
    level: 0,
    data: {
      shareOfSpend: 100,
      addressable: 1535500000.00,
      nonAddressable: 1535500000.00,
      auditShare: 100,
      audited: 1535500000.00,
      nonAudited: 0.00,
      netAddressable: 1535500000.00,
      netNonAddressable: 1535500000.00,
      mediaNet: 3071000.00,
      netNet: 3071000.00,
      gNetNet: 3071000.00,
    },
  },
];

interface DataTableViewProps {
  onVisualizationRequest?: (columns: string[], rows: TableRow[]) => void;
  onDataChange?: (columns: string[], rows: TableRow[]) => void;
}

export function DataTableView({ onVisualizationRequest, onDataChange }: DataTableViewProps) {
  const [columns, setColumns] = useState<TableColumn[]>(DEFAULT_COLUMNS);
  const [rows] = useState<TableRow[]>(SAMPLE_DATA);
  const [showColumnControl, setShowColumnControl] = useState(false);

  // Get visible columns sorted by order
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);
  }, [columns]);

  // Toggle column visibility
  const handleToggleColumn = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Format cell value based on type
  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "—";

    switch (type) {
      case "currency":
        return `USD ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "number":
        return value.toLocaleString("en-US");
      default:
        return value;
    }
  };

  // Filter rows based on expansion state
  const visibleRows = useMemo(() => {
    const result: TableRow[] = [];
    const processedIds = new Set<string>();

    rows.forEach((row) => {
      // Only add parent rows or standalone rows
      if (row.level === 0) {
        result.push(row);
        processedIds.add(row.id);

        // If row has children and is expanded, show children
        if (row.hasChildren && row.isExpanded) {
          // Find direct child rows
          const childRows = rows.filter(
            (r) => r.id.startsWith(row.id + "-") && r.level === row.level + 1 && !processedIds.has(r.id)
          );
          childRows.forEach((child) => {
            result.push(child);
            processedIds.add(child.id);
          });
        }
      }
    });

    return result;
  }, [rows]);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      const columnIds = visibleColumns.map((col) => col.id);
      onDataChange(columnIds, visibleRows);
    }
  }, [visibleColumns, visibleRows, onDataChange]);

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Table Controls Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 font-semibold">Data Overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive media spend analysis • {visibleRows.length} rows × {visibleColumns.length} columns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Popover open={showColumnControl} onOpenChange={setShowColumnControl}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Columns ({visibleColumns.length}/{columns.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Manage Columns</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Toggle visibility of columns
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg"
                    >
                      <Checkbox
                        id={column.id}
                        checked={column.visible}
                        onCheckedChange={() => handleToggleColumn(column.id)}
                      />
                      <label
                        htmlFor={column.id}
                        className="flex-1 text-sm cursor-pointer select-none"
                      >
                        {column.label}
                      </label>
                      {column.visible ? (
                        <Eye className="w-4 h-4 text-slate-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Table */}
      <div className="max-h-[600px] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className={`px-4 py-3 text-sm ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                      ? "text-center"
                      : "text-left"
                  } bg-slate-100 border-b border-r border-slate-300 font-medium text-slate-700`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isTotal = row.mediaType === "Total";
              const isPlanned = row.type === "Planned";
              const bgColor = isTotal
                ? "bg-violet-50"
                : isPlanned
                ? "bg-purple-50"
                : "bg-white";

              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${bgColor}`}
                >
                  {visibleColumns.map((column) => {
                    let value;
                    if (column.id === "mediaType") {
                      value = row.mediaType;
                    } else if (column.id === "type") {
                      value = row.type;
                    } else {
                      value = row.data[column.id];
                    }

                    return (
                      <td
                        key={`${row.id}-${column.id}`}
                        className={`px-4 py-3 text-sm border-r border-slate-200 ${
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                            ? "text-center"
                            : "text-left"
                        } ${isTotal ? "font-semibold" : ""}`}
                      >
                        {formatValue(value, column.type)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-sm text-slate-600">
        <div>
          Showing {visibleRows.length} rows with {visibleColumns.length} visible columns
        </div>
        <div className="flex items-center gap-4">
          <span>Data is read-only • Last updated: Dec 15, 2025</span>
        </div>
      </div>
    </div>
  );
}
