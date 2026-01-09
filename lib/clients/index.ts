// ============================================
// CLIENT REGISTRY
// ============================================

import type {
  ClientConfig,
  ClientSchema,
  ClientModule,
  ChartThresholds,
  ChartPreferences,
  TableViewConfig,
  TableColumnConfig,
  PeriodOption,
} from "./types";

// Re-export types for convenience
export * from "./types";

// Re-export transform utilities
export {
  transformDataWithConfig,
  getTransformConfig,
  registerTransforms,
  getRegisteredTransformNames,
  normalizeToTitleCase,
  type TableRow,
  type TransformConfig,
} from "./transforms";

// Re-export hooks
export {
  useTableViewData,
  tableViewQueryKeys,
  type UseTableViewDataParams,
  type UseTableViewDataResult,
} from "./hooks";

// Re-export API utilities
export {
  fetchClientData,
  getClientApiConfig,
  hasGenericApi,
  clientApiRegistry,
  type ClientApiConfig,
  type EndpointConfig,
  type EndpointParam,
  type FetchParams,
  type FetchResult,
  type HttpMethod,
} from "./api";

/**
 * Default chart thresholds used when client doesn't specify
 */
export const DEFAULT_CHART_THRESHOLDS: ChartThresholds = {
  highCardinalityThreshold: 15,
  maxPieCategories: 7,
  maxBarCategories: 20,
};

// Import transform registration function
import { registerTransforms } from "./transforms";

// Import all client modules
import * as arla from "./arla";
import * as kering from "./kering";
import * as carlsberg from "./carlsberg";

/**
 * Client registry - maps client slug to module
 * Add new clients here
 */
const clientRegistry: Record<string, ClientModule> = {
  arla,
  kering,
  carlsberg,
  // Add new clients here:
  // newclient: newclientModule,
};

// ============================================
// REGISTER CLIENT TRANSFORMS
// ============================================
// Each client module that has transforms should export a `transforms` object
// Register them here so they're available globally

// Register Kering transforms
if (kering.keringTransforms) {
  registerTransforms(kering.keringTransforms);
}

// Register Carlsberg transforms
if (carlsberg.carlsbergTransforms) {
  registerTransforms(carlsberg.carlsbergTransforms);
}

// Add new client transform registrations here:
// if (newclient.newclientTransforms) {
//   registerTransforms(newclient.newclientTransforms);
// }

/**
 * Get a client module by slug
 */
export function getClient(slug: string): ClientModule | null {
  return clientRegistry[slug.toLowerCase()] || null;
}

/**
 * Get list of all client slugs
 */
export function getClientSlugs(): string[] {
  return Object.keys(clientRegistry);
}

/**
 * Get list of all client names (display names)
 */
export function getClientNames(): string[] {
  return Object.values(clientRegistry).map((client) => client.config.name);
}

/**
 * Get all client configs
 */
export function getAllClientConfigs(): ClientConfig[] {
  return Object.values(clientRegistry).map((client) => client.config);
}

/**
 * Get client schema by slug
 */
export function getClientSchema(slug: string): ClientSchema | null {
  const client = getClient(slug);
  return client?.schema || null;
}

/**
 * Get client config by slug
 */
export function getClientConfig(slug: string): ClientConfig | null {
  const client = getClient(slug);
  return client?.config || null;
}

/**
 * Get client ID by name (for backwards compatibility)
 */
export function getClientIdByName(name: string): number | null {
  const client = getClient(name.toLowerCase());
  return client?.config.id || null;
}

/**
 * Build client data schemas map (for backwards compatibility with QueryBuilderPanel)
 */
export function getClientDataSchemas(): Record<
  string,
  { summary: ClientSchema["summary"]; trackers: ClientSchema["trackers"] }
> {
  const schemas: Record<
    string,
    { summary: ClientSchema["summary"]; trackers: ClientSchema["trackers"] }
  > = {};

  for (const client of Object.values(clientRegistry)) {
    // Use display name as key for backwards compatibility
    schemas[client.config.name] = {
      summary: client.schema.summary,
      trackers: client.schema.trackers,
    };
  }

  return schemas;
}

/**
 * Get chart preferences for a client (with defaults)
 */
export function getClientChartPreferences(slug: string): ChartPreferences & {
  thresholds: ChartThresholds;
} {
  const client = getClient(slug);
  const prefs = client?.config.chartPreferences || {};

  return {
    preferredChartTypes: prefs.preferredChartTypes,
    disabledChartTypes: prefs.disabledChartTypes,
    thresholds: {
      ...DEFAULT_CHART_THRESHOLDS,
      ...prefs.thresholds,
    },
  };
}

/**
 * Get chart thresholds for a client (with defaults)
 */
export function getClientChartThresholds(slug: string): ChartThresholds {
  return getClientChartPreferences(slug).thresholds;
}

// ============================================
// TABLE VIEW HELPERS
// ============================================

/**
 * Get table view configuration for a client
 */
export function getClientTableView(slug: string): TableViewConfig | null {
  const client = getClient(slug);
  return client?.tableView || null;
}

/**
 * Get tracker periods for a client
 * Returns default periods if client doesn't have custom ones
 */
export function getClientTrackerPeriods(slug: string): PeriodOption[] {
  const tableView = getClientTableView(slug);
  if (tableView?.trackers?.periods) {
    return tableView.trackers.periods;
  }
  // Default periods for clients without custom config
  return [
    { code: "Jan", name: "January" },
    { code: "Feb", name: "February" },
    { code: "Mar", name: "March" },
    { code: "Apr", name: "April" },
    { code: "May", name: "May" },
    { code: "Jun", name: "June" },
    { code: "Jul", name: "July" },
    { code: "Aug", name: "August" },
    { code: "Sep", name: "September" },
    { code: "Oct", name: "October" },
    { code: "Nov", name: "November" },
    { code: "Dec", name: "December" },
  ];
}

/**
 * Get default tracker period for a client
 */
export function getClientDefaultTrackerPeriod(slug: string): string {
  const tableView = getClientTableView(slug);
  return tableView?.trackers?.defaultPeriod || "Jan";
}

/**
 * Get tracker columns for a client
 * @param slug - client slug
 * @param isBrandView - whether to get brand-specific columns
 */
export function getClientTrackerColumns(
  slug: string,
  isBrandView: boolean = false
): TableColumnConfig[] | null {
  const tableView = getClientTableView(slug);
  if (!tableView?.trackers) return null;

  if (isBrandView && tableView.trackers.brandColumns) {
    return tableView.trackers.brandColumns;
  }
  return tableView.trackers.detailedColumns;
}

/**
 * Get summary columns for a client
 * @param slug - client slug
 * @param sheetType - optional sheet type for variant-specific columns (e.g., "meu")
 */
export function getClientSummaryColumns(
  slug: string,
  sheetType?: string
): TableColumnConfig[] | null {
  const tableView = getClientTableView(slug);
  if (!tableView?.summary) return null;

  // Check for variant-specific columns
  if (sheetType && tableView.summary.variantColumns?.[sheetType]) {
    return tableView.summary.variantColumns[sheetType];
  }

  return tableView.summary.columns || null;
}

/**
 * Get summary transform name for a client
 * @param slug - client slug
 * @param sheetType - optional sheet type for variant-specific transform (e.g., "meu")
 */
export function getClientSummaryTransformName(
  slug: string,
  sheetType?: string
): string | null {
  const tableView = getClientTableView(slug);
  if (!tableView?.summary) return null;

  // Check for variant-specific transform
  if (sheetType && tableView.summary.variantTransformNames?.[sheetType]) {
    return tableView.summary.variantTransformNames[sheetType];
  }

  return tableView.summary.transformName || null;
}

/**
 * Get brands list for a client
 */
export function getClientBrands(slug: string): string[] {
  const tableView = getClientTableView(slug);
  return tableView?.brands?.list || [];
}

/**
 * Check if client has brands in a specific data source
 */
export function clientHasBrandsIn(
  slug: string,
  dataSource: "summary" | "trackers"
): boolean {
  const tableView = getClientTableView(slug);
  if (!tableView?.brands) return false;

  if (dataSource === "summary") {
    return tableView.brands.inSummary ?? false;
  }
  return tableView.brands.inTrackers ?? false;
}
