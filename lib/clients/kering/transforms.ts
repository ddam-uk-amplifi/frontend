// ============================================
// KERING-SPECIFIC TRANSFORM CONFIGURATIONS
// ============================================

import type { TransformConfig } from "../transforms";

/**
 * Kering All Brand Summary transform config
 * Data comes from "All Brand summary" sheet - one row per market
 */
export const keringAllBrandSummaryTransform: TransformConfig = {
  groupByField: "market",
  sumFields: [
    "total_spend",
    "addressable_spend",
    "measured_spend",
    "measured_savings",
    "added_value",
  ],
  percentageFieldsToConvert: [
    "measured_spend_pct",
    "measured_savings_pct",
    "added_value_pct",
  ],
  aggregate: false, // Data is already per-market
  includeTotals: true,
  calculatedPercentages: {
    measured_spend_pct: {
      numerator: "measured_spend",
      denominator: "addressable_spend",
    },
    measured_savings_pct: {
      numerator: "measured_savings",
      denominator: "measured_spend",
    },
    added_value_pct: {
      numerator: "added_value",
      denominator: "measured_spend",
    },
  },
};

/**
 * Kering Consolidated Brand Summary transform config
 * Data comes from individual brand sheets - needs aggregation by market
 */
export const keringConsolidatedBrandTransform: TransformConfig = {
  groupByField: "market",
  sumFields: [
    "total_spend",
    "addressable_spend",
    "measured_spend",
    "measured_savings",
    "added_value",
  ],
  aggregate: true, // Need to aggregate by market
  includeTotals: true,
  calculatedPercentages: {
    measured_spend_pct: {
      numerator: "measured_spend",
      denominator: "addressable_spend",
    },
    measured_savings_pct: {
      numerator: "measured_savings",
      denominator: "measured_spend",
    },
    added_value_pct: {
      numerator: "added_value",
      denominator: "measured_spend",
    },
  },
};

/**
 * Kering Tracker Summary transform config
 * Data comes from tracker/summary endpoint - aggregated by media type
 *
 * Note: API returns duplicate media types for aggregates:
 * - DIGITAL appears twice: once as parent of Display/Video/Search, once as Traditional vs Digital split
 * - TRADITIONAL is an aggregate of TV + PRINT + OUTDOOR
 * - We skip these aggregates and use GRAND TOTAL from API for the Total row
 */
export const keringTrackerSummaryTransform: TransformConfig = {
  groupByField: "media_type",
  filterField: "type",
  filterValue: "ALL",
  periodField: "period",
  // Skip TV (no data) and Grand Total (we use it via useGrandTotalFromApi)
  skipValues: [
    "Grand Total",      // Use this for Total row via useGrandTotalFromApi
    "Tv",
    "Tv - Linear",
    "Tv - Vod",
  ],
  // API returns DIGITAL twice: once as parent of Display/Video/Search, once as aggregate
  // Rename the second (aggregate) one to "Digital Total"
  renameSecondOccurrence: { "Digital": "Digital Total" },
  sumFields: [
    "total_net_net_media_spend",
    "total_non_affectable_spend",
    "total_affectable_spend",
    "measured_spend",
    "non_measured_spend",
    "total_savings",
    "measured_savings",
    "inflation_mitigation",
    "added_value_penalty_avoidance",
  ],
  aggregate: true,
  includeTotals: true,
  useGrandTotalFromApi: true,
  grandTotalValue: "Grand Total",
  calculatedPercentages: {
    measured_spend_pct: {
      numerator: "measured_spend",
      denominator: "total_affectable_spend",
    },
    total_savings_pct: {
      numerator: "total_savings",
      denominator: "measured_spend",
    },
    measured_savings_pct: {
      numerator: "measured_savings",
      denominator: "measured_spend",
    },
    added_value_penalty_avoidance_pct: {
      numerator: "added_value_penalty_avoidance",
      denominator: "measured_spend",
    },
  },
};

/**
 * Kering Tracker Brand Summary transform config
 * Data comes from tracker/brand-summary endpoint - aggregated by media type
 */
export const keringTrackerBrandTransform: TransformConfig = {
  groupByField: "media_type",
  filterField: "type",
  filterValue: "ALL",
  periodField: "period",
  // Skip TV (no data) and Grand Total (we use it via useGrandTotalFromApi)
  skipValues: [
    "Grand Total",      // Use this for Total row via useGrandTotalFromApi
    "Tv",
    "Tv - Linear",
    "Tv - Vod",
  ],
  // API returns DIGITAL twice - rename the second one to "Digital Total"
  renameSecondOccurrence: { "Digital": "Digital Total" },
  sumFields: [
    "total_net_net_media_spend",
    "total_non_affectable_spend",
    "total_affectable_spend",
    "measured_spend",
    "total_savings",
    "measured_savings",
    "added_value_penalty_avoidance",
  ],
  aggregate: true,
  includeTotals: true,
  useGrandTotalFromApi: true,
  grandTotalValue: "Grand Total",
  calculatedPercentages: {
    measured_spend_pct: {
      numerator: "measured_spend",
      denominator: "total_affectable_spend",
    },
    total_savings_pct: {
      numerator: "total_savings",
      denominator: "measured_spend",
    },
  },
};

/**
 * Kering transform registry - maps transform names to configs
 * These are registered in the global transform registry
 */
export const keringTransforms: Record<string, TransformConfig> = {
  "kering:allBrandSummary": keringAllBrandSummaryTransform,
  "kering:consolidatedBrand": keringConsolidatedBrandTransform,
  "kering:trackerSummary": keringTrackerSummaryTransform,
  "kering:trackerBrand": keringTrackerBrandTransform,
};
