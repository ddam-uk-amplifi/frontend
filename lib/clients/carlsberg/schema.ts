import type { FieldGroup, Field } from "../types";

// ============================================
// CARLSBERG FIELD DEFINITIONS
// ============================================

const carlsbergMediaTypes = [
  "Total",
  "Cinema",
  "Online",
  "Events",
  "Outdoor",
  "Print",
  "Radio",
  "TV",
];

const carlsbergCostResultFields: Field[] = [
  { id: "total-net-hold-spend", label: "Total Net Hold Spend" },
  { id: "measured-net-hold-spend", label: "Measured Net Hold Spend" },
  { id: "non-measured-hold-spend", label: "Non Measured Hold Spend" },
  { id: "measured-hold-spend-pct", label: "Measured Hold Spend %" },
  { id: "net-hold-costs-pct", label: "Net Hold COSTS %" },
  { id: "cpa-rate", label: "CPA/Rate" },
  { id: "actual-units", label: "Actual units" },
  { id: "savings", label: "Savings" },
  { id: "savings-pct", label: "Savings %" },
];

const carlsbergMEUFields: Field[] = [
  { id: "total-spend-tracker-fy24-MEU", label: "Total spend Tracker FY24 & MEU" },
  { id: "fy-hold-vs-actual-spend-pct", label: "FY Hold vs Actual Spend %" },
  { id: "fy-projected-spend-MEU", label: "FY Projected Spend & MEU" },
  { id: "fy-hold-vs-projected-spend-pct", label: "FY Hold vs Projected Spend %" },
  { id: "fy-projected-savings-vs-hold", label: "FY Projected Savings (vs Hold)" },
  { id: "fy-MEU-impact-vs-actual-hold", label: "FY MEU Impact vs Actual Hold Spend" },
  { id: "fy-MEU-impact-vs-projected", label: "FY MEU Impact vs Projected Spend" },
  { id: "fy-projected-savings-MEU-only", label: "FY Projected Savings (MEU only vs Hold)" },
  { id: "fy-projected-MEU-achievement", label: "FY Projected MEU Achievement (Actual vs Projected)" },
];

// ============================================
// CARLSBERG SUMMARY SCHEMA
// ============================================

const carlsbergSummaryGroups: FieldGroup[] = [
  {
    id: "carlsberg-total-spends",
    title: "Total Spends",
    fields: carlsbergMediaTypes.map((media) => ({
      id: `carlsberg-spend-${media.toLowerCase()}`,
      label: media,
    })),
  },
  {
    id: "carlsberg-all-market-inflation",
    title: "All Market Inflation",
    fields: carlsbergMediaTypes
      .filter((m) => m !== "Total")
      .map((media) => ({
        id: `carlsberg-inflation-${media.toLowerCase()}`,
        label: media,
      })),
  },
  {
    id: "carlsberg-all-market-cost-result",
    title: "All Market Cost Result",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-cost-${f.id}`,
    })),
  },
  {
    id: "carlsberg-meu",
    title: "MEU",
    fields: carlsbergMEUFields.map((f) => ({
      ...f,
      id: `carlsberg-MEU-${f.id}`,
    })),
  },
  {
    id: "carlsberg-overview",
    title: "Overview",
    fields: [
      { id: "carlsberg-overview-summary", label: "Overview Summary" },
      { id: "carlsberg-overview-highlights", label: "Key Highlights" },
      { id: "carlsberg-overview-performance", label: "Performance Metrics" },
    ],
  },
];

// ============================================
// CARLSBERG TRACKER SCHEMA
// ============================================

/**
 * Create a tracker group for a media type
 */
function createTrackerGroup(mediaType: string, mediaTypeId: string): FieldGroup {
  return {
    id: `carlsberg-tracker-${mediaTypeId}`,
    title: mediaType,
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-${mediaTypeId}-${f.id}`,
    })),
  };
}

const carlsbergTrackerGroups: FieldGroup[] = [
  {
    id: "carlsberg-tracker-summary",
    title: "Summary",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-summary-${f.id}`,
    })),
  },
  createTrackerGroup("TV", "tv"),
  createTrackerGroup("Newspaper", "newspaper"),
  createTrackerGroup("Magazines", "magazines"),
  createTrackerGroup("Radio", "radio"),
  createTrackerGroup("Outdoor", "outdoor"),
  createTrackerGroup("Online", "online"),
  createTrackerGroup("Cinema", "cinema"),
];

// ============================================
// EXPORT SCHEMA
// ============================================

export const schema = {
  summary: carlsbergSummaryGroups,
  trackers: carlsbergTrackerGroups,
};

// Export field definitions for potential reuse
export { carlsbergCostResultFields, carlsbergMEUFields, carlsbergMediaTypes };
