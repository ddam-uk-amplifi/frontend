import type { ClientApiConfig } from "../api";

export const carlsbergApiConfig: ClientApiConfig = {
  enabled: true,
  basePath: "/api/v1/client/carlsberg",

  summary: {
    // Overview endpoint (consolidated data) - maps to "default" variant
    default: {
      path: "/consolidated/overview",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
        { name: "market", source: "market" },
        { name: "media", source: "mediaType" },
      ],
      responseDataKey: "data",
    },
    // MEU endpoint (consolidated MEU data)
    meu: {
      path: "/consolidated/meu",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
        { name: "market", source: "market" },
      ],
      responseDataKey: "data",
    },
    // Consolidated filters endpoint
    filters: {
      path: "/consolidated/filters",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
      ],
    },
  },

  trackers: {
    // Tracker summary endpoint
    default: {
      path: "/tracker/summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
        { name: "summary_type", source: "summaryType" },
        { name: "period", source: "period", transform: "uppercase" },
        { name: "media_type", source: "mediaType" },
        { name: "markets", source: "market" },
        { name: "market_id", source: "marketId" },
      ],
      responseDataKey: "data",
    },
    // Media-specific data endpoint (for detailed buy specifics)
    media: {
      path: "/tracker/media/{mediaType}/data",
      method: "GET",
      pathParams: ["mediaType"],
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
        { name: "period", source: "period", transform: "uppercase" },
        { name: "field_name", source: "fieldName" },
        { name: "field_value", source: "fieldValue" },
        { name: "markets", source: "market" },
        { name: "market_id", source: "marketId" },
        { name: "include_buy_specifics", source: "includeBuySpecifics" },
      ],
      responseDataKey: "data",
    },
    // Tracker filters endpoint
    filters: {
      path: "/tracker/filters",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
      ],
    },
  },
};
