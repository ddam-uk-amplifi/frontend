import type { ClientConfig } from "../types";

export const keringConfig: ClientConfig = {
  id: 2,
  name: "Kering",
  slug: "kering",
  markets: ["FR", "IT", "US", "UK", "JP", "CN", "KR", "HK"],
  features: {
    hasTrackers: true,
    hasBrandSummary: true,
    hasInflation: true,
    hasDynamicTrackerFields: false,
  },
  // Kering has many brands (11+), so adjust thresholds accordingly
  chartPreferences: {
    preferredChartTypes: ["bar-chart", "table", "grouped-bar"],
    thresholds: {
      highCardinalityThreshold: 20, // More brands than typical client
      maxPieCategories: 10, // Allow more categories in pie
      maxBarCategories: 25,
    },
  },
};
