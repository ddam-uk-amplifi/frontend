import { apiClient } from './client';

// ============================================
// TYPES
// ============================================

export interface QueryParams {
  client: string;
  dataSource: 'summary' | 'trackers' | '';
  market?: string;
  period?: string;
  selectedFields: Record<string, string[]>;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface DashboardDataResponse {
  data: ChartDataPoint[];
  metadata: {
    totalRows: number;
    aggregationType: string;
    lastUpdated: string;
    queryExecutionTime: number;
  };
  availableMetrics: string[];
  availableDimensions: string[];
}

export interface ExportPPTRequest {
  graphs: Array<{
    id: string;
    title: string;
    chartType: string;
    slideNumber: number;
    data: ChartDataPoint[];
  }>;
  reportTitle: string;
  client: string;
}

export interface ExportPPTResponse {
  downloadUrl: string;
  expiresAt: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch dashboard data based on query parameters
 * This is the main data fetching function for visualizations
 */
export async function fetchDashboardData(params: QueryParams): Promise<DashboardDataResponse> {
  const response = await apiClient.post<DashboardDataResponse>('/api/v1/dashboard/query', {
    client: params.client,
    data_source: params.dataSource,
    market: params.market || null,
    period: params.period || null,
    selected_fields: params.selectedFields,
  });
  
  return response.data;
}

/**
 * Get available field groups for a client/data source combination
 */
export async function fetchFieldGroups(client: string, dataSource: string) {
  const response = await apiClient.get('/api/v1/dashboard/fields', {
    params: { client, data_source: dataSource },
  });
  
  return response.data;
}

/**
 * Generate PPT report from selected graphs
 */
export async function generatePPTReport(request: ExportPPTRequest): Promise<ExportPPTResponse> {
  const response = await apiClient.post<ExportPPTResponse>('/api/v1/dashboard/export/ppt', request);
  return response.data;
}

/**
 * Get chart recommendations based on selected fields
 * (Could be AI-powered in the future)
 */
export async function getChartRecommendations(selectedFields: Record<string, string[]>) {
  const response = await apiClient.post('/api/v1/dashboard/recommendations', {
    selected_fields: selectedFields,
  });
  
  return response.data;
}
