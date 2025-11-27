import { apiClient } from "./client";

export interface RealTestDeliveryLog {
  id: number;
  manual_name: string;
  team_name: string;
  channel: string;
  status: string;
  message_id?: string;
  thread_ts?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  message_deleted: boolean;
  deleted_at?: string;
  deleted_by_user_id?: string;
  deleted_by_user?: {
    id: string;
    username: string;
  };
}

export interface DeliveryLogsResponse {
  logs: RealTestDeliveryLog[];
  total: number;
}

export interface MonitoringStatus {
  is_monitoring: boolean;
  last_check_time?: string;
  active_deliveries_count: number;
  error_count: number;
}

// Fetch delivery logs with pagination and filters
export const fetchDeliveryLogs = async (params: {
  page?: number;
  per_page?: number;
  status_filter?: string;
  search?: string;
}): Promise<DeliveryLogsResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.append("page", params.page.toString());
  if (params.per_page)
    searchParams.append("per_page", params.per_page.toString());
  if (params.status_filter)
    searchParams.append("status_filter", params.status_filter);
  if (params.search) searchParams.append("search", params.search);

  const response = await apiClient.get(
    `/api/v1/real-test-delivery/logs?${searchParams.toString()}`,
  );
  return response.data;
};

// Get monitoring status
export const fetchMonitoringStatus = async (): Promise<MonitoringStatus> => {
  const response = await apiClient.get("/api/v1/real-test-delivery/status");
  return response.data;
};

// Start monitoring
export const startMonitoring = async (): Promise<{ message: string }> => {
  const response = await apiClient.post("/api/v1/real-test-delivery/start");
  return response.data;
};

// Stop monitoring
export const stopMonitoring = async (): Promise<{ message: string }> => {
  const response = await apiClient.post("/api/v1/real-test-delivery/stop");
  return response.data;
};

// Retry delivery
export const retryDelivery = async (
  logId: number,
): Promise<{
  success: boolean;
  message: string;
  log?: RealTestDeliveryLog;
}> => {
  const response = await apiClient.post(
    `/api/v1/real-test-delivery/logs/${logId}/retry`,
  );
  return response.data;
};

// Delete Slack message
export const deleteSlackMessage = async (
  logId: number,
): Promise<{
  success: boolean;
  message: string;
  log?: RealTestDeliveryLog;
}> => {
  const response = await apiClient.delete(
    `/api/v1/real-test-delivery/logs/${logId}/message`,
  );
  return response.data;
};

// Bulk operations
export const bulkRetryDeliveries = async (
  logIds: number[],
): Promise<{
  success: boolean;
  message: string;
  results: { log_id: number; success: boolean; message: string }[];
}> => {
  const response = await apiClient.post(
    "/api/v1/real-test-delivery/bulk/retry",
    {
      log_ids: logIds,
    },
  );
  return response.data;
};

export const bulkDeleteMessages = async (
  logIds: number[],
): Promise<{
  success: boolean;
  message: string;
  results: { log_id: number; success: boolean; message: string }[];
}> => {
  const response = await apiClient.post(
    "/api/v1/real-test-delivery/bulk/delete",
    {
      log_ids: logIds,
    },
  );
  return response.data;
};
