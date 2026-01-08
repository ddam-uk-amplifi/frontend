// ============================================
// GENERIC DATA TRANSFORM UTILITIES
// ============================================

import type { TableViewConfig, TableColumnConfig } from "./types";

/**
 * Represents a row in the table view
 */
export interface TableRow {
  id: string;
  mediaType: string; // Primary grouping field (can be market, media type, etc.)
  type: "Actual" | "Planned";
  level: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
  data: Record<string, any>;
}

/**
 * Transform configuration for a specific data source
 */
export interface TransformConfig {
  /** Field to use for primary grouping (becomes mediaType in TableRow) */
  groupByField: string;
  /** Fields to skip when processing (e.g., "GRAND TOTAL" rows) */
  skipValues?: string[];
  /** Field to filter by (e.g., "type") */
  filterField?: string;
  /** Value to filter for (e.g., "ALL") */
  filterValue?: string;
  /** Field containing the period for period-based filtering */
  periodField?: string;
  /** Fields that contain percentage values (decimal 0-1 that need *100) */
  percentageFieldsToConvert?: string[];
  /** Fields that are already percentages (don't multiply) */
  percentageFieldsRaw?: string[];
  /** Fields to sum for aggregation */
  sumFields: string[];
  /** Percentage calculations: { fieldName: { numerator: string, denominator: string } } */
  calculatedPercentages?: Record<string, { numerator: string; denominator: string }>;
  /** Whether to aggregate by groupByField or pass data through */
  aggregate?: boolean;
  /** Include a totals row */
  includeTotals?: boolean;
}

/**
 * Normalize string to title case for consistent grouping
 */
export function normalizeToTitleCase(value: string): string {
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Create a unique row ID from a string
 */
export function createRowId(value: string, index?: number): string {
  const base = value.toLowerCase().replace(/\s+/g, "-");
  return index !== undefined ? `${base}-${index}` : base;
}

/**
 * Generic transform function that processes API data based on config
 */
export function transformDataWithConfig<T extends Record<string, any>>(
  data: T[],
  config: TransformConfig,
  periodFilter?: string
): TableRow[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  let filteredData = data;

  // Apply period filter if specified
  if (periodFilter && config.periodField) {
    filteredData = filteredData.filter(
      (item) => item[config.periodField!] === periodFilter
    );
  }

  // Apply type filter if specified
  if (config.filterField && config.filterValue) {
    filteredData = filteredData.filter(
      (item) => item[config.filterField!] === config.filterValue
    );
  }

  if (filteredData.length === 0) return [];

  // Skip certain values (e.g., "GRAND TOTAL")
  if (config.skipValues && config.skipValues.length > 0) {
    const skipValuesUpper = config.skipValues.map((v) => v.toUpperCase());
    filteredData = filteredData.filter((item) => {
      const groupValue = item[config.groupByField];
      return !skipValuesUpper.includes(
        normalizeToTitleCase(groupValue || "").toUpperCase()
      );
    });
  }

  let tableRows: TableRow[];

  if (config.aggregate) {
    // Aggregate data by group field
    const groups: Record<string, Record<string, number>> = {};

    filteredData.forEach((item) => {
      const groupKey = normalizeToTitleCase(item[config.groupByField] || "Unknown");

      if (!groups[groupKey]) {
        groups[groupKey] = {};
        config.sumFields.forEach((field) => {
          groups[groupKey][field] = 0;
        });
      }

      config.sumFields.forEach((field) => {
        const val = item[field];
        if (typeof val === "number") {
          groups[groupKey][field] += val;
        }
      });
    });

    // Create table rows from aggregated data
    tableRows = Object.entries(groups).map(([groupKey, values]) => {
      const rowData: Record<string, any> = { ...values };

      // Calculate percentages
      if (config.calculatedPercentages) {
        Object.entries(config.calculatedPercentages).forEach(
          ([fieldName, calc]) => {
            const numerator = rowData[calc.numerator] || 0;
            const denominator = rowData[calc.denominator] || 0;
            rowData[fieldName] =
              denominator > 0 ? (numerator / denominator) * 100 : 0;
          }
        );
      }

      return {
        id: createRowId(groupKey),
        mediaType: groupKey,
        type: "Actual" as const,
        level: 0,
        data: rowData,
      };
    });
  } else {
    // Pass through data without aggregation (one row per item)
    tableRows = filteredData.map((item, index) => {
      const groupValue = normalizeToTitleCase(
        item[config.groupByField] || "Unknown"
      );
      const rowData: Record<string, any> = {};

      // Copy sum fields
      config.sumFields.forEach((field) => {
        rowData[field] = item[field];
      });

      // Convert decimal percentages to display percentages (*100)
      if (config.percentageFieldsToConvert) {
        config.percentageFieldsToConvert.forEach((field) => {
          if (item[field] !== null && item[field] !== undefined) {
            rowData[field] = item[field] * 100;
          }
        });
      }

      // Copy raw percentage fields as-is
      if (config.percentageFieldsRaw) {
        config.percentageFieldsRaw.forEach((field) => {
          rowData[field] = item[field];
        });
      }

      return {
        id: createRowId(groupValue, index),
        mediaType: groupValue,
        type: "Actual" as const,
        level: 0,
        data: rowData,
      };
    });
  }

  // Add totals row if requested
  if (config.includeTotals && tableRows.length > 0) {
    const totals: Record<string, number> = {};

    // Sum all numeric fields
    config.sumFields.forEach((field) => {
      totals[field] = tableRows.reduce(
        (sum, row) => sum + (row.data[field] || 0),
        0
      );
    });

    // Calculate total percentages
    if (config.calculatedPercentages) {
      Object.entries(config.calculatedPercentages).forEach(
        ([fieldName, calc]) => {
          const numerator = totals[calc.numerator] || 0;
          const denominator = totals[calc.denominator] || 0;
          totals[fieldName] =
            denominator > 0 ? (numerator / denominator) * 100 : 0;
        }
      );
    }

    tableRows.push({
      id: "total",
      mediaType: "Total",
      type: "Actual",
      level: 0,
      data: totals,
    });
  }

  return tableRows;
}

// ============================================
// CLIENT-SPECIFIC TRANSFORM CONFIGS
// ============================================

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
 */
export const keringTrackerSummaryTransform: TransformConfig = {
  groupByField: "media_type",
  filterField: "type",
  filterValue: "ALL",
  periodField: "period",
  skipValues: ["Grand Total", "Tv", "Tv - Linear", "Tv - Vod"],
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
  skipValues: ["Grand Total", "Tv", "Tv - Linear", "Tv - Vod"],
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

// ============================================
// TRANSFORM REGISTRY
// ============================================

/**
 * Map of transform config names to their configs
 */
export const transformRegistry: Record<string, TransformConfig> = {
  "kering:allBrandSummary": keringAllBrandSummaryTransform,
  "kering:consolidatedBrand": keringConsolidatedBrandTransform,
  "kering:trackerSummary": keringTrackerSummaryTransform,
  "kering:trackerBrand": keringTrackerBrandTransform,
};

/**
 * Get a transform config by name
 */
export function getTransformConfig(name: string): TransformConfig | null {
  return transformRegistry[name] || null;
}
