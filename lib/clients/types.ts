// ============================================
// SHARED CLIENT TYPES
// ============================================

/**
 * Chart-specific thresholds for smart recommendations
 */
export interface ChartThresholds {
  highCardinalityThreshold: number; // When to suggest table view (default: 15)
  maxPieCategories: number; // Max categories for pie chart (default: 7)
  maxBarCategories: number; // Max categories for bar chart (default: 20)
}

/**
 * Client-specific chart preferences
 */
export interface ChartPreferences {
  preferredChartTypes?: string[]; // e.g., ["bar", "table"] - shown first
  disabledChartTypes?: string[]; // Charts to hide for this client
  thresholds?: Partial<ChartThresholds>;
}

/**
 * Client configuration metadata
 */
export interface ClientConfig {
  id: number;
  name: string;
  slug: string; // URL-safe lowercase
  markets: string[];
  features: {
    hasTrackers: boolean;
    hasBrandSummary: boolean;
    hasInflation: boolean;
    hasDynamicTrackerFields: boolean;
  };
  chartPreferences?: ChartPreferences;
}

/**
 * Field definition for query builder
 */
export interface Field {
  id: string;
  label: string;
}

/**
 * Field group for query builder - can have nested subgroups
 */
export interface FieldGroup {
  id: string;
  title: string;
  fields: Field[];
  subgroups?: FieldGroup[];
}

/**
 * Client schema containing summary and tracker field groups
 */
export interface ClientSchema {
  summary: FieldGroup[];
  trackers: FieldGroup[];
}

/**
 * Complete client module export
 */
export interface ClientModule {
  config: ClientConfig;
  schema: ClientSchema;
}

/**
 * Type for tracker media types
 */
export type TrackerMediaType =
  | "tv"
  | "radio"
  | "print"
  | "ooh"
  | "online"
  | "cinema";
