import { apiClient } from "./client";

// Tracker interface representing individual market files in a consolidation job
export interface ConsolidationTracker {
  file_name: string;
  market_name: string;
  market_code: string;
}

// Detailed tracker interface with additional fields
export interface ConsolidationTrackerDetail {
  id: number;
  file_name: string;
  market_code: string;
  market_name: string;
  year: number;
  uploaded_at: string;
}

// Consolidation job interface (for list)
export interface ConsolidationJob {
  id: string;
  client_name: string;
  analyzed_by_email: string;
  registered_date: string;
  completed_date: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  trackers: ConsolidationTracker[];
  excel_path?: string;
  excel_download_url?: string;
  ppt_path?: string;
  ppt_download_url?: string;
}

// Detailed consolidation job interface
export interface ConsolidationJobDetail {
  id: string;
  client_id: number;
  client_name: string;
  analyzed_by_id: number;
  analyzed_by_email: string;
  analyzed_by_name: string;
  registered_date: string;
  started_at: string | null;
  completed_date: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  ytd_month: string;
  excel_path: string | null;
  excel_download_url: string | null;
  ppt_path: string | null;
  ppt_download_url: string | null;
  error_message: string | null;
  trackers: ConsolidationTrackerDetail[];
}

// API response interface with pagination
export interface ConsolidationHistoryResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ConsolidationJob[];
}

// Query parameters for history endpoint
export interface ConsolidationHistoryParams {
  page?: number;
  page_size?: number;
  client_id?: number;
  status?: "pending" | "processing" | "completed" | "failed";
  my_jobs_only?: boolean;
}

// API functions
export const consolidationApi = {
  // Get consolidation history with pagination and filters
  async getHistory(
    params: ConsolidationHistoryParams = {}
  ): Promise<ConsolidationHistoryResponse> {
    const response = await apiClient.get("/api/v1/consolidation/history", {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        ...(params.client_id && { client_id: params.client_id }),
        ...(params.status && { status: params.status }),
        ...(params.my_jobs_only !== undefined && {
          my_jobs_only: params.my_jobs_only,
        }),
      },
    });
    return response.data;
  },

  // Get single consolidation job by ID
  async getJob(jobId: string): Promise<ConsolidationJob> {
    const response = await apiClient.get(`/api/v1/consolidation/${jobId}`);
    return response.data;
  },

  // Get detailed consolidation job information
  async getJobDetail(jobId: string): Promise<ConsolidationJobDetail> {
    const response = await apiClient.get(
      `/api/v1/consolidation/history/${jobId}`
    );
    return response.data;
  },
};
