import type { TableViewConfig, TableColumnConfig, PeriodOption } from "../types";

// ============================================
// PERIODS (for tracker filtering)
// ============================================

export const carlsbergTrackerPeriods: PeriodOption[] = [
  // Summary periods - these match API summary_type values
  { code: "FullYear", name: "Full Year" },
  // YTD Monthly periods - these match API summary_type values like "YTD_Jan"
  { code: "YTD_Jan", name: "YTD January" },
  { code: "YTD_Feb", name: "YTD February" },
  { code: "YTD_Mar", name: "YTD March" },
  { code: "YTD_Apr", name: "YTD April" },
  { code: "YTD_May", name: "YTD May" },
  { code: "YTD_Jun", name: "YTD June" },
  { code: "YTD_Jul", name: "YTD July" },
  { code: "YTD_Aug", name: "YTD August" },
  { code: "YTD_Sep", name: "YTD September" },
  { code: "YTD_Oct", name: "YTD October" },
  { code: "YTD_Nov", name: "YTD November" },
  { code: "YTD_Dec", name: "YTD December" },
];

// ============================================
// COLUMN DEFINITIONS
// ============================================

// Tracker Summary columns (from tracker/summary endpoint)
// Note: First column uses "mediaType" as ID to match TableRow structure
export const carlsbergTrackerSummaryColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Media/Category", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_net_net_spend", label: "Total (Net Net) Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "measured_net_net_spend", label: "Measured (Net Net) Spend", type: "currency", align: "right", visible: true, order: 2 },
  { id: "non_measured_net_net_spend", label: "Non-Measured (Net Net) Spend", type: "currency", align: "right", visible: true, order: 3 },
  { id: "measured_spend_pct", label: "Measured Spend %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "net_net_cpu", label: "Net Net CPU", type: "currency", align: "right", visible: true, order: 5 },
  { id: "cpu_index", label: "CPU Index", type: "number", align: "right", visible: true, order: 6 },
  { id: "actual_units", label: "Actual Units", type: "number", align: "right", visible: true, order: 7 },
  { id: "savings", label: "Savings", type: "currency", align: "right", visible: true, order: 8 },
  { id: "savings_pct", label: "Savings %", type: "percentage", align: "right", visible: true, order: 9 },
];

// Consolidated Overview columns (from consolidated/overview endpoint)
// Shows one row per market (filtered to TOTAL media)
export const carlsbergConsolidatedOverviewColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Market", type: "text", align: "left", visible: true, order: 0, frozen: true },
  // Full Year section
  { id: "fy_actual_media_expenditure", label: "FY Actual Media Expenditure", type: "currency", align: "right", visible: true, order: 1 },
  { id: "fy_yoy_comparable_media_expenditure", label: "FY YoY Comparable", type: "currency", align: "right", visible: true, order: 2 },
  { id: "fy_measured_spend_pct", label: "FY Measured Spend %", type: "percentage", align: "right", visible: true, order: 3 },
  { id: "fy_savings_delivery", label: "FY Savings Delivery", type: "currency", align: "right", visible: true, order: 4 },
  { id: "fy_value_achievement", label: "FY Value Achievement %", type: "percentage", align: "right", visible: true, order: 5 },
  // YTD section
  { id: "ytd_total_ytd_media_expenditure", label: "YTD Total Media Expenditure", type: "currency", align: "right", visible: true, order: 6 },
  { id: "ytd_affectable_spend", label: "YTD Affectable Spend", type: "currency", align: "right", visible: true, order: 7 },
  { id: "ytd_yoy_comparable_media_expenditure", label: "YTD YoY Comparable", type: "currency", align: "right", visible: true, order: 8 },
  { id: "ytd_measured_spend_pct", label: "YTD Measured Spend %", type: "percentage", align: "right", visible: true, order: 9 },
  { id: "ytd_savings_delivery_vs_adjusted_pitch_grid_for_inflation", label: "YTD Savings Delivery", type: "currency", align: "right", visible: true, order: 10 },
  { id: "ytd_value_achievement", label: "YTD Value Achievement %", type: "percentage", align: "right", visible: true, order: 11 },
  // Inflation section
  { id: "inflation_media_inflation_pct", label: "Media Inflation %", type: "percentage", align: "right", visible: true, order: 12 },
  { id: "inflation_cost_avoidance_ytd", label: "Cost Avoidance YTD", type: "currency", align: "right", visible: true, order: 13 },
  { id: "inflation_cost_avoidance_fy", label: "Cost Avoidance FY", type: "currency", align: "right", visible: true, order: 14 },
];

// Consolidated MEU columns (from consolidated/meu endpoint)
// Shows one row per market
export const carlsbergConsolidatedMEUColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Market", type: "text", align: "left", visible: true, order: 0, frozen: true },
  // Budget section
  { id: "total_spend_budgeted", label: "Total Spend Budgeted", type: "currency", align: "right", visible: true, order: 1 },
  // FY projections section
  { id: "fy_total_cost_avoidance", label: "FY Total Cost Avoidance", type: "currency", align: "right", visible: true, order: 2 },
  { id: "fy_total_cost_avoidance_pct", label: "FY Cost Avoidance %", type: "percentage", align: "right", visible: true, order: 3 },
  { id: "fy_projected_spend", label: "FY Projected Spend", type: "currency", align: "right", visible: true, order: 4 },
  { id: "fy_projected_measured_spend", label: "FY Projected Measured Spend", type: "currency", align: "right", visible: true, order: 5 },
  { id: "measured_vs_affectable_media_spend_pct", label: "Measured vs Affectable %", type: "percentage", align: "right", visible: true, order: 6 },
  { id: "fy_projected_savings_delivery", label: "FY Projected Savings", type: "currency", align: "right", visible: true, order: 7 },
  { id: "fy_projected_value_achievement_pct", label: "FY Value Achievement %", type: "percentage", align: "right", visible: true, order: 8 },
  // H1 section
  { id: "h1_total_spend", label: "H1 Total Spend", type: "currency", align: "right", visible: true, order: 9 },
  { id: "h1_affectable_spend", label: "H1 Affectable Spend", type: "currency", align: "right", visible: true, order: 10 },
  { id: "h1_measured_spend", label: "H1 Measured Spend", type: "currency", align: "right", visible: true, order: 11 },
  { id: "h1_measured_spend_pct", label: "H1 Measured Spend %", type: "percentage", align: "right", visible: true, order: 12 },
  { id: "h1_savings_delivery", label: "H1 Savings Delivery", type: "currency", align: "right", visible: true, order: 13 },
  { id: "h1_value_achievement_pct", label: "H1 Value Achievement %", type: "percentage", align: "right", visible: true, order: 14 },
  { id: "h1_cost_avoidance_savings", label: "H1 Cost Avoidance Savings", type: "currency", align: "right", visible: true, order: 15 },
  // Quality metrics section
  { id: "tv_prime_time", label: "TV Prime Time %", type: "percentage", align: "right", visible: true, order: 16 },
  { id: "tv_pib", label: "TV PIB %", type: "percentage", align: "right", visible: true, order: 17 },
  { id: "tv_reach", label: "TV Reach %", type: "percentage", align: "right", visible: true, order: 18 },
  { id: "digital_compliance_rate", label: "Digital Compliance %", type: "percentage", align: "right", visible: true, order: 19 },
];

// ============================================
// TABLE VIEW CONFIG
// ============================================

export const carlsbergTableView: TableViewConfig = {
  dataSources: ["summary", "trackers"],

  summary: {
    columns: carlsbergConsolidatedOverviewColumns,
    // Variant-specific columns keyed by sheet type code
    variantColumns: {
      meu: carlsbergConsolidatedMEUColumns,
    },
    sheetTypes: [
      { code: "overview", name: "Overview" },
      { code: "meu", name: "MEU" },
    ],
    // Transform config name for default (overview)
    transformName: "carlsberg:consolidatedOverview",
    // Variant-specific transform names keyed by sheet type code
    variantTransformNames: {
      meu: "carlsberg:consolidatedMEU",
    },
    // Default view
    defaultView: "overview",
    defaultViewLabel: "Overview",
  },

  trackers: {
    detailedColumns: carlsbergTrackerSummaryColumns,
    periods: carlsbergTrackerPeriods,
    defaultPeriod: "FullYear",
    periodField: "summary_type",  // Filter field in API response
    // Transform config names
    transformName: "carlsberg:trackerSummary",
    // Default view
    defaultView: "detailed",
    defaultViewLabel: "Tracker Summary",
    // Period filter dropdown
    hasPeriodFilter: true,
    periodFilter: {
      periods: carlsbergTrackerPeriods,
      defaultPeriod: "FullYear",
      groupSeparatorIndex: 1,  // Split after Full Year
      firstGroupLabel: "Summary",
      secondGroupLabel: "YTD Monthly",
    },
  },

  brands: {
    list: [],  // Carlsberg doesn't have brand breakdown
    inSummary: false,
    inTrackers: false,
  },

  // API configuration - enables generic API flow
  api: {
    useCustomEndpoints: true,
  },
};
