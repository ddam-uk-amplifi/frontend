import type { HealthResponse } from "@/lib/types/api";
import { apiClient } from "./client";

export const healthApi = {
  // Health check endpoint
  healthCheck: async (): Promise<HealthResponse> => {
    const response = await apiClient.get("/api/v1/health");
    return response.data;
  },

  // Root endpoint with API information
  getApiInfo: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get("/api/v1/");
    return response.data;
  },
};
