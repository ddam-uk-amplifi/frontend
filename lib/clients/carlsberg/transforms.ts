import type { TransformConfig } from "../transforms";

/**
 * Carlsberg Tracker Summary transform
 * Data source: /tracker/summary
 * Groups by media_or_category field
 */
export const carlsbergTrackerSummaryTransform: TransformConfig = {
  groupByField: "media_or_category",
  sumFields: [
    "total_net_net_spend",
    "measured_net_net_spend",
    "non_measured_net_net_spend",
    "net_net_cpu",
    "cpu_index",
    "actual_units",
    "savings",
  ],
  percentageFieldsRaw: [
    "measured_spend_pct",
    "savings_pct",
  ],
  aggregate: false,  // Data is already aggregated by backend
  includeTotals: false,  // Backend provides totals
  skipValues: ["Grand Total", "GRAND TOTAL"],
};

/**
 * Carlsberg Consolidated Overview transform
 * Data source: /consolidated/overview
 * Groups by market field
 */
export const carlsbergConsolidatedOverviewTransform: TransformConfig = {
  groupByField: "market",
  sumFields: [
    "fy_actual_media_expenditure",
    "fy_yoy_comparable_media_expenditure",
    "fy_savings_delivery",
    "ytd_total_ytd_media_expenditure",
    "ytd_affectable_spend",
    "ytd_yoy_comparable_media_expenditure",
    "ytd_savings_delivery_vs_adjusted_pitch_grid_for_inflation",
    "inflation_cost_avoidance_ytd",
    "inflation_cost_avoidance_fy",
  ],
  percentageFieldsRaw: [
    "fy_measured_spend_pct",
    "fy_value_achievement",
    "ytd_measured_spend_pct",
    "ytd_value_achievement",
    "inflation_media_inflation_pct",
  ],
  aggregate: false,  // Pass through as-is
  includeTotals: true,
  calculatedPercentages: {
    fy_measured_spend_pct: {
      numerator: "fy_actual_media_expenditure",
      denominator: "fy_actual_media_expenditure",
    },
    fy_value_achievement: {
      numerator: "fy_savings_delivery",
      denominator: "fy_actual_media_expenditure",
    },
    ytd_measured_spend_pct: {
      numerator: "ytd_affectable_spend",
      denominator: "ytd_total_ytd_media_expenditure",
    },
    ytd_value_achievement: {
      numerator: "ytd_savings_delivery_vs_adjusted_pitch_grid_for_inflation",
      denominator: "ytd_affectable_spend",
    },
  },
};

/**
 * Carlsberg Consolidated MEU transform
 * Data source: /consolidated/meu
 * Groups by market field
 */
export const carlsbergConsolidatedMEUTransform: TransformConfig = {
  groupByField: "market",
  sumFields: [
    "total_spend_budgeted",
    "fy_total_cost_avoidance",
    "fy_projected_spend",
    "fy_projected_measured_spend",
    "fy_projected_savings_delivery",
    "fy1_cost_avoidance_savings",
    "h1_total_spend",
    "h1_total_cost_avoidance",
    "h1_affectable_spend",
    "h1_measured_spend",
    "h1_baseline_equivalent_spend",
    "h1_savings_delivery",
    "h1_cost_avoidance_savings",
    "cost_avoidance_ytd",
    "cost_avoidance_fy",
  ],
  percentageFieldsRaw: [
    "fy_total_cost_avoidance_pct",
    "measured_vs_affectable_media_spend_pct",
    "fy_projected_value_achievement_pct",
    "h1_total_cost_avoidance_pct",
    "h1_measured_spend_pct",
    "h1_value_achievement_pct",
    "tv_prime_time",
    "tv_pib",
    "tv_reach",
    "digital_compliance_rate",
  ],
  aggregate: false,
  includeTotals: true,
  calculatedPercentages: {
    fy_total_cost_avoidance_pct: {
      numerator: "fy_total_cost_avoidance",
      denominator: "total_spend_budgeted",
    },
    measured_vs_affectable_media_spend_pct: {
      numerator: "fy_projected_measured_spend",
      denominator: "fy_projected_spend",
    },
    fy_projected_value_achievement_pct: {
      numerator: "fy_projected_savings_delivery",
      denominator: "fy_projected_measured_spend",
    },
    h1_total_cost_avoidance_pct: {
      numerator: "h1_total_cost_avoidance",
      denominator: "h1_total_spend",
    },
    h1_measured_spend_pct: {
      numerator: "h1_measured_spend",
      denominator: "h1_affectable_spend",
    },
    h1_value_achievement_pct: {
      numerator: "h1_savings_delivery",
      denominator: "h1_measured_spend",
    },
  },
};

/**
 * Client transform registry - export all transforms
 * These will be registered globally in lib/clients/index.ts
 */
export const carlsbergTransforms: Record<string, TransformConfig> = {
  "carlsberg:trackerSummary": carlsbergTrackerSummaryTransform,
  "carlsberg:consolidatedOverview": carlsbergConsolidatedOverviewTransform,
  "carlsberg:consolidatedMEU": carlsbergConsolidatedMEUTransform,
};
