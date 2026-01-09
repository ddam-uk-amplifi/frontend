import type { FieldGroup, Field } from "../types";

// ============================================
// CARLSBERG FIELD DEFINITIONS
// ============================================
// These field IDs map to the API response field names

// Media types available in Carlsberg tracker data
const carlsbergMediaTypes = [
  "Beverage",
  "TV",
  "Newspapers",
  "Magazines",
  "Radio",
  "Outdoor",
  "Online",
  "Cinema",
];

// Tracker Summary fields (matches /tracker/summary API response)
const carlsbergTrackerFields: Field[] = [
  { id: "total_net_net_spend", label: "Total (Net Net) Spend" },
  { id: "measured_net_net_spend", label: "Measured (Net Net) Spend" },
  { id: "non_measured_net_net_spend", label: "Non-Measured (Net Net) Spend" },
  { id: "measured_spend_pct", label: "Measured Spend %" },
  { id: "net_net_cpu", label: "Net Net CPU" },
  { id: "cpu_index", label: "CPU Index" },
  { id: "actual_units", label: "Actual Units" },
  { id: "savings", label: "Savings" },
  { id: "savings_pct", label: "Savings %" },
];

// Consolidated Overview fields (matches /consolidated/overview API response)
const carlsbergOverviewFields: Field[] = [
  { id: "fy_actual_media_expenditure", label: "FY Actual Media Expenditure" },
  { id: "fy_yoy_comparable_media_expenditure", label: "FY YoY Comparable" },
  { id: "fy_measured_spend_pct", label: "FY Measured Spend %" },
  { id: "fy_savings_delivery", label: "FY Savings Delivery" },
  { id: "fy_value_achievement", label: "FY Value Achievement %" },
  { id: "ytd_total_ytd_media_expenditure", label: "YTD Total Media Expenditure" },
  { id: "ytd_affectable_spend", label: "YTD Affectable Spend" },
  { id: "ytd_yoy_comparable_media_expenditure", label: "YTD YoY Comparable" },
  { id: "ytd_measured_spend_pct", label: "YTD Measured Spend %" },
  { id: "ytd_savings_delivery_vs_adjusted_pitch_grid_for_inflation", label: "YTD Savings Delivery" },
  { id: "ytd_value_achievement", label: "YTD Value Achievement %" },
  { id: "inflation_media_inflation_pct", label: "Media Inflation %" },
  { id: "inflation_cost_avoidance_ytd", label: "Cost Avoidance YTD" },
  { id: "inflation_cost_avoidance_fy", label: "Cost Avoidance FY" },
];

// MEU fields (matches /consolidated/meu API response)
const carlsbergMEUFields: Field[] = [
  { id: "total_spend_budgeted", label: "Total Spend Budgeted" },
  { id: "fy_total_cost_avoidance", label: "FY Total Cost Avoidance" },
  { id: "fy_total_cost_avoidance_pct", label: "FY Cost Avoidance %" },
  { id: "fy_projected_spend", label: "FY Projected Spend" },
  { id: "fy_projected_measured_spend", label: "FY Projected Measured Spend" },
  { id: "measured_vs_affectable_media_spend_pct", label: "Measured vs Affectable %" },
  { id: "fy_projected_savings_delivery", label: "FY Projected Savings" },
  { id: "fy_projected_value_achievement_pct", label: "FY Value Achievement %" },
  { id: "h1_total_spend", label: "H1 Total Spend" },
  { id: "h1_savings_delivery", label: "H1 Savings Delivery" },
  { id: "h1_value_achievement_pct", label: "H1 Value Achievement %" },
];

// ============================================
// CARLSBERG SUMMARY SCHEMA
// ============================================

const carlsbergSummaryGroups: FieldGroup[] = [
  {
    id: "carlsberg-overview",
    title: "Overview",
    fields: carlsbergOverviewFields.map((f) => ({
      ...f,
      id: `carlsberg-overview-${f.id}`,
    })),
  },
  {
    id: "carlsberg-meu",
    title: "MEU",
    fields: carlsbergMEUFields.map((f) => ({
      ...f,
      id: `carlsberg-meu-${f.id}`,
    })),
  },
];

// ============================================
// CARLSBERG TRACKER SCHEMA
// ============================================

/**
 * Create a tracker group for a media type
 * Each media type can load dynamic fields from API
 */
function createTrackerGroup(
  mediaType: string,
  mediaTypeId: string,
): FieldGroup {
  return {
    id: `carlsberg-tracker-${mediaTypeId}`,
    title: mediaType,
    fields: carlsbergTrackerFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-${mediaTypeId}-${f.id}`,
    })),
  };
}

const carlsbergTrackerGroups: FieldGroup[] = [
  {
    id: "carlsberg-tracker-summary",
    title: "Summary",
    fields: carlsbergTrackerFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-summary-${f.id}`,
    })),
  },
  createTrackerGroup("TV", "tv"),
  createTrackerGroup("Newspapers", "newspapers"),
  createTrackerGroup("Magazines", "magazines"),
  createTrackerGroup("Radio", "radio"),
  createTrackerGroup("Outdoor", "outdoor"),
  createTrackerGroup("Online", "online"),
  createTrackerGroup("Cinema", "cinema"),
];

/**
 * Media type mapping for Carlsberg tracker API endpoints
 * Maps schema group IDs to API media type values
 */
const CARLSBERG_TRACKER_MEDIA_TYPES: Record<string, string> = {
  "carlsberg-tracker-tv": "tv",
  "carlsberg-tracker-newspapers": "newspapers",
  "carlsberg-tracker-magazines": "magazines",
  "carlsberg-tracker-radio": "radio",
  "carlsberg-tracker-outdoor": "outdoor",
  "carlsberg-tracker-online": "online",
  "carlsberg-tracker-cinema": "cinema",
};

// ============================================
// EXPORT SCHEMA
// ============================================

export const schema = {
  summary: carlsbergSummaryGroups,
  trackers: carlsbergTrackerGroups,
};

// Field ID to backend field name mapping for Carlsberg
// Used to extract the actual API field name from the prefixed field ID
export function mapCarlsbergFieldsToBackend(selectedFields: Record<string, string[]>): string[] {
  const backendFields: string[] = [];

  Object.values(selectedFields).flat().forEach((fieldId) => {
    // Remove the prefix to get the backend field name
    // e.g., "carlsberg-tracker-total_net_net_spend" -> "total_net_net_spend"
    // e.g., "carlsberg-overview-fy_actual_media_expenditure" -> "fy_actual_media_expenditure"
    if (fieldId.startsWith("carlsberg-tracker-")) {
      backendFields.push(fieldId.replace("carlsberg-tracker-", ""));
    } else if (fieldId.startsWith("carlsberg-overview-")) {
      backendFields.push(fieldId.replace("carlsberg-overview-", ""));
    } else if (fieldId.startsWith("carlsberg-meu-")) {
      backendFields.push(fieldId.replace("carlsberg-meu-", ""));
    }
  });

  return backendFields;
}

// Export field definitions for potential reuse
export {
  carlsbergTrackerFields,
  carlsbergOverviewFields,
  carlsbergMEUFields,
  carlsbergMediaTypes,
  CARLSBERG_TRACKER_MEDIA_TYPES,
};
