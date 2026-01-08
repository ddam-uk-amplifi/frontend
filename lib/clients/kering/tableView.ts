import type { TableViewConfig, TableColumnConfig } from "../types";
import { keringBrands } from "./schema";

// ============================================
// KERING TABLE VIEW CONFIGURATION
// ============================================

/**
 * Periods available for Kering tracker data filtering
 */
export const keringTrackerPeriods = [
  // Summary periods
  { code: "DECEMBER", name: "December (YTD)" },
  { code: "FY", name: "Full Year" },
  { code: "1H", name: "First Half" },
  { code: "1Q", name: "Q1" },
  { code: "2Q", name: "Q2" },
  { code: "3Q", name: "Q3" },
  { code: "4Q", name: "Q4" },
  // Monthly periods
  { code: "JANUARY", name: "January" },
  { code: "FEBRUARY", name: "February" },
  { code: "MARCH", name: "March" },
  { code: "APRIL", name: "April" },
  { code: "MAY", name: "May" },
  { code: "JUNE", name: "June" },
  { code: "JULY", name: "July" },
  { code: "AUGUST", name: "August" },
  { code: "SEPTEMBER", name: "September" },
  { code: "OCTOBER", name: "October" },
  { code: "NOVEMBER", name: "November" },
];

/**
 * Column definitions for Kering All Brand Summary (Summary data source)
 */
const keringSummaryAllBrandColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Market", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_spend", label: "Total Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "addressable_spend", label: "Addressable Spend", type: "currency", align: "right", visible: true, order: 2 },
  { id: "measured_spend", label: "Measured Spend", type: "currency", align: "right", visible: true, order: 3 },
  { id: "measured_spend_pct", label: "Measured %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "measured_savings", label: "Measured Savings", type: "currency", align: "right", visible: true, order: 5 },
  { id: "measured_savings_pct", label: "Savings %", type: "percentage", align: "right", visible: true, order: 6 },
  { id: "added_value", label: "Added Value", type: "currency", align: "right", visible: true, order: 7 },
  { id: "added_value_pct", label: "Added Value %", type: "percentage", align: "right", visible: true, order: 8 },
];

/**
 * Column definitions for Kering Specific Brand Summary (Summary data source)
 */
const keringSummaryBrandColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Market", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_spend", label: "Total Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "addressable_spend", label: "Addressable Spend", type: "currency", align: "right", visible: true, order: 2 },
  { id: "measured_spend", label: "Measured Spend", type: "currency", align: "right", visible: true, order: 3 },
  { id: "measured_spend_pct", label: "Measured %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "measured_savings", label: "Measured Savings", type: "currency", align: "right", visible: true, order: 5 },
  { id: "measured_savings_pct", label: "Savings %", type: "percentage", align: "right", visible: true, order: 6 },
  { id: "added_value", label: "Added Value", type: "currency", align: "right", visible: true, order: 7 },
  { id: "added_value_pct", label: "Added Value %", type: "percentage", align: "right", visible: true, order: 8 },
];

/**
 * Column definitions for Kering Tracker data (both detailed and brand views)
 */
const keringTrackerColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Media Type", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_net_net_media_spend", label: "Net Net Media Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "total_non_affectable_spend", label: "Non Affectable Spend", type: "currency", align: "right", visible: true, order: 2 },
  { id: "measured_spend", label: "Measured Spend", type: "currency", align: "right", visible: true, order: 3 },
  { id: "non_measured_spend", label: "Non Measured Spend", type: "currency", align: "right", visible: true, order: 4 },
  { id: "total_affectable_spend", label: "Affectable Spend", type: "currency", align: "right", visible: true, order: 5 },
  { id: "measured_spend_pct", label: "Measured %", type: "percentage", align: "right", visible: true, order: 6 },
  { id: "total_savings", label: "Total Savings", type: "currency", align: "right", visible: true, order: 7 },
  { id: "total_savings_pct", label: "Savings %", type: "percentage", align: "right", visible: true, order: 8 },
  { id: "measured_savings", label: "Measured Savings", type: "currency", align: "right", visible: true, order: 9 },
  { id: "measured_savings_pct", label: "Measured Savings %", type: "percentage", align: "right", visible: true, order: 10 },
  { id: "inflation_mitigation", label: "Inflation Mitigation", type: "currency", align: "right", visible: true, order: 11 },
  { id: "added_value_penalty_avoidance", label: "Added Value", type: "currency", align: "right", visible: true, order: 12 },
  { id: "added_value_penalty_avoidance_pct", label: "Added Value %", type: "percentage", align: "right", visible: true, order: 13 },
];

/**
 * Complete table view configuration for Kering
 */
export const keringTableView: TableViewConfig = {
  dataSources: ["summary", "trackers"],

  summary: {
    columns: keringSummaryAllBrandColumns,
    brandColumns: keringSummaryBrandColumns,
    sheetTypes: [
      { code: "ytd", name: "All Brand Summary" },
      // Individual brands are also selectable via the brands config
    ],
    // Transform config names (from lib/clients/transforms.ts registry)
    transformName: "kering:allBrandSummary",
    brandTransformName: "kering:consolidatedBrand",
    // View configuration
    defaultView: "ytd",
    defaultViewLabel: "All Brand Summary",
  },

  trackers: {
    detailedColumns: keringTrackerColumns,
    brandColumns: keringTrackerColumns, // Same columns for brand view
    periods: keringTrackerPeriods,
    defaultPeriod: "DECEMBER",
    periodField: "period",
    // Transform config names (from lib/clients/transforms.ts registry)
    transformName: "kering:trackerSummary",
    brandTransformName: "kering:trackerBrand",
    // View configuration
    defaultView: "detailed",
    defaultViewLabel: "Detailed Summary",
    // Period filter (separate dropdown from view selector)
    hasPeriodFilter: true,
    periodFilter: {
      periods: keringTrackerPeriods,
      defaultPeriod: "DECEMBER",
      groupSeparatorIndex: 7, // Summary periods (0-6), Monthly (7+)
      firstGroupLabel: "Summary Periods",
      secondGroupLabel: "Monthly",
    },
  },

  brands: {
    list: keringBrands,
    inSummary: true,
    inTrackers: true,
  },

  api: {
    useCustomEndpoints: true,
    summary: {
      defaultEndpoint: "kering:allBrandSummary",
      brandEndpoint: "kering:consolidatedBrandSummary",
    },
    trackers: {
      defaultEndpoint: "kering:trackerSummary",
      brandEndpoint: "kering:trackerBrandSummary",
    },
  },

  transforms: {
    typeFilter: "ALL",
    aggregateByMediaType: false, // Display data as-is from API
    percentageFields: [
      "measured_spend_pct",
      "measured_savings_pct",
      "added_value_pct",
      "total_savings_pct",
      "added_value_penalty_avoidance_pct",
    ],
  },
};

// Export individual configs for flexibility
export {
  keringSummaryAllBrandColumns,
  keringSummaryBrandColumns,
  keringTrackerColumns,
};
