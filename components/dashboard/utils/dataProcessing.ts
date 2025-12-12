// Utility functions for data processing and density handling

export interface ProcessedDataItem {
  name: string;
  [key: string]: any;
  isOther?: boolean;
}

// Field mappings from query builder to actual data keys
export const arlaFieldMappings: Record<string, string> = {
  "total-net-not-spend": "total_net_net_spend",
  "total-addressable-net-not-spend": "total_addressable_net_net_spend",
  "total-net-not-measured": "total_net_net_measured",
  "measured-spend-pct": "measured_spend_percent",
  "savings-value": "savings_value",
  "savings-pct": "savings_percent",
  "inflation-pct": "inflation_percent",
  "inflation-mitigation": "inflation_mitigation_percent",
  "inflation-after-mitigation-pct": "inflation_after_mitigation_percent",
};

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

  if (dataLength > limit * 2) {
    return {
      isHigh: true,
      message: `Data volume is very high (${dataLength} items). Switching to Table View for better readability.`,
      suggestedChart: "table",
    };
  }

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
  const hasDimension = fieldTypes.includes("dimension");
  const hasMetric = fieldTypes.some(
    (t) => t === "metric" || t === "percentage" || t === "index",
  );
  const metricCount = fieldTypes.filter(
    (t) => t === "metric" || t === "percentage" || t === "index",
  ).length;
  const percentageCount = fieldTypes.filter((t) => t === "percentage").length;
  const absoluteMetricCount = fieldTypes.filter((t) => t === "metric").length;
  const indexCount = fieldTypes.filter((t) => t === "index").length;
  const dimensionCount = fieldTypes.filter((t) => t === "dimension").length;
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
