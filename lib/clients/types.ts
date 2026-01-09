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
  /** Market code to display name mapping (e.g., { "UK": "United Kingdom" }) */
  marketNames?: Record<string, string>;
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
  tableView?: TableViewConfig;
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

// ============================================
// TABLE VIEW CONFIGURATION TYPES
// ============================================

/**
 * Column type for table rendering
 */
export type TableColumnType = "text" | "currency" | "percentage" | "number";

/**
 * Table column definition
 */
export interface TableColumnConfig {
  id: string;
  label: string;
  type: TableColumnType;
  align?: "left" | "right" | "center";
  visible?: boolean;
  order?: number;
  frozen?: boolean;
}

/**
 * Period option for dropdowns
 */
export interface PeriodOption {
  code: string;
  name: string;
}

/**
 * Data source type
 */
export type DataSourceType = "summary" | "trackers";

/**
 * Table view mode - what type of view is selected
 */
export type TableViewMode = "summary" | "brand" | "detailed";

/**
 * View option for selector dropdowns
 */
export interface ViewOption {
  code: string;
  name: string;
  /** Whether this is a brand option */
  isBrand?: boolean;
}

/**
 * Period filter configuration for trackers
 */
export interface PeriodFilterConfig {
  /** Available periods */
  periods: PeriodOption[];
  /** Default period */
  defaultPeriod: string;
  /** Group separator index (e.g., separate summary periods from monthly) */
  groupSeparatorIndex?: number;
  /** Label for first group */
  firstGroupLabel?: string;
  /** Label for second group */
  secondGroupLabel?: string;
}

/**
 * Table view configuration for a client
 * Defines how data is displayed in the table view component
 */
export interface TableViewConfig {
  /**
   * Available data sources for this client
   */
  dataSources: DataSourceType[];

  /**
   * Summary data source configuration
   */
  summary?: {
    /** Column definitions for summary table */
    columns: TableColumnConfig[];
    /** Column definitions for brand-specific summary (if different) */
    brandColumns?: TableColumnConfig[];
    /** Column definitions for variant-specific views (e.g., MEU) keyed by sheet type code */
    variantColumns?: Record<string, TableColumnConfig[]>;
    /** Available sheet types (e.g., "ytd", "fyfc", "overview", "meu") */
    sheetTypes?: { code: string; name: string }[];
    /** Transform config name for all-brand summary (from transform registry) */
    transformName?: string;
    /** Transform config name for brand-specific summary */
    brandTransformName?: string;
    /** Transform config names for variant-specific views keyed by sheet type code */
    variantTransformNames?: Record<string, string>;
    /** Default view option code (e.g., "ytd") */
    defaultView?: string;
    /** Label for the default/main view option (e.g., "All Brand Summary") */
    defaultViewLabel?: string;
  };

  /**
   * Tracker data source configuration
   */
  trackers?: {
    /** Column definitions for detailed/all-brand tracker view */
    detailedColumns: TableColumnConfig[];
    /** Column definitions for specific brand tracker view (if different) */
    brandColumns?: TableColumnConfig[];
    /** Available periods for filtering */
    periods: PeriodOption[];
    /** Default period to show */
    defaultPeriod: string;
    /** Field name in API response that contains the period */
    periodField?: string;
    /** Transform config name for detailed summary (from transform registry) */
    transformName?: string;
    /** Transform config name for brand-specific tracker */
    brandTransformName?: string;
    /** Default view option code (e.g., "detailed") */
    defaultView?: string;
    /** Label for the default/main view option (e.g., "Detailed Summary") */
    defaultViewLabel?: string;
    /** Whether this client has a period filter dropdown (separate from view selector) */
    hasPeriodFilter?: boolean;
    /** Period filter configuration */
    periodFilter?: PeriodFilterConfig;
  };

  /**
   * Brand configuration (for clients with brand breakdown)
   */
  brands?: {
    /** List of brand names */
    list: string[];
    /** Whether brands appear in summary view */
    inSummary?: boolean;
    /** Whether brands appear in tracker view */
    inTrackers?: boolean;
  };

  /**
   * API configuration - defines which endpoints to use for data fetching
   * If not specified, uses default endpoints for the client
   */
  api?: {
    /**
     * Whether this client uses custom API endpoints
     * If true, the component will use the endpoint names defined here
     */
    useCustomEndpoints?: boolean;

    /**
     * Summary data endpoints
     */
    summary?: {
      /** Endpoint name for all-brand/default summary data */
      defaultEndpoint?: string;
      /** Endpoint name for brand-specific summary data */
      brandEndpoint?: string;
    };

    /**
     * Tracker data endpoints
     */
    trackers?: {
      /** Endpoint name for detailed/all-brand tracker data */
      defaultEndpoint?: string;
      /** Endpoint name for brand-specific tracker data */
      brandEndpoint?: string;
    };
  };

  /**
   * Legacy transform configuration - how to process API data
   * @deprecated Use transformName/brandTransformName in summary/trackers config instead
   */
  transforms?: {
    /** Field mapping from API response to display columns */
    fieldMap?: Record<string, string>;
    /** Fields that contain percentages (will be multiplied by 100 if needed) */
    percentageFields?: string[];
    /** Whether to aggregate data or pass through */
    aggregateByMediaType?: boolean;
    /** Filter type value (e.g., "ALL") */
    typeFilter?: string;
  };
}
