// Utility functions for data processing and chart recommendations
import { DEFAULT_CHART_THRESHOLDS, type ChartThresholds } from "@/lib/clients";

export interface ProcessedDataItem {
  name: string;
  [key: string]: any;
  isOther?: boolean;
}

// ============================================
// DATA-AWARE ANALYSIS (Smart Recommendations)
// ============================================

/**
 * Analysis result from examining actual data values
 */
export interface DataAwareAnalysis {
  // Data shape
  rowCount: number;
  hasTimeSeries: boolean;
  timeField?: string;

  // Field classifications (detected from actual values)
  numericFields: string[];
  percentageFields: string[]; // Values between 0-100
  currencyFields: string[]; // Large absolute values
  categoryFields: string[]; // String/categorical data

  // Data characteristics
  cardinality: number; // Unique category count
  hasNegativeValues: boolean;
  valueRange: { min: number; max: number };

  // Smart recommendations
  suggestedCharts: ChartSuggestion[];
  primaryRecommendation?: string;
  warnings: string[];
}

export interface ChartSuggestion {
  chartType: string;
  score: number; // 0-100
  reason: string;
  isPrimary?: boolean;
}

/**
 * Analyzes actual data to provide smart chart recommendations
 * This is the main entry point for data-aware suggestions
 * @param data - The chart data to analyze
 * @param thresholds - Optional client-specific thresholds (uses defaults if not provided)
 */
export function analyzeDataForCharts(
  data: any[],
  thresholds: Partial<ChartThresholds> = {},
): DataAwareAnalysis {
  // Merge with defaults
  const mergedThresholds: ChartThresholds = {
    ...DEFAULT_CHART_THRESHOLDS,
    ...thresholds,
  };
  const analysis: DataAwareAnalysis = {
    rowCount: data.length,
    hasTimeSeries: false,
    numericFields: [],
    percentageFields: [],
    currencyFields: [],
    categoryFields: [],
    cardinality: 0,
    hasNegativeValues: false,
    valueRange: { min: 0, max: 0 },
    suggestedCharts: [],
    warnings: [],
  };

  if (!data || data.length === 0) {
    analysis.warnings.push("No data available for analysis");
    return analysis;
  }

  // Get all field keys from data (excluding metadata)
  const excludedKeys = new Set([
    "name",
    "id",
    "market_id",
    "client_id",
    "row_index",
    "extracted_file_id",
    "isOther",
    "_period",
    "tv_data_general_id",
    "print_data_general_id",
    "ooh_data_general_id",
    "radio_data_general_id",
    "online_data_general_id",
    "cinema_data_general_id",
  ]);

  const sampleRow = data[0];
  const allKeys = Object.keys(sampleRow).filter((k) => !excludedKeys.has(k));

  // Detect time series
  const timePatterns = ["month", "period", "quarter", "year", "date", "week"];
  for (const key of allKeys) {
    if (timePatterns.some((p) => key.toLowerCase().includes(p))) {
      analysis.hasTimeSeries = true;
      analysis.timeField = key;
      break;
    }
  }

  // Also check data values for month patterns
  if (
    !analysis.hasTimeSeries &&
    data.some((d) => {
      const name = String(d.name || "").toUpperCase();
      return [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ].includes(name);
    })
  ) {
    analysis.hasTimeSeries = true;
    analysis.timeField = "name";
  }

  // Analyze each field by examining actual values
  let globalMin = Infinity;
  let globalMax = -Infinity;

  for (const key of allKeys) {
    const values = data.map((d) => d[key]).filter((v) => v != null);

    if (values.length === 0) continue;

    // Check if numeric
    const numericValues = values.filter((v) => typeof v === "number");

    if (numericValues.length > values.length * 0.5) {
      // Mostly numeric field
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);

      globalMin = Math.min(globalMin, min);
      globalMax = Math.max(globalMax, max);

      if (min < 0) {
        analysis.hasNegativeValues = true;
      }

      // Classify by value range
      if (
        min >= 0 &&
        max <= 100 &&
        numericValues.every((v) => v >= 0 && v <= 100)
      ) {
        // Likely percentage (0-100 range)
        analysis.percentageFields.push(key);
      } else if (max > 1000) {
        // Large values - likely currency/spend
        analysis.currencyFields.push(key);
      } else {
        // Other numeric
        analysis.numericFields.push(key);
      }
    } else {
      // Categorical/string field
      analysis.categoryFields.push(key);
    }
  }

  analysis.valueRange = {
    min: globalMin === Infinity ? 0 : globalMin,
    max: globalMax === -Infinity ? 0 : globalMax,
  };

  // Calculate cardinality (unique categories)
  const uniqueNames = new Set(data.map((d) => d.name));
  analysis.cardinality = uniqueNames.size;

  // Generate smart chart suggestions using client thresholds
  analysis.suggestedCharts = generateSmartSuggestions(
    analysis,
    mergedThresholds,
  );

  // Set primary recommendation
  if (analysis.suggestedCharts.length > 0) {
    analysis.suggestedCharts[0].isPrimary = true;
    analysis.primaryRecommendation = analysis.suggestedCharts[0].chartType;
  }

  // Add warnings for mixed scales
  if (
    analysis.percentageFields.length > 0 &&
    analysis.currencyFields.length > 0
  ) {
    analysis.warnings.push(
      "Mixed scales detected: percentages (0-100%) and currency values. Consider separate charts.",
    );
  }

  return analysis;
}

/**
 * Generates smart chart suggestions based on data analysis
 * @param analysis - The data analysis result
 * @param thresholds - Client-specific thresholds for chart recommendations
 */
function generateSmartSuggestions(
  analysis: DataAwareAnalysis,
  thresholds: ChartThresholds,
): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [];
  const {
    rowCount,
    hasTimeSeries,
    cardinality,
    hasNegativeValues,
    percentageFields,
    currencyFields,
    numericFields,
  } = analysis;

  const { highCardinalityThreshold, maxPieCategories, maxBarCategories } =
    thresholds;

  const totalNumeric =
    percentageFields.length + currencyFields.length + numericFields.length;
  const hasPercentages = percentageFields.length > 0;
  const hasCurrency = currencyFields.length > 0;

  // Time series data → Line/Area charts
  if (hasTimeSeries) {
    suggestions.push({
      chartType: "line-chart",
      score: 95,
      reason: "Time series detected - ideal for showing trends over time",
    });

    if (totalNumeric > 1) {
      suggestions.push({
        chartType: "area-chart",
        score: 85,
        reason:
          "Multiple metrics over time - area chart shows cumulative trends",
      });
    }
  }

  // Low cardinality → Pie/Donut for composition (using client threshold)
  if (
    cardinality <= maxPieCategories &&
    cardinality >= 2 &&
    !hasTimeSeries &&
    !hasNegativeValues
  ) {
    if (hasPercentages && !hasCurrency) {
      suggestions.push({
        chartType: "pie-chart",
        score: 90,
        reason: `${cardinality} categories with percentage data - perfect for composition view`,
      });
      suggestions.push({
        chartType: "donut-chart",
        score: 88,
        reason: "Donut chart shows composition with center for totals",
      });
    } else if (totalNumeric === 1) {
      suggestions.push({
        chartType: "pie-chart",
        score: 75,
        reason: `${cardinality} categories - good for part-to-whole comparison`,
      });
    }
  }

  // Bar charts - versatile for most data (using client threshold)
  if (totalNumeric >= 1) {
    const barScore = hasTimeSeries
      ? 70
      : cardinality <= highCardinalityThreshold
        ? 85
        : 65;
    suggestions.push({
      chartType: "bar-chart",
      score: barScore,
      reason:
        cardinality <= 10
          ? "Clear comparison across categories"
          : "Bar chart handles multiple categories well",
    });

    // Horizontal bar for many categories or long labels
    if (cardinality > 8) {
      suggestions.push({
        chartType: "horizontal-bar",
        score: 80,
        reason: `${cardinality} categories - horizontal layout improves readability`,
      });
    }
  }

  // Multiple metrics → Grouped bar
  if (totalNumeric >= 2 && !hasTimeSeries) {
    const mixedScales = hasPercentages && hasCurrency;
    suggestions.push({
      chartType: "grouped-bar",
      score: mixedScales ? 60 : 90,
      reason: mixedScales
        ? "Multiple metrics (mixed scales - use with caution)"
        : `${totalNumeric} metrics - grouped bars enable side-by-side comparison`,
    });
  }

  // Combo chart for mixed metric types
  if (hasPercentages && hasCurrency && totalNumeric >= 2) {
    suggestions.push({
      chartType: "combo-chart",
      score: 88,
      reason:
        "Mixed scales (% and values) - combo chart with dual axes works well",
    });
  }

  // Scatter for correlation analysis
  if (totalNumeric >= 2 && rowCount >= 5) {
    suggestions.push({
      chartType: "scatter",
      score: 75,
      reason: "Multiple numeric fields - scatter plot reveals correlations",
    });
  }

  // High cardinality → Table (using client threshold)
  if (cardinality > highCardinalityThreshold || totalNumeric > 4) {
    const veryHighCardinality = cardinality > maxBarCategories;
    suggestions.push({
      chartType: "table",
      score: veryHighCardinality ? 95 : 80,
      reason: veryHighCardinality
        ? `${cardinality} categories - table view recommended for detailed analysis`
        : "Many fields - table provides complete data view",
    });
  }

  // Stacked bar for composition over categories
  if (
    totalNumeric >= 2 &&
    cardinality <= 12 &&
    !hasTimeSeries &&
    !hasNegativeValues
  ) {
    const mixedScales = hasPercentages && hasCurrency;
    if (!mixedScales) {
      suggestions.push({
        chartType: "stacked-bar",
        score: 78,
        reason: "Shows composition breakdown across categories",
      });
    }
  }

  // Sort by score descending
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions;
}

/**
 * Enhanced chart compatibility that uses data-aware analysis
 * Falls back to field-name analysis if no data provided
 * @param chartType - The chart type to check
 * @param selectedFields - Selected fields from query builder
 * @param data - Optional chart data for smart analysis
 * @param thresholds - Optional client-specific thresholds
 */
export function getSmartChartCompatibility(
  chartType: string,
  selectedFields: Record<string, string[]>,
  data?: any[],
  thresholds?: Partial<ChartThresholds>,
): {
  compatible: boolean;
  reason?: string;
  score: number;
  scaleWarning?: string;
  dataInsight?: string;
} {
  // If we have actual data, use data-aware analysis with client thresholds
  if (data && data.length > 0) {
    const dataAnalysis = analyzeDataForCharts(data, thresholds);
    const suggestion = dataAnalysis.suggestedCharts.find(
      (s) => s.chartType === chartType,
    );

    if (suggestion) {
      return {
        compatible: true,
        score: suggestion.score,
        reason: suggestion.reason,
        scaleWarning:
          dataAnalysis.warnings.length > 0
            ? dataAnalysis.warnings[0]
            : undefined,
        dataInsight: `Based on ${dataAnalysis.rowCount} rows, ${dataAnalysis.cardinality} categories`,
      };
    }

    // Chart not in suggestions - check if it's still compatible
    const baseCompatibility = isChartCompatible(chartType, selectedFields);
    return {
      ...baseCompatibility,
      score: baseCompatibility.score || 30,
      dataInsight: "Not optimal for this data shape",
    };
  }

  // Fallback to field-name based analysis
  const fallback = isChartCompatible(chartType, selectedFields);
  return {
    ...fallback,
    score: fallback.score ?? 50,
  };
}

/**
 * Get the best chart type for given data
 * @param data - Chart data to analyze
 * @param thresholds - Optional client-specific thresholds
 */
export function getBestChartForData(
  data: any[],
  thresholds?: Partial<ChartThresholds>,
): string | null {
  if (!data || data.length === 0) return null;

  const analysis = analyzeDataForCharts(data, thresholds);
  return analysis.primaryRecommendation || null;
}

// Categories for chart recommendations
export interface FieldAnalysis {
  dimensions: string[];
  metrics: string[]; // Absolute values (spend, savings_value, etc.)
  percentages: string[]; // Percentage fields (0-100 scale)
  indexes: string[]; // Index values (like CPU index)
  totalFields: number;
  hasMixedScales: boolean; // True if user selected both percentages and absolute metrics
  scaleWarning?: string; // Warning message for UI
}

/**
 * Analyzes selected fields and categorizes them for chart recommendations
 */
export function analyzeSelectedFields(
  selectedFields: Record<string, string[]>,
): FieldAnalysis {
  const allFields = Object.values(selectedFields).flat();
  const dimensions: string[] = [];
  const metrics: string[] = [];
  const percentages: string[] = [];
  const indexes: string[] = [];

  allFields.forEach((fieldId) => {
    const type = getFieldType(fieldId);
    if (type === "dimension") dimensions.push(fieldId);
    else if (type === "percentage") percentages.push(fieldId);
    else if (type === "index") indexes.push(fieldId);
    else if (type === "metric") metrics.push(fieldId);
  });

  // Detect mixed scales - when user selects both absolute values and percentages
  const hasAbsoluteValues = metrics.length > 0;
  const hasPercentages = percentages.length > 0;
  const hasIndexes = indexes.length > 0;
  const hasMixedScales =
    (hasAbsoluteValues && hasPercentages) ||
    (hasAbsoluteValues && hasIndexes) ||
    (hasPercentages && hasIndexes);

  let scaleWarning: string | undefined;
  if (hasMixedScales) {
    const scaleTypes: string[] = [];
    if (hasAbsoluteValues) scaleTypes.push("absolute values (spend)");
    if (hasPercentages) scaleTypes.push("percentages (0-100%)");
    if (hasIndexes) scaleTypes.push("index values");
    scaleWarning = `Mixed scales detected: ${scaleTypes.join(" and ")}. Consider using separate charts for accurate comparison.`;
  }

  return {
    dimensions,
    metrics,
    percentages,
    indexes,
    totalFields: allFields.length,
    hasMixedScales,
    scaleWarning,
  };
}

/**
 * Gets recommended chart types based on selected fields
 */
export function getRecommendedCharts(
  selectedFields: Record<string, string[]>,
): string[] {
  const analysis = analyzeSelectedFields(selectedFields);
  const { dimensions, metrics, percentages, indexes, totalFields } = analysis;
  const numericFields = metrics.length + percentages.length + indexes.length;

  if (totalFields === 0) return [];

  const recommendations: string[] = [];

  // Single metric/percentage - Bar chart or Table
  if (numericFields === 1 && dimensions.length === 0) {
    recommendations.push("bar-chart", "table");
  }

  // 1 metric - Bar chart is great for comparing across categories
  if (numericFields >= 1) {
    recommendations.push("bar-chart");
  }

  // Multiple metrics (2+) of same type - Grouped bar for comparison
  if (numericFields >= 2) {
    recommendations.push("grouped-bar", "scatter");
  }

  // Percentage fields work great with pie charts (showing composition)
  if (percentages.length >= 1 && numericFields <= 2) {
    recommendations.push("pie-chart");
  }

  // Multiple dimensions + metric - Stacked bar or Heatmap
  if (dimensions.length >= 2 && numericFields >= 1) {
    recommendations.push("stacked-bar", "heatmap");
  }

  // Many fields - Table is always safe
  if (totalFields >= 3 && !recommendations.includes("table")) {
    recommendations.push("table");
  }

  // Line/Area charts for trends
  if (numericFields >= 1 && totalFields >= 2) {
    recommendations.push("line-chart", "area-chart");
  }

  // Remove duplicates and return
  return [...new Set(recommendations)];
}

/**
 * Handles data density by grouping low-value items into "Others"
 */
export function applyOthersLogic(
  data: any[],
  maxItems: number = 9,
  valueKey: string = "spend",
): ProcessedDataItem[] {
  if (data.length <= maxItems) {
    return data;
  }

  // Sort by value descending
  const sorted = [...data].sort(
    (a, b) => (b[valueKey] || 0) - (a[valueKey] || 0),
  );

  // Take top items
  const topItems = sorted.slice(0, maxItems);

  // Aggregate remaining items
  const remainingItems = sorted.slice(maxItems);
  const othersData: any = { name: "Others", isOther: true };

  // Sum all numeric values
  remainingItems.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (key !== "name" && typeof item[key] === "number") {
        othersData[key] = (othersData[key] || 0) + item[key];
      }
    });
  });

  return [...topItems, othersData];
}

/**
 * Checks if data density is too high for visualization
 */
export function checkDataDensity(
  dataLength: number,
  chartType: string,
): { isHigh: boolean; message?: string; suggestedChart?: string } {
  const limits: Record<string, number> = {
    "pie-chart": 10,
    "bar-chart": 20,
    "grouped-bar": 15,
    "stacked-bar": 12,
    "line-chart": 25,
    "area-chart": 20,
  };

  const limit = limits[chartType];

  if (!limit) return { isHigh: false };

  if (dataLength > limit) {
    return {
      isHigh: true,
      message: `Showing top ${limit} items. ${dataLength - limit} items grouped as "Others".`,
    };
  }

  return { isHigh: false };
}

/**
 * Determines field type from field ID
 */
export type FieldType =
  | "dimension"
  | "metric"
  | "percentage"
  | "index"
  | "time";

export function getFieldType(fieldId: string): FieldType {
  if (fieldId.includes("pct") || fieldId.includes("percentage"))
    return "percentage";
  if (fieldId.includes("index") || fieldId.includes("idx")) return "index";
  if (
    fieldId.includes("month") ||
    fieldId.includes("quarter") ||
    fieldId.includes("year") ||
    fieldId.includes("period")
  )
    return "time";
  if (
    fieldId.includes("spend") ||
    fieldId.includes("value") ||
    fieldId.includes("cpu") ||
    fieldId.includes("savings")
  )
    return "metric";
  return "dimension";
}

/**
 * Gets user-friendly label for field type
 */
export function getFieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    dimension: "Category",
    metric: "Value",
    percentage: "Percentage",
    index: "Index",
    time: "Trend/Period",
  };
  return labels[type];
}

/**
 * Checks if chart type is compatible with selected fields
 */
export function isChartCompatible(
  chartType: string,
  selectedFields: Record<string, string[]>,
): {
  compatible: boolean;
  reason?: string;
  score?: number;
  scaleWarning?: string;
} {
  const allFields = Object.values(selectedFields).flat();
  const fieldTypes = allFields.map(getFieldType);
  const analysis = analyzeSelectedFields(selectedFields);

  const hasTime = fieldTypes.includes("time");
  const metricCount = fieldTypes.filter(
    (t) => t === "metric" || t === "percentage" || t === "index",
  ).length;
  const totalFields = allFields.length;

  // If no fields selected, all charts are technically compatible (for demo)
  if (totalFields === 0) {
    return { compatible: true, score: 0 };
  }

  // Helper to add scale warning to result
  const addScaleWarning = (result: {
    compatible: boolean;
    reason?: string;
    score?: number;
  }) => {
    if (analysis.hasMixedScales && result.compatible) {
      return { ...result, scaleWarning: analysis.scaleWarning };
    }
    return result;
  };

  switch (chartType) {
    case "pie-chart":
    case "donut-chart":
      if (hasTime) {
        return {
          compatible: false,
          reason:
            "Pie charts cannot display time-series data. Use Line or Area chart instead.",
        };
      }
      if (metricCount === 0) {
        return {
          compatible: false,
          reason: "Pie chart requires at least 1 numeric field.",
        };
      }
      if (analysis.hasMixedScales) {
        return {
          compatible: false,
          reason:
            "Pie charts cannot display mixed scales (percentages + absolute values). Use separate charts or Table view.",
        };
      }
      if (metricCount > 1) {
        return {
          compatible: true,
          score: 50,
          reason: "Pie charts work best with a single metric.",
        };
      }
      return { compatible: true, score: 90 };

    case "bar-chart":
    case "horizontal-bar":
      if (metricCount === 0) {
        return {
          compatible: false,
          reason: "Bar chart requires at least 1 numeric field.",
        };
      }
      if (analysis.hasMixedScales) {
        return addScaleWarning({
          compatible: true,
          score: 40,
          reason:
            "Mixed scales may make comparison difficult. Consider Dual-Axis Bar or separate charts.",
        });
      }
      return { compatible: true, score: metricCount >= 1 ? 85 : 60 };

    case "grouped-bar":
      if (metricCount < 2) {
        return {
          compatible: false,
          reason:
            "Grouped bar chart needs 2+ numeric fields to compare side-by-side.",
        };
      }
      if (analysis.hasMixedScales) {
        return addScaleWarning({
          compatible: true,
          score: 50,
          reason:
            "Mixed scales (% vs absolute values) may distort comparison. Consider Dual-Axis Bar chart.",
        });
      }
      return { compatible: true, score: metricCount >= 2 ? 95 : 70 };

    case "stacked-bar":
      if (metricCount === 0) {
        return {
          compatible: false,
          reason: "Stacked bar chart requires at least 1 numeric field.",
        };
      }
      if (analysis.hasMixedScales) {
        return {
          compatible: false,
          reason:
            "Stacked bar cannot display mixed scales. Use Dual-Axis Bar or Table view.",
        };
      }
      return { compatible: true, score: 80 };

    case "combo-chart":
      if (metricCount < 2) {
        return {
          compatible: false,
          reason:
            "Combo chart needs 2+ numeric fields to combine bars and lines.",
        };
      }
      if (analysis.hasMixedScales) {
        return addScaleWarning({
          compatible: true,
          score: 85,
          reason:
            "Great for comparing different metric types. Bars for one metric, line for another.",
        });
      }
      return { compatible: true, score: metricCount >= 2 ? 90 : 65 };

    case "line-chart":
    case "area-chart":
      if (metricCount === 0) {
        return {
          compatible: false,
          reason: "Line/Area charts require numeric fields to plot.",
        };
      }
      if (analysis.hasMixedScales) {
        return addScaleWarning({
          compatible: true,
          score: 40,
          reason:
            "Mixed scales may distort trends. Consider using separate charts.",
        });
      }
      // For Arla data (market × media), line charts can show trends across markets
      return { compatible: true, score: hasTime ? 95 : 70 };

    case "scatter":
      if (metricCount < 2) {
        return {
          compatible: false,
          reason:
            "Scatter plot requires at least 2 numeric fields to show correlation.",
        };
      }
      // Scatter can handle mixed scales (each axis has its own scale)
      if (analysis.hasMixedScales && metricCount === 2) {
        return {
          compatible: true,
          score: 85,
          reason:
            "Good for comparing relationship between different metric types.",
        };
      }
      return { compatible: true, score: 90 };

    case "table":
      // Table is always compatible and handles mixed scales well
      return {
        compatible: true,
        score: analysis.hasMixedScales ? 90 : totalFields >= 3 ? 80 : 50,
      };

    default:
      return { compatible: true, score: 50 };
  }
}
