// ============================================
// GENERIC CLIENT API LAYER
// ============================================
// This module provides a config-driven API fetching system.
// Adding a new client only requires defining endpoint configs - no new fetch functions needed.

import { apiClient } from "@/lib/api/client";

// Import client-specific API configs
import { keringApiConfig } from "./kering/api";

// ============================================
// TYPES
// ============================================

/**
 * HTTP methods supported by the API
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Parameter definition for an endpoint
 */
export interface EndpointParam {
  /** Parameter name in the query string */
  name: string;
  /** Source field name from the params object */
  source: string;
  /** Whether this parameter is required */
  required?: boolean;
  /** Transform function to apply to the value */
  transform?: "uppercase" | "lowercase" | "string";
}

/**
 * Configuration for a single API endpoint
 */
export interface EndpointConfig {
  /** API endpoint path (can include {placeholders} for path params) */
  path: string;
  /** HTTP method (default: GET) */
  method?: HttpMethod;
  /** Path parameters - values that replace {placeholders} in the path */
  pathParams?: string[];
  /** Query parameters configuration */
  queryParams?: EndpointParam[];
  /** Response data key - if the response wraps data in an object, specify the key */
  responseDataKey?: string;
}

/**
 * Complete API configuration for a client's table view
 */
export interface ClientApiConfig {
  /** Whether this client uses the generic API system */
  enabled: boolean;
  /** Base path prefix for all endpoints (e.g., "/api/v1/client/kering") */
  basePath?: string;
  /** Summary data endpoints */
  summary?: {
    /** Default/all-brand summary endpoint */
    default?: EndpointConfig;
    /** Brand-specific summary endpoint */
    brand?: EndpointConfig;
  };
  /** Tracker data endpoints */
  trackers?: {
    /** Default/detailed tracker endpoint */
    default?: EndpointConfig;
    /** Brand-specific tracker endpoint */
    brand?: EndpointConfig;
  };
}

/**
 * Parameters passed to the fetch function
 */
export interface FetchParams {
  clientId?: number;
  clientName?: string;
  market?: string;
  brand?: string;
  period?: string;
  consolidationJobId?: string;
  [key: string]: string | number | undefined;
}

/**
 * Result from the generic fetch function
 */
export interface FetchResult<T = any> {
  data: T;
  success: boolean;
  error?: string;
}

// ============================================
// GENERIC FETCH FUNCTION
// ============================================

/**
 * Build URL with path parameters replaced and query string appended
 */
function buildUrl(
  basePath: string,
  endpoint: EndpointConfig,
  params: FetchParams
): string {
  let url = basePath ? `${basePath}${endpoint.path}` : endpoint.path;

  // Replace path parameters
  if (endpoint.pathParams) {
    for (const paramName of endpoint.pathParams) {
      const value = params[paramName];
      if (value !== undefined) {
        url = url.replace(`{${paramName}}`, String(value));
      }
    }
  }

  // Build query string
  if (endpoint.queryParams && endpoint.queryParams.length > 0) {
    const queryParams = new URLSearchParams();

    for (const param of endpoint.queryParams) {
      const value = params[param.source];

      if (value === undefined || value === null || value === "") {
        if (param.required) {
          throw new Error(`Required parameter '${param.source}' is missing`);
        }
        continue;
      }

      let finalValue = String(value);

      // Apply transforms
      if (param.transform === "uppercase") {
        finalValue = finalValue.toUpperCase();
      } else if (param.transform === "lowercase") {
        finalValue = finalValue.toLowerCase();
      }

      queryParams.append(param.name, finalValue);
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Generic fetch function that uses endpoint configuration
 */
export async function fetchClientData<T = any>(
  apiConfig: ClientApiConfig,
  endpointType: "summary" | "trackers",
  endpointVariant: "default" | "brand",
  params: FetchParams
): Promise<FetchResult<T>> {
  try {
    // Get endpoint config
    const endpointGroup = apiConfig[endpointType];
    if (!endpointGroup) {
      throw new Error(`No ${endpointType} endpoints configured`);
    }

    const endpoint = endpointGroup[endpointVariant];
    if (!endpoint) {
      throw new Error(`No ${endpointVariant} endpoint configured for ${endpointType}`);
    }

    // Build URL
    const url = buildUrl(apiConfig.basePath || "", endpoint, params);

    // Make request
    const method = endpoint.method || "GET";
    let response;

    if (method === "GET") {
      response = await apiClient.get<any>(url);
    } else if (method === "POST") {
      response = await apiClient.post<any>(url, params);
    } else {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Extract data
    let data = response.data;
    if (endpoint.responseDataKey && data[endpoint.responseDataKey]) {
      data = data[endpoint.responseDataKey];
    }

    return {
      data,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[fetchClientData] Error fetching ${endpointType}/${endpointVariant}:`, message);
    return {
      data: [] as any,
      success: false,
      error: message,
    };
  }
}

// ============================================
// API CONFIG REGISTRY
// ============================================
// Client-specific configs are imported from their respective folders
// and registered here for lookup

/**
 * Registry of all client API configurations
 * Key is the client slug (lowercase)
 */
export const clientApiRegistry: Record<string, ClientApiConfig> = {
  kering: keringApiConfig,
};

/**
 * Get API config for a client by slug
 */
export function getClientApiConfig(clientSlug: string): ClientApiConfig | null {
  return clientApiRegistry[clientSlug.toLowerCase()] || null;
}

/**
 * Check if a client has generic API enabled
 */
export function hasGenericApi(clientSlug: string): boolean {
  const config = getClientApiConfig(clientSlug);
  return config?.enabled || false;
}
