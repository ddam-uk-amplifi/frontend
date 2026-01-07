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
  fetchKeringAllBrandSummary,
  fetchKeringConsolidatedBrandSummary,
  fetchKeringBrandSummary,
  fetchKeringTrackerSummary,
  type ConsolidatedSummaryResponse,
  type TrackerSummaryItem,
  type KeringAllBrandSummaryItem,
  type KeringConsolidatedBrandSummaryItem,
  type KeringBrandSummaryResponse,
  type KeringTrackerSummaryItem,
  type KeringTrackerSummaryResponse,
} from "@/lib/api/dashboard";
import { getClientIdByName } from "@/lib/clients";

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
    chartData?: Array<{ name: string; [key: string]: any }>,
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

// Kering brand names for dropdown
const KERING_BRANDS = [
  "Alexander McQueen",
  "Balenciaga",
  "Bottega Veneta",
  "Boucheron",
  "Brioni",
  "Dodo",
  "Gucci",
  "Kering Eyewear",
  "Pomellato",
  "Saint Laurent",
  "Kering Corporate",
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

// Columns for Kering All Brand Summary data
const KERING_ALL_BRAND_COLUMNS: TableColumn[] = [
  {
    id: "market",
    label: "Market",
    type: "text",
    align: "left",
    visible: true,
    order: 0,
    frozen: true,
  },
  {
    id: "total_spend",
    label: "Total Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 1,
  },
  {
    id: "addressable_spend",
    label: "Addressable Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 2,
  },
  {
    id: "measured_spend",
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
    id: "measured_savings",
    label: "Measured Savings",
    type: "currency",
    align: "right",
    visible: true,
    order: 5,
  },
  {
    id: "measured_savings_pct",
    label: "Savings %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 6,
  },
  {
    id: "added_value",
    label: "Added Value",
    type: "currency",
    align: "right",
    visible: true,
    order: 7,
  },
  {
    id: "added_value_pct",
    label: "Added Value %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 8,
  },
];

// Columns for Kering Specific Brand Summary data (grouped by media type)
const KERING_BRAND_COLUMNS: TableColumn[] = [
  {
    id: "mediaType",
    label: "Market", // Brand summary data is grouped by market
    type: "text",
    align: "left",
    visible: true,
    order: 0,
    frozen: true,
  },
  {
    id: "total_spend",
    label: "Total Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 1,
  },
  {
    id: "addressable_spend",
    label: "Addressable Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 2,
  },
  {
    id: "measured_spend",
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
    id: "measured_savings",
    label: "Measured Savings",
    type: "currency",
    align: "right",
    visible: true,
    order: 5,
  },
  {
    id: "measured_savings_pct",
    label: "Savings %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 6,
  },
  {
    id: "added_value",
    label: "Added Value",
    type: "currency",
    align: "right",
    visible: true,
    order: 7,
  },
  {
    id: "added_value_pct",
    label: "Added Value %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 8,
  },
];

// Columns for Kering Tracker Brand Summary data (from tracker/brand-summary endpoint)
const KERING_TRACKER_BRAND_COLUMNS: TableColumn[] = [
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
    id: "total_net_net_media_spend",
    label: "Net Net Media Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 1,
  },
  {
    id: "total_affectable_spend",
    label: "Affectable Spend",
    type: "currency",
    align: "right",
    visible: true,
    order: 2,
  },
  {
    id: "measured_spend",
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
    id: "total_savings",
    label: "Total Savings",
    type: "currency",
    align: "right",
    visible: true,
    order: 5,
  },
  {
    id: "total_savings_pct",
    label: "Savings %",
    type: "percentage",
    align: "right",
    visible: true,
    order: 6,
  },
  {
    id: "measured_savings",
    label: "Measured Savings",
    type: "currency",
    align: "right",
    visible: true,
    order: 7,
  },
  {
    id: "added_value_penalty_avoidance",
    label: "Added Value",
    type: "currency",
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
      const mediaType = normalizeMediaType(item.media_type);
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

/**
 * Transform Kering All Brand Summary data to table rows
 * Data is already aggregated per market from the "All Brand summary" sheet
 */
function transformKeringAllBrandSummaryData(
  data: KeringAllBrandSummaryItem[],
): TableRow[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  // Each row is a market - no aggregation needed
  const tableRows: TableRow[] = data.map((item, index) => ({
    id: `market-${item.market?.toLowerCase().replace(/\s+/g, "-") || index}`,
    mediaType: item.market || "Unknown", // Using mediaType field for market name
    type: "Actual" as const,
    level: 0,
    data: {
      market: item.market,
      total_spend: item.total_spend,
      addressable_spend: item.addressable_spend,
      measured_spend: item.measured_spend,
      measured_spend_pct: item.measured_spend_pct
        ? item.measured_spend_pct * 100
        : null, // Convert to percentage
      measured_savings: item.measured_savings,
      measured_savings_pct: item.measured_savings_pct
        ? item.measured_savings_pct * 100
        : null,
      added_value: item.added_value,
      added_value_pct: item.added_value_pct ? item.added_value_pct * 100 : null,
    },
  }));

  // Calculate totals
  const totals = {
    market: "Total",
    total_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.total_spend || 0),
      0,
    ),
    addressable_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.addressable_spend || 0),
      0,
    ),
    measured_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_spend || 0),
      0,
    ),
    measured_spend_pct: 0,
    measured_savings: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_savings || 0),
      0,
    ),
    measured_savings_pct: 0,
    added_value: tableRows.reduce(
      (sum, row) => sum + (row.data.added_value || 0),
      0,
    ),
    added_value_pct: 0,
  };

  // Calculate total percentages
  if (totals.addressable_spend > 0) {
    totals.measured_spend_pct =
      (totals.measured_spend / totals.addressable_spend) * 100;
  }
  if (totals.measured_spend > 0) {
    totals.measured_savings_pct =
      (totals.measured_savings / totals.measured_spend) * 100;
    totals.added_value_pct = (totals.added_value / totals.measured_spend) * 100;
  }

  tableRows.push({
    id: "total",
    mediaType: "Total",
    type: "Actual",
    level: 0,
    data: totals,
  });

  return tableRows;
}

/**
 * Transform Kering Consolidated Brand Summary data to table rows
 * Data is from individual brand sheets, grouped by media type
 */
function transformKeringConsolidatedBrandData(
  data: KeringConsolidatedBrandSummaryItem[],
): TableRow[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  // Brand summary data is grouped by market (not media type)
  // Each row represents a market with aggregated metrics
  const marketGroups: Record<
    string,
    {
      total_spend: number;
      addressable_spend: number;
      measured_spend: number;
      measured_savings: number;
      added_value: number;
    }
  > = {};

  data.forEach((item) => {
    const market = item.market || "Unknown";
    if (!marketGroups[market]) {
      marketGroups[market] = {
        total_spend: 0,
        addressable_spend: 0,
        measured_spend: 0,
        measured_savings: 0,
        added_value: 0,
      };
    }
    marketGroups[market].total_spend += item.total_spend || 0;
    marketGroups[market].addressable_spend += item.addressable_spend || 0;
    marketGroups[market].measured_spend += item.measured_spend || 0;
    marketGroups[market].measured_savings += item.measured_savings || 0;
    marketGroups[market].added_value += item.added_value || 0;
  });

  // Create table rows with calculated percentages
  const tableRows: TableRow[] = Object.entries(marketGroups).map(
    ([market, values]) => ({
      id: market.toLowerCase().replace(/\s+/g, "-"),
      mediaType: market, // Using mediaType field for market name (for chart compatibility)
      type: "Actual" as const,
      level: 0,
      data: {
        total_spend: values.total_spend,
        addressable_spend: values.addressable_spend,
        measured_spend: values.measured_spend,
        measured_spend_pct:
          values.addressable_spend > 0
            ? (values.measured_spend / values.addressable_spend) * 100
            : 0,
        measured_savings: values.measured_savings,
        measured_savings_pct:
          values.measured_spend > 0
            ? (values.measured_savings / values.measured_spend) * 100
            : 0,
        added_value: values.added_value,
        added_value_pct:
          values.measured_spend > 0
            ? (values.added_value / values.measured_spend) * 100
            : 0,
      },
    }),
  );

  // Calculate totals
  const totals = {
    total_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.total_spend || 0),
      0,
    ),
    addressable_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.addressable_spend || 0),
      0,
    ),
    measured_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_spend || 0),
      0,
    ),
    measured_spend_pct: 0,
    measured_savings: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_savings || 0),
      0,
    ),
    measured_savings_pct: 0,
    added_value: tableRows.reduce(
      (sum, row) => sum + (row.data.added_value || 0),
      0,
    ),
    added_value_pct: 0,
  };

  // Calculate total percentages
  if (totals.addressable_spend > 0) {
    totals.measured_spend_pct =
      (totals.measured_spend / totals.addressable_spend) * 100;
  }
  if (totals.measured_spend > 0) {
    totals.measured_savings_pct =
      (totals.measured_savings / totals.measured_spend) * 100;
    totals.added_value_pct = (totals.added_value / totals.measured_spend) * 100;
  }

  tableRows.push({
    id: "total",
    mediaType: "Total",
    type: "Actual",
    level: 0,
    data: totals,
  });

  return tableRows;
}

/**
 * Transform Kering Tracker Brand Summary data to table rows
 * Data is from tracker/brand-summary endpoint, grouped by media type
 */
import type { KeringBrandSummaryItem } from "@/lib/api/dashboard";

function transformKeringTrackerBrandData(
  data: KeringBrandSummaryItem[],
): TableRow[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  // Filter for FY period and ALL type only
  const filteredData = data.filter(
    (item) =>
      item.type === "ALL" &&
      (item.period === "FY" || item.period === "1H" || item.period === "YTD"),
  );

  // Aggregate by media type
  const mediaGroups: Record<
    string,
    {
      total_net_net_media_spend: number;
      total_affectable_spend: number;
      measured_spend: number;
      total_savings: number;
      measured_savings: number;
      added_value_penalty_avoidance: number;
    }
  > = {};

  filteredData.forEach((item) => {
    const mediaType = normalizeMediaType(item.media_type || "Unknown");
    // Skip GRAND TOTAL rows
    if (mediaType === "Grand Total") return;

    if (!mediaGroups[mediaType]) {
      mediaGroups[mediaType] = {
        total_net_net_media_spend: 0,
        total_affectable_spend: 0,
        measured_spend: 0,
        total_savings: 0,
        measured_savings: 0,
        added_value_penalty_avoidance: 0,
      };
    }
    mediaGroups[mediaType].total_net_net_media_spend +=
      item.total_net_net_media_spend || 0;
    mediaGroups[mediaType].total_affectable_spend +=
      item.total_affectable_spend || 0;
    mediaGroups[mediaType].measured_spend += item.measured_spend || 0;
    mediaGroups[mediaType].total_savings += item.total_savings || 0;
    mediaGroups[mediaType].measured_savings += item.measured_savings || 0;
    mediaGroups[mediaType].added_value_penalty_avoidance +=
      item.added_value_penalty_avoidance || 0;
  });

  // Create table rows with calculated percentages
  const tableRows: TableRow[] = Object.entries(mediaGroups).map(
    ([mediaType, values]) => ({
      id: mediaType.toLowerCase().replace(/\s+/g, "-"),
      mediaType,
      type: "Actual" as const,
      level: 0,
      data: {
        total_net_net_media_spend: values.total_net_net_media_spend,
        total_affectable_spend: values.total_affectable_spend,
        measured_spend: values.measured_spend,
        measured_spend_pct:
          values.total_affectable_spend > 0
            ? (values.measured_spend / values.total_affectable_spend) * 100
            : 0,
        total_savings: values.total_savings,
        total_savings_pct:
          values.measured_spend > 0
            ? (values.total_savings / values.measured_spend) * 100
            : 0,
        measured_savings: values.measured_savings,
        added_value_penalty_avoidance: values.added_value_penalty_avoidance,
      },
    }),
  );

  // Calculate totals
  const totals = {
    total_net_net_media_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.total_net_net_media_spend || 0),
      0,
    ),
    total_affectable_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.total_affectable_spend || 0),
      0,
    ),
    measured_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_spend || 0),
      0,
    ),
    measured_spend_pct: 0,
    total_savings: tableRows.reduce(
      (sum, row) => sum + (row.data.total_savings || 0),
      0,
    ),
    total_savings_pct: 0,
    measured_savings: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_savings || 0),
      0,
    ),
    added_value_penalty_avoidance: tableRows.reduce(
      (sum, row) => sum + (row.data.added_value_penalty_avoidance || 0),
      0,
    ),
  };

  // Calculate total percentages
  if (totals.total_affectable_spend > 0) {
    totals.measured_spend_pct =
      (totals.measured_spend / totals.total_affectable_spend) * 100;
  }
  if (totals.measured_spend > 0) {
    totals.total_savings_pct =
      (totals.total_savings / totals.measured_spend) * 100;
  }

  tableRows.push({
    id: "total",
    mediaType: "Total",
    type: "Actual",
    level: 0,
    data: totals,
  });

  return tableRows;
}

/**
 * Transform Kering Tracker Summary data to table rows
 * Data is from tracker/summary endpoint, grouped by media type
 */
function transformKeringTrackerSummaryData(
  data: KeringTrackerSummaryItem[],
): TableRow[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  // Filter for FY period and ALL type only
  const filteredData = data.filter(
    (item) =>
      item.type === "ALL" &&
      (item.period === "FY" || item.period === "1H" || item.period === "YTD"),
  );

  // Aggregate by media type
  const mediaGroups: Record<
    string,
    {
      total_net_net_media_spend: number;
      total_affectable_spend: number;
      measured_spend: number;
      total_savings: number;
      measured_savings: number;
      added_value_penalty_avoidance: number;
    }
  > = {};

  filteredData.forEach((item) => {
    const mediaType = normalizeMediaType(item.media_type || "Unknown");
    // Skip GRAND TOTAL rows
    if (mediaType === "Grand Total") return;

    if (!mediaGroups[mediaType]) {
      mediaGroups[mediaType] = {
        total_net_net_media_spend: 0,
        total_affectable_spend: 0,
        measured_spend: 0,
        total_savings: 0,
        measured_savings: 0,
        added_value_penalty_avoidance: 0,
      };
    }
    mediaGroups[mediaType].total_net_net_media_spend +=
      item.total_net_net_media_spend || 0;
    mediaGroups[mediaType].total_affectable_spend +=
      item.total_affectable_spend || 0;
    mediaGroups[mediaType].measured_spend += item.measured_spend || 0;
    mediaGroups[mediaType].total_savings += item.total_savings || 0;
    mediaGroups[mediaType].measured_savings += item.measured_savings || 0;
    mediaGroups[mediaType].added_value_penalty_avoidance +=
      item.added_value_penalty_avoidance || 0;
  });

  // Create table rows with calculated percentages
  const tableRows: TableRow[] = Object.entries(mediaGroups).map(
    ([mediaType, values]) => ({
      id: mediaType.toLowerCase().replace(/\s+/g, "-"),
      mediaType,
      type: "Actual" as const,
      level: 0,
      data: {
        total_net_net_media_spend: values.total_net_net_media_spend,
        total_affectable_spend: values.total_affectable_spend,
        measured_spend: values.measured_spend,
        measured_spend_pct:
          values.total_affectable_spend > 0
            ? (values.measured_spend / values.total_affectable_spend) * 100
            : 0,
        total_savings: values.total_savings,
        total_savings_pct:
          values.measured_spend > 0
            ? (values.total_savings / values.measured_spend) * 100
            : 0,
        measured_savings: values.measured_savings,
        added_value_penalty_avoidance: values.added_value_penalty_avoidance,
      },
    }),
  );

  // Calculate totals
  const totals = {
    total_net_net_media_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.total_net_net_media_spend || 0),
      0,
    ),
    total_affectable_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.total_affectable_spend || 0),
      0,
    ),
    measured_spend: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_spend || 0),
      0,
    ),
    measured_spend_pct: 0,
    total_savings: tableRows.reduce(
      (sum, row) => sum + (row.data.total_savings || 0),
      0,
    ),
    total_savings_pct: 0,
    measured_savings: tableRows.reduce(
      (sum, row) => sum + (row.data.measured_savings || 0),
      0,
    ),
    added_value_penalty_avoidance: tableRows.reduce(
      (sum, row) => sum + (row.data.added_value_penalty_avoidance || 0),
      0,
    ),
  };

  // Calculate total percentages
  if (totals.total_affectable_spend > 0) {
    totals.measured_spend_pct =
      (totals.measured_spend / totals.total_affectable_spend) * 100;
  }
  if (totals.measured_spend > 0) {
    totals.total_savings_pct =
      (totals.total_savings / totals.measured_spend) * 100;
  }

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
  const [isSheetTypeOpen, setIsSheetTypeOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  // Check if current sheetType is a Kering brand (for Summary)
  const isKeringBrandSelected = KERING_BRANDS.includes(sheetType);
  const selectedBrand = isKeringBrandSelected ? sheetType : undefined;

  // Check if selectedPeriod is a brand name for Kering trackers (defined early for column selection)
  const isKeringTrackerBrandSelected =
    selectedClient?.toLowerCase() === "kering" &&
    selectedDataSource === "trackers" &&
    KERING_BRANDS.includes(selectedPeriod);
  const selectedTrackerBrand = isKeringTrackerBrandSelected
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

  // Check if this is Kering client (defined early for use in effects)
  const isKering = selectedClient?.toLowerCase() === "kering";

  // Update columns based on data source and client
  useEffect(() => {
    if (isKering && selectedDataSource === "summary") {
      if (isKeringBrandSelected) {
        // Kering specific brand - grouped by media type
        setColumns(KERING_BRAND_COLUMNS);
      } else {
        // Kering All Brand Summary - grouped by market
        setColumns(KERING_ALL_BRAND_COLUMNS);
      }
    } else if (isKering && selectedDataSource === "trackers") {
      if (isKeringTrackerBrandSelected) {
        // Kering specific brand tracker - grouped by media type (tracker fields)
        setColumns(KERING_TRACKER_BRAND_COLUMNS);
      } else {
        // Kering Detailed Summary tracker - grouped by media type (same columns as brand)
        setColumns(KERING_TRACKER_BRAND_COLUMNS);
      }
    } else if (selectedDataSource === "trackers") {
      setColumns(TRACKER_COLUMNS);
    } else {
      setColumns(SUMMARY_COLUMNS);
    }
  }, [
    selectedDataSource,
    isKering,
    isKeringBrandSelected,
    isKeringTrackerBrandSelected,
  ]);

  // Reset sheetType when client changes
  useEffect(() => {
    setSheetType("ytd");
  }, [selectedClient]);

  // Auto-select default period/brand when trackers is selected and market is chosen
  useEffect(() => {
    if (
      selectedDataSource === "trackers" &&
      selectedMarket &&
      !selectedPeriod
    ) {
      // For Kering, auto-select "detailed" (Detailed Summary)
      // For others, auto-select "Jan"
      setSelectedPeriod(isKering ? "detailed" : "Jan");
    }
  }, [selectedDataSource, selectedMarket, selectedPeriod, isKering]);

  // Query: Fetch latest job ID (for summary)
  const {
    data: latestJob,
    error: latestJobError,
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
  const noJobFound = isLatestJobError && selectedDataSource === "summary";

  // Query: Fetch Summary data (for non-Kering clients)
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
      selectedClient && selectedDataSource === "summary" && jobId && !isKering,
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes - data can be cached
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // Keep previous data while loading
    retry: 2,
  });

  // Query: Fetch Kering Consolidated Brand Summary data (specific brand from individual brand sheets)
  const {
    data: keringBrandData,
    isLoading: isKeringLoading,
    refetch: refetchKering,
    dataUpdatedAt: keringUpdatedAt,
  } = useQuery({
    queryKey: [
      "kering",
      "consolidatedBrandSummary",
      clientId,
      selectedBrand,
      selectedMarket,
    ],
    queryFn: () =>
      fetchKeringConsolidatedBrandSummary(
        selectedBrand!, // brand name (required)
        selectedMarket || undefined, // market filter
        clientId!, // client ID to find latest consolidation job
      ),
    enabled: Boolean(
      isKering &&
        selectedDataSource === "summary" &&
        clientId &&
        isKeringBrandSelected &&
        selectedBrand,
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Query: Fetch Kering All Brand Summary data (from "All Brand summary" sheet)
  const {
    data: keringAllBrandData,
    isLoading: isKeringAllBrandLoading,
    refetch: refetchKeringAllBrand,
    dataUpdatedAt: keringAllBrandUpdatedAt,
  } = useQuery({
    queryKey: ["kering", "allBrandSummary", clientId, selectedMarket],
    queryFn: () =>
      fetchKeringAllBrandSummary(
        clientId!,
        undefined, // consolidationJobId - let backend find latest
        selectedMarket || undefined, // market filter
      ),
    enabled: Boolean(
      isKering &&
        selectedDataSource === "summary" &&
        clientId &&
        !isKeringBrandSelected,
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Query: Fetch Tracker data (for non-Kering clients)
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
        !isKering, // Disable for Kering - use keringTrackerData instead
    ),
    staleTime: 5 * 60 * 1000, // Cache longer since we filter on frontend
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Query: Fetch Kering Tracker Brand data (specific brand from tracker/brand-summary endpoint)
  const {
    data: keringTrackerBrandData,
    isLoading: isKeringTrackerBrandLoading,
    refetch: refetchKeringTrackerBrand,
    dataUpdatedAt: keringTrackerBrandUpdatedAt,
  } = useQuery({
    queryKey: [
      "kering",
      "trackerBrandSummary",
      clientId,
      selectedTrackerBrand,
      selectedMarket,
    ],
    queryFn: () =>
      fetchKeringBrandSummary(
        clientId!,
        selectedTrackerBrand!, // brand name (required)
        undefined, // period - get all periods
        undefined, // mediaType
        undefined, // type
        undefined, // marketId
        selectedMarket || undefined, // markets
      ),
    enabled: Boolean(
      isKering &&
        selectedDataSource === "trackers" &&
        clientId &&
        selectedMarket &&
        isKeringTrackerBrandSelected &&
        selectedTrackerBrand,
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Query: Fetch Kering Tracker Summary data (Detailed Summary from tracker/summary endpoint)
  const {
    data: keringTrackerAllBrandData,
    isLoading: isKeringTrackerAllBrandLoading,
    refetch: refetchKeringTrackerAllBrand,
    dataUpdatedAt: keringTrackerAllBrandUpdatedAt,
  } = useQuery({
    queryKey: ["kering", "trackerSummary", clientId, selectedMarket],
    queryFn: () =>
      fetchKeringTrackerSummary(
        clientId!,
        undefined, // period - get all periods
        undefined, // mediaType
        undefined, // type
        undefined, // marketId
        selectedMarket || undefined, // markets
      ),
    enabled: Boolean(
      isKering &&
        selectedDataSource === "trackers" &&
        clientId &&
        selectedMarket &&
        !isKeringTrackerBrandSelected,
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Transform data to rows (with frontend period filtering for trackers)
  const rows = useMemo(() => {
    // Kering summary - specific brand (from consolidated/brand-summary)
    if (
      isKering &&
      selectedDataSource === "summary" &&
      isKeringBrandSelected &&
      keringBrandData?.data
    ) {
      return transformKeringConsolidatedBrandData(keringBrandData.data);
    }
    // Kering summary - all brand summary (from consolidated/all-brand-summary)
    if (
      isKering &&
      selectedDataSource === "summary" &&
      !isKeringBrandSelected &&
      keringAllBrandData?.data
    ) {
      return transformKeringAllBrandSummaryData(keringAllBrandData.data);
    }
    // Other clients summary
    if (selectedDataSource === "summary" && summaryData) {
      return transformSummaryData(summaryData);
    }
    // Kering trackers - specific brand (from tracker/brand-summary endpoint)
    if (
      isKering &&
      selectedDataSource === "trackers" &&
      isKeringTrackerBrandSelected &&
      keringTrackerBrandData?.data
    ) {
      return transformKeringTrackerBrandData(keringTrackerBrandData.data);
    }
    // Kering trackers - detailed summary (from tracker/summary endpoint)
    if (
      isKering &&
      selectedDataSource === "trackers" &&
      !isKeringTrackerBrandSelected &&
      keringTrackerAllBrandData?.data
    ) {
      return transformKeringTrackerSummaryData(keringTrackerAllBrandData.data);
    }
    // Other clients trackers
    if (selectedDataSource === "trackers" && trackerData && selectedPeriod) {
      // Filter by period on frontend
      return transformTrackerData(trackerData, selectedPeriod);
    }
    return [];
  }, [
    selectedDataSource,
    summaryData,
    trackerData,
    selectedPeriod,
    isKering,
    isKeringBrandSelected,
    keringBrandData,
    keringAllBrandData,
    isKeringTrackerBrandSelected,
    keringTrackerBrandData,
    keringTrackerAllBrandData,
  ]);

  const isLoading =
    (selectedDataSource === "summary" && !isKering && isSummaryLoading) ||
    (selectedDataSource === "summary" &&
      isKering &&
      isKeringBrandSelected &&
      isKeringLoading) ||
    (selectedDataSource === "summary" &&
      isKering &&
      !isKeringBrandSelected &&
      isKeringAllBrandLoading) ||
    (selectedDataSource === "trackers" && !isKering && isTrackerLoading) ||
    (selectedDataSource === "trackers" &&
      isKering &&
      isKeringTrackerBrandSelected &&
      isKeringTrackerBrandLoading) ||
    (selectedDataSource === "trackers" &&
      isKering &&
      !isKeringTrackerBrandSelected &&
      isKeringTrackerAllBrandLoading);

  const lastUpdated = useMemo(() => {
    let timestamp: number | undefined;
    if (selectedDataSource === "summary") {
      if (isKering) {
        timestamp = isKeringBrandSelected
          ? keringUpdatedAt
          : keringAllBrandUpdatedAt;
      } else {
        timestamp = summaryUpdatedAt;
      }
    } else if (selectedDataSource === "trackers") {
      if (isKering) {
        timestamp = isKeringTrackerBrandSelected
          ? keringTrackerBrandUpdatedAt
          : keringTrackerAllBrandUpdatedAt;
      } else {
        timestamp = trackerUpdatedAt;
      }
    }
    return timestamp ? new Date(timestamp) : null;
  }, [
    selectedDataSource,
    summaryUpdatedAt,
    trackerUpdatedAt,
    isKering,
    isKeringBrandSelected,
    keringUpdatedAt,
    keringAllBrandUpdatedAt,
    isKeringTrackerBrandSelected,
    keringTrackerBrandUpdatedAt,
    keringTrackerAllBrandUpdatedAt,
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
    if (selectedDataSource === "summary") {
      if (isKering) {
        if (isKeringBrandSelected) {
          refetchKering();
        } else {
          refetchKeringAllBrand();
        }
      } else {
        refetchSummary();
      }
    } else if (selectedDataSource === "trackers") {
      if (isKering) {
        if (isKeringTrackerBrandSelected) {
          refetchKeringTrackerBrand();
        } else {
          refetchKeringTrackerAllBrand();
        }
      } else {
        refetchTracker();
      }
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
      if (isKering) {
        return selectedBrand ? `${selectedBrand} Summary` : "All Brand Summary";
      }
      return sheetType === "ytd" ? "YTD Summary" : "FYFC Summary";
    }
    if (selectedDataSource === "trackers") {
      if (isKering) {
        const title = selectedTrackerBrand
          ? `${selectedTrackerBrand} Tracker`
          : "Detailed Summary";
        return selectedMarket ? `${title} - ${selectedMarket}` : title;
      }
      const parts = ["Tracker Summary"];
      if (selectedMarket) parts.push(selectedMarket);
      if (selectedPeriod) parts.push(selectedPeriod);
      return parts.join(" - ");
    }
    return "Data Table";
  };

  // Check if we need period selection for trackers (not for Kering - auto-selects "detailed")
  const needsPeriodSelection =
    selectedDataSource === "trackers" &&
    selectedMarket &&
    !selectedPeriod &&
    !isKering;

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
          {/* Sheet Type Selector (Summary only) - Different options for Kering */}
          {selectedDataSource === "summary" && (
            <Popover open={isSheetTypeOpen} onOpenChange={setIsSheetTypeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px]">
                  {selectedClient?.toLowerCase() === "kering"
                    ? sheetType === "ytd"
                      ? "All Brand Summary"
                      : sheetType
                    : sheetType === "ytd"
                      ? "YTD"
                      : "FYFC"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedClient?.toLowerCase() === "kering" ? (
                    <>
                      {/* Kering-specific options */}
                      <button
                        onClick={() => {
                          setSheetType("ytd");
                          setIsSheetTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          sheetType === "ytd"
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        All Brand Summary
                      </button>
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <p className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide">
                          Brands
                        </p>
                      </div>
                      {KERING_BRANDS.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => {
                            setSheetType(brand as any);
                            setIsSheetTypeOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            sheetType === brand
                              ? "bg-violet-100 text-violet-700"
                              : "hover:bg-slate-100"
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {/* Default YTD/FYFC options */}
                      <button
                        onClick={() => {
                          setSheetType("ytd");
                          setIsSheetTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          sheetType === "ytd"
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        YTD Summary
                      </button>
                      <button
                        onClick={() => {
                          setSheetType("fyfc");
                          setIsSheetTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          sheetType === "fyfc"
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        FYFC Summary
                      </button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Period/Brand Selector (Trackers only) - Different options for Kering */}
          {selectedDataSource === "trackers" && (
            <Popover open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px]">
                  {isKering
                    ? selectedPeriod === "detailed" || !selectedPeriod
                      ? "Detailed Summary"
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
                  {isKering ? (
                    <>
                      {/* Kering-specific options for trackers */}
                      <button
                        onClick={() => {
                          setSelectedPeriod("detailed");
                          setIsPeriodOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          selectedPeriod === "detailed" || !selectedPeriod
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        Detailed Summary
                      </button>
                      <div className="border-t border-slate-100 my-1 pt-1">
                        <p className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide">
                          Brands
                        </p>
                      </div>
                      {KERING_BRANDS.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => {
                            setSelectedPeriod(brand);
                            setIsPeriodOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            selectedPeriod === brand
                              ? "bg-violet-100 text-violet-700"
                              : "hover:bg-slate-100"
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {/* Default period options */}
                      {AVAILABLE_PERIODS.map((period) => (
                        <button
                          key={period.code}
                          onClick={() => {
                            setSelectedPeriod(period.code);
                            setIsPeriodOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            selectedPeriod === period.code
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
