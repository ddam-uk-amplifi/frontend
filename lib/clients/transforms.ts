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
  /** Use GRAND TOTAL from API instead of calculating totals */
  useGrandTotalFromApi?: boolean;
  /** Field value that represents the grand total row in API data */
  grandTotalValue?: string;
  /** Rename mappings: { "Original Value": "New Display Name" } */
  renameValues?: Record<string, string>;
  /** Skip duplicate occurrences of these values (only keep first occurrence) */
  skipDuplicates?: string[];
  /** Rename second occurrence of these values: { "Original": "New Name For Second" } */
  renameSecondOccurrence?: Record<string, string>;
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

  // Extract GRAND TOTAL row before filtering if we need to use it
  let grandTotalRow: T | undefined;
  if (config.useGrandTotalFromApi && config.grandTotalValue) {
    const grandTotalValueUpper = config.grandTotalValue.toUpperCase();
    grandTotalRow = filteredData.find((item) => {
      const groupValue = item[config.groupByField];
      return normalizeToTitleCase(groupValue || "").toUpperCase() === grandTotalValueUpper;
    });
  }

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

  // Skip duplicate occurrences of specified values (keep only first occurrence)
  if (config.skipDuplicates && config.skipDuplicates.length > 0) {
    const skipDuplicatesUpper = config.skipDuplicates.map((v) => v.toUpperCase());
    const seenValues = new Set<string>();
    filteredData = filteredData.filter((item) => {
      const groupValue = item[config.groupByField];
      const normalizedValue = normalizeToTitleCase(groupValue || "").toUpperCase();

      // Check if this is a value we should deduplicate
      if (skipDuplicatesUpper.includes(normalizedValue)) {
        if (seenValues.has(normalizedValue)) {
          // Skip this duplicate
          return false;
        }
        seenValues.add(normalizedValue);
      }
      return true;
    });
  }

  // Rename second occurrence of specified values (e.g., "Digital" -> "Digital Total")
  if (config.renameSecondOccurrence) {
    const renameMap = config.renameSecondOccurrence;
    const renameKeysUpper = Object.keys(renameMap).map((k) => k.toUpperCase());
    const seenValues = new Set<string>();
    filteredData = filteredData.map((item) => {
      const groupValue = item[config.groupByField];
      const normalizedValue = normalizeToTitleCase(groupValue || "").toUpperCase();

      // Check if this is a value we should rename on second occurrence
      if (renameKeysUpper.includes(normalizedValue)) {
        if (seenValues.has(normalizedValue)) {
          // This is the second occurrence - rename it
          const originalKey = Object.keys(renameMap).find(
            (k) => k.toUpperCase() === normalizedValue
          );
          if (originalKey) {
            return { ...item, [config.groupByField]: renameMap[originalKey] };
          }
        }
        seenValues.add(normalizedValue);
      }
      return item;
    });
  }

  // Apply rename mappings to the data before processing
  if (config.renameValues) {
    const renameMap = config.renameValues;
    filteredData = filteredData.map((item) => {
      const groupValue = item[config.groupByField];
      const normalizedValue = normalizeToTitleCase(groupValue || "");
      // Check if this value should be renamed
      for (const [original, newName] of Object.entries(renameMap)) {
        if (normalizedValue.toUpperCase() === original.toUpperCase()) {
          return { ...item, [config.groupByField]: newName };
        }
      }
      return item;
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

  // Add totals row
  if (config.includeTotals && tableRows.length > 0) {
    // Use GRAND TOTAL from API if configured and available
    if (config.useGrandTotalFromApi && grandTotalRow) {
      const totals: Record<string, any> = {};

      // Copy sum fields from the grand total row
      config.sumFields.forEach((field) => {
        totals[field] = grandTotalRow![field];
      });

      // Convert decimal percentages to display percentages (*100)
      if (config.percentageFieldsToConvert) {
        config.percentageFieldsToConvert.forEach((field) => {
          if (grandTotalRow![field] !== null && grandTotalRow![field] !== undefined) {
            totals[field] = grandTotalRow![field] * 100;
          }
        });
      }

      // For aggregated data, calculate percentages from the grand total values
      if (config.aggregate && config.calculatedPercentages) {
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
    } else {
      // Fall back to calculating totals by summing rows
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
  }

  return tableRows;
}

// ============================================
// TRANSFORM REGISTRY
// ============================================

/**
 * Global transform registry - maps transform names to configs
 * Client-specific transforms are registered here from their respective modules
 */
const transformRegistry: Record<string, TransformConfig> = {};

/**
 * Register transforms from a client module
 * Called during client module initialization
 *
 * @example
 * // In kering/transforms.ts
 * export const keringTransforms = { "kering:summary": config };
 *
 * // In index.ts or during app init
 * registerTransforms(keringTransforms);
 */
export function registerTransforms(transforms: Record<string, TransformConfig>): void {
  Object.assign(transformRegistry, transforms);
}

/**
 * Get a transform config by name
 */
export function getTransformConfig(name: string): TransformConfig | null {
  return transformRegistry[name] || null;
}

/**
 * Get all registered transform names (useful for debugging)
 */
export function getRegisteredTransformNames(): string[] {
  return Object.keys(transformRegistry);
}
