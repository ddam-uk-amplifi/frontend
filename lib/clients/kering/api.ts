// ============================================
// KERING API CONFIGURATION
// ============================================

import type { ClientApiConfig } from "../api";

/**
 * Kering API configuration
 * Defines all endpoints for Kering data fetching
 */
export const keringApiConfig: ClientApiConfig = {
  enabled: true,
  basePath: "/api/v1/client/kering",

  summary: {
    default: {
      path: "/consolidated/all-brand-summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
        { name: "market", source: "market" },
      ],
      responseDataKey: "data",
    },
    brand: {
      path: "/consolidated/brand-summary",
      method: "GET",
      queryParams: [
        { name: "brand", source: "brand", required: true },
        { name: "market", source: "market" },
        { name: "client_id", source: "clientId" },
        { name: "consolidation_job_id", source: "consolidationJobId" },
      ],
      responseDataKey: "data",
    },
  },

  trackers: {
    default: {
      path: "/tracker/summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "period", source: "period", transform: "uppercase" },
        { name: "media_type", source: "mediaType" },
        { name: "type", source: "type", transform: "uppercase" },
        { name: "markets", source: "market" },
      ],
      responseDataKey: "data",
    },
    brand: {
      path: "/tracker/brand-summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "brand_name", source: "brand", required: true },
        { name: "period", source: "period", transform: "uppercase" },
        { name: "media_type", source: "mediaType" },
        { name: "type", source: "type", transform: "uppercase" },
        { name: "markets", source: "market" },
      ],
      responseDataKey: "data",
    },
  },
};
