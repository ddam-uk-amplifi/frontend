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
// EXTRACTED FILES TYPES
// ============================================

export interface ExtractedFile {
  id: number;
  tracker_file_id: number;
  tracker_file_name: string;
  market_id: number;
  market_name: string;
  market_code: string;
  year: number;
  status: string;
  created_at: string | null;
}

export interface ExtractedFilesResponse {
  client: string;
  total: number;
  files: ExtractedFile[];
}

// ============================================
// CONSOLIDATED SUMMARY TYPES
// ============================================

export interface ConsolidatedSummaryParams {
  clientName: string;
  consolidationJobId: string;
  sheetType: 'ytd' | 'fyfc';
  fields: string[];
  marketId?: number;
  mediaType?: string;
}

export interface ConsolidatedSummaryDataPoint {
  market_id: number;
  market_name: string;
  media_type: string;
  year: number;
  [key: string]: string | number | null;
}

export interface ConsolidatedSummaryResponse {
  sheet_type: string;
  consolidation_job_id: string;
  requested_fields: string[];
  total_records: number;
  data: ConsolidatedSummaryDataPoint[];
}

// Field mapping from frontend field IDs to backend field names
export const FRONTEND_TO_BACKEND_FIELD_MAP: Record<string, string> = {
  'total-net-net-spend': 'total_net_net_spend',
  'total-addressable-net-net-spend': 'total_addressable_net_net_spend',
  'total-net-net-measured': 'total_net_net_measured',
  'measured-spend-pct': 'measured_spend_pct',
  'savings-value': 'savings_value',
  'savings-pct': 'savings_pct',
  'inflation-pct': 'inflation_pct',
  'inflation-mitigation': 'inflation_migration_pct',
  'inflation-after-mitigation-pct': 'inflation_after_migration_pct',
};

// Reverse mapping for displaying data
export const BACKEND_TO_FRONTEND_FIELD_MAP: Record<string, string> = {
  'total_net_net_spend': 'Total Net Net Spend',
  'total_addressable_net_net_spend': 'Total Addressable Net Net Spend',
  'total_net_net_measured': 'Total Net Net Measured',
  'measured_spend_pct': 'Measured Spend %',
  'savings_value': 'Savings Value',
  'savings_pct': 'Savings %',
  'inflation_pct': 'Inflation %',
  'inflation_migration_pct': 'Inflation Mitigation',
  'inflation_after_migration_pct': 'Inflation After Mitigation %',
};

// ============================================
// TRACKER SUMMARY TYPES
// ============================================

export type TrackerMediaType = 'tv' | 'radio' | 'print' | 'ooh' | 'online' | 'cinema';
export type TrackerDataLevel = 'general' | 'monthly' | 'percentile';

export interface TrackerSummaryParams {
  clientName: string;
  clientId: number;
  mediaType: TrackerMediaType;
  fields?: string[];
  dataLevel?: TrackerDataLevel;
  marketId?: number;
  month?: string;
  /** @deprecated Use clientId instead */
  extractedFileId?: number;
}

export interface TrackerSummaryDataPoint {
  id: number;
  market_id: number;
  market_name: string;
  month?: string;
  [key: string]: string | number | null | undefined;
}

export interface TrackerSummaryResponse {
  media_type: string;
  data_level: string;
  extracted_file_id: number;
  requested_fields: string[];
  total_records: number;
  data: TrackerSummaryDataPoint[];
}

// New complete endpoint response types
export interface TrackerCompleteResponse {
  media_type: string;
  general: TrackerSummaryDataPoint[];
  monthly: TrackerSummaryDataPoint[];
  percentile?: TrackerSummaryDataPoint[];
  counts: {
    general: number;
    monthly: number;
    percentile?: number;
  };
}

// Tracker Summary (from Summary_YTD sheets) response
export interface TrackerSummaryItem {
  id: number;
  market_id: number;
  period: string;
  data_type: string;
  media_type: string;
  total_net_net_spend: number | null;
  total_non_addressable_spend: number | null;
  total_addressable_spend: number | null;
  measured_spend: number | null;
  measured_spend_pct: number | null;
  benchmark_equivalent_net_net_spend: number | null;
  value_loss: number | null;
  value_loss_pct: number | null;
}

export interface TrackerAvailableFieldsResponse {
  media_type?: string;
  fields?: string[];
  media_types?: Record<string, string[]>;
}

// Tracker field mapping from frontend to backend
export const TRACKER_FRONTEND_TO_BACKEND_FIELD_MAP: Record<string, Record<string, string>> = {
  tv: {
    // General
    'fy-net-net-spend': 'fy_total_net_net_spend',
    'fy-measured-spend': 'fy_total_measured_spend',
    'fy-actual-units': 'fy_total_actual_units',
    'fy-benchmark-spend': 'fy_total_benchmark_equivalent_net_net_spend',
    'fy-savings': 'fy_total_savings',
    'fy-savings-pct': 'fy_total_savings_pct',
    // Monthly
    'net-net-spend': 'net_net_spend',
    'seasonality': 'seasonality',
    'rate-card-spend': 'total_rate_card_spend',
    'actual-30': 'actual_30',
    'prime-time-30': 'prime_time_30',
    'cpu-discount': 'net_net_cpu_or_discount_achieved',
    'benchmark-spend': 'benchmark_equivalent_net_net_spend',
    'value-loss': 'value_loss',
    'value-loss-pct': 'value_loss_pct',
    'qecs-pct': 'qecs_pct',
    // YTD
    'ytd-net-net-spend': 'ytd_total_net_net_spend',
    'ytd-measured-spend': 'ytd_total_measured_spend',
    'ytd-savings': 'ytd_total_savings',
    'ytd-savings-pct': 'ytd_total_savings_pct',
  },
  radio: {
    // General
    'fy-net-net-spend': 'fy_total_net_net_spend',
    'fy-measured-spend': 'fy_total_measured_spend',
    'fy-insertions': 'fy_insertions',
    'fy-cg-equivalent': 'fy_cg_equivalent',
    'fy-savings': 'fy_savings',
    'fy-savings-pct': 'fy_savings_pct',
    // Monthly
    'net-net-spend': 'net_net_spend',
    'seasonality': 'seasonality',
    'actual-30': 'actual_30',
    'drive-time-30': 'drive_time_30',
    'cpu-discount-pct': 'net_net_cpu_or_discount_achieved_pct',
    'benchmark-spend': 'benchmark_equivalent_net_net_spend',
    'value-loss': 'calculated_value_loss',
    'value-loss-pct': 'value_loss_pct',
    // YTD
    'ytd-net-net-spend': 'ytd_total_net_net_spend',
    'ytd-measured-spend': 'ytd_total_measured_spend',
    'ytd-insertions': 'ytd_insertions',
    'ytd-savings': 'ytd_savings',
    'ytd-savings-pct': 'ytd_savings_pct',
  },
  print: {
    // General
    'fy-gross-spend': 'fy_gross_spend',
    'fy-net-spend': 'fy_net_spend',
    'fy-discount-pct': 'fy_estimated_discount_pct',
    'fy-net-net-spend': 'fy_net_net_spend',
    'fy-measured-spend': 'fy_measured_spend',
    'fy-savings': 'fy_savings',
    'fy-savings-pct': 'fy_savings_pct',
    // Monthly
    'net-net-spend': 'net_net_spend',
    'gross-spend': 'gross_spend',
    'net-spend': 'net_spend',
    'discount-pct': 'estimated_discount_pct',
    'insertions': 'no_of_insertions',
    // YTD
    'ytd-gross-spend': 'ytd_gross_spend',
    'ytd-net-spend': 'ytd_net_spend',
    'ytd-net-net-spend': 'ytd_net_net_spend',
    'ytd-measured-spend': 'ytd_measured_spend',
    'ytd-savings': 'ytd_savings',
    'ytd-savings-pct': 'ytd_savings_pct',
  },
  ooh: {
    // General
    'fy-net-net-spend': 'fy_net_net_spend',
    'fy-measured-spend': 'fy_measured_spend',
    'fy-benchmark-spend': 'fy_benchmark_equivalent_net_net_spend',
    'fy-savings': 'fy_savings',
    'fy-savings-pct': 'fy_savings_pct',
    // Monthly
    'net-net-spend': 'net_net_spend',
    'measured-spend': 'measured_spend',
    'benchmark-spend': 'benchmark_equivalent_net_net_spend',
    'savings': 'savings',
    'savings-pct': 'savings_pct',
  },
  online: {
    // General
    'fy-net-net-spend': 'fy_net_net_spend',
    'fy-measured-spend': 'fy_measured_spend',
    'fy-savings': 'fy_savings',
    'fy-savings-pct': 'fy_savings_pct',
    // Monthly
    'net-net-spend': 'net_net_spend',
    'measured-spend': 'measured_spend',
    'impressions': 'impressions',
    'cpm': 'cpm',
  },
  cinema: {
    // General
    'fy-net-net-spend': 'fy_net_net_spend',
    'fy-measured-spend': 'fy_measured_spend',
    'fy-savings': 'fy_savings',
    'fy-savings-pct': 'fy_savings_pct',
    // Monthly
    'net-net-spend': 'net_net_spend',
    'admissions': 'admissions',
    'cpa': 'cpa',
  },
};

// Backend to frontend display names for tracker fields
export const TRACKER_BACKEND_TO_DISPLAY_MAP: Record<string, string> = {
  // TV/Radio General
  'fy_total_net_net_spend': 'FY Net Net Spend',
  'fy_total_measured_spend': 'FY Measured Spend',
  'fy_total_actual_units': 'FY Actual Units',
  'fy_total_benchmark_equivalent_net_net_spend': 'FY Benchmark Spend',
  'fy_total_savings': 'FY Savings',
  'fy_total_savings_pct': 'FY Savings %',
  // Monthly common
  'net_net_spend': 'Net Net Spend',
  'seasonality': 'Seasonality',
  'total_rate_card_spend': 'Rate Card Spend',
  'actual_30': 'Actual 30s',
  'prime_time_30': 'Prime Time 30s',
  'drive_time_30': 'Drive Time 30s',
  'net_net_cpu_or_discount_achieved': 'CPU/Discount',
  'net_net_cpu_or_discount_achieved_pct': 'CPU/Discount %',
  'benchmark_equivalent_net_net_spend': 'Benchmark Spend',
  'value_loss': 'Value Loss',
  'value_loss_pct': 'Value Loss %',
  'qecs_pct': 'QECs %',
  'calculated_value_loss': 'Value Loss',
  // YTD
  'ytd_total_net_net_spend': 'YTD Net Net Spend',
  'ytd_total_measured_spend': 'YTD Measured Spend',
  'ytd_total_savings': 'YTD Savings',
  'ytd_total_savings_pct': 'YTD Savings %',
  'ytd_insertions': 'YTD Insertions',
  // Print
  'fy_gross_spend': 'FY Gross Spend',
  'fy_net_spend': 'FY Net Spend',
  'fy_estimated_discount_pct': 'FY Discount %',
  'fy_net_net_spend': 'FY Net Net Spend',
  'fy_measured_spend': 'FY Measured Spend',
  'fy_savings': 'FY Savings',
  'fy_savings_pct': 'FY Savings %',
  'gross_spend': 'Gross Spend',
  'net_spend': 'Net Spend',
  'estimated_discount_pct': 'Discount %',
  'no_of_insertions': 'Insertions',
  'measured_spend': 'Measured Spend',
  'savings': 'Savings',
  'savings_pct': 'Savings %',
  // Online
  'impressions': 'Impressions',
  'cpm': 'CPM',
  // Cinema
  'admissions': 'Admissions',
  'cpa': 'CPA',
};

/**
 * Convert frontend tracker field IDs to backend field names
 */
export function mapTrackerFieldsToBackend(
  frontendFields: string[],
  mediaType: TrackerMediaType
): string[] {
  const mapping = TRACKER_FRONTEND_TO_BACKEND_FIELD_MAP[mediaType] || {};
  
  return frontendFields
    .map(field => {
      // Remove media type prefix if present (e.g., 'tv-net-net-spend' -> 'net-net-spend')
      const cleanField = field.replace(new RegExp(`^${mediaType}-`), '');
      return mapping[cleanField] || null;
    })
    .filter((field): field is string => field !== null);
}

/**
 * Determine data level from selected tracker fields
 */
export function getTrackerDataLevel(selectedFields: string[]): TrackerDataLevel {
  // FY fields indicate general level
  const hasFyFields = selectedFields.some(f => f.includes('fy-'));
  const hasYtdFields = selectedFields.some(f => f.includes('ytd-'));
  
  // Monthly-specific fields
  const hasMonthlyFields = selectedFields.some(f => 
    f.includes('seasonality') || 
    f.includes('actual-30') ||
    f.includes('prime-time') ||
    f.includes('drive-time') ||
    f.includes('cpu-') ||
    f.includes('value-loss') ||
    f.includes('qecs') ||
    (f.includes('net-net-spend') && !f.includes('fy-') && !f.includes('ytd-'))
  );
  
  if (hasFyFields && !hasMonthlyFields) return 'general';
  if (hasMonthlyFields || hasYtdFields) return 'monthly';
  
  return 'general'; // default
}

/**
 * Extract media type from selected field IDs
 * Fields are prefixed with media type like 'tv-fy-net-net-spend'
 */
export function getTrackerMediaTypeFromFields(selectedFields: Record<string, string[]>): TrackerMediaType | 'summary' | null {
  const allFields = Object.values(selectedFields).flat();
  
  for (const field of allFields) {
    if (field.startsWith('summary-')) return 'summary';
    if (field.startsWith('tv-')) return 'tv';
    if (field.startsWith('radio-')) return 'radio';
    if (field.startsWith('print-')) return 'print';
    if (field.startsWith('ooh-')) return 'ooh';
    if (field.startsWith('online-')) return 'online';
    if (field.startsWith('cinema-')) return 'cinema';
  }
  
  // Also check group IDs
  const groups = Object.keys(selectedFields).filter(g => selectedFields[g].length > 0);
  for (const group of groups) {
    if (group.includes('-summary')) return 'summary';
    if (group.includes('-tv')) return 'tv';
    if (group.includes('-radio')) return 'radio';
    if (group.includes('-print')) return 'print';
    if (group.includes('-ooh')) return 'ooh';
    if (group.includes('-online')) return 'online';
    if (group.includes('-cinema')) return 'cinema';
  }
  
  return null;
}

/**
 * Convert frontend field IDs to backend field names
 */
export function mapFieldsToBackend(frontendFields: string[]): string[] {
  return frontendFields
    .map(field => {
      // Remove prefix like 'arla-ytd-' or 'arla-fy-'
      const cleanField = field.replace(/^arla-(ytd|fy)-/, '');
      return FRONTEND_TO_BACKEND_FIELD_MAP[cleanField] || null;
    })
    .filter((field): field is string => field !== null);
}

/**
 * Determine sheet type from selected field group
 */
export function getSheetTypeFromFields(selectedFields: Record<string, string[]>): 'ytd' | 'fyfc' | null {
  const groups = Object.keys(selectedFields).filter(g => selectedFields[g].length > 0);
  
  if (groups.some(g => g.includes('ytd'))) return 'ytd';
  if (groups.some(g => g.includes('fy-fc') || g.includes('fyfc'))) return 'fyfc';
  
  // Check individual fields
  for (const group of groups) {
    for (const field of selectedFields[group]) {
      if (field.includes('-ytd-')) return 'ytd';
      if (field.includes('-fy-')) return 'fyfc';
    }
  }
  
  return null;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch extracted files for a client (for tracker data)
 */
export async function fetchExtractedFiles(
  clientName: string,
  marketId?: number,
  year?: number
): Promise<ExtractedFilesResponse> {
  const queryParams = new URLSearchParams();
  
  if (marketId !== undefined) {
    queryParams.append('market_id', marketId.toString());
  }
  
  if (year !== undefined) {
    queryParams.append('year', year.toString());
  }
  
  const queryString = queryParams.toString();
  const url = `/api/v1/client/${clientName.toLowerCase()}/extracted-files${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get<ExtractedFilesResponse>(url);
  return response.data;
}

// ============================================
// LATEST JOB TYPES AND FUNCTIONS
// ============================================

export interface LatestJobResponse {
  consolidation_job_id: string;
  client_id: number;
  client_name: string;
  status: string;
  ytd_month: string | null;
  created_at: string | null;
  completed_at: string | null;
  excel_path: string | null;
  ppt_path: string | null;
}

/**
 * Fetch the latest completed consolidation job for a client
 * This is used to auto-select the job for summary data
 */
export async function fetchLatestJob(
  clientName: string
): Promise<LatestJobResponse> {
  const url = `/api/v1/client/${clientName.toLowerCase()}/latest-job`;
  const response = await apiClient.get<LatestJobResponse>(url);
  return response.data;
}

/**
 * Fetch consolidated summary data with specific fields
 * Uses the new /consolidated/summary endpoint
 */
export async function fetchConsolidatedSummary(
  params: ConsolidatedSummaryParams
): Promise<ConsolidatedSummaryResponse> {
  const { clientName, consolidationJobId, sheetType, fields, marketId, mediaType } = params;
  
  const queryParams = new URLSearchParams({
    consolidation_job_id: consolidationJobId,
    sheet_type: sheetType,
    fields: fields.join(','),
  });
  
  if (marketId !== undefined) {
    queryParams.append('market_id', marketId.toString());
  }
  
  if (mediaType) {
    queryParams.append('media_type', mediaType);
  }
  
  const response = await apiClient.get<ConsolidatedSummaryResponse>(
    `/api/v1/client/${clientName.toLowerCase()}/consolidated/summary?${queryParams.toString()}`
  );
  
  return response.data;
}

/**
 * Helper function to fetch summary data based on selected fields in QueryBuilder
 */
export async function fetchSummaryDataFromSelection(
  clientName: string,
  consolidationJobId: string,
  selectedFields: Record<string, string[]>,
  marketId?: number,
  mediaType?: string
): Promise<ConsolidatedSummaryResponse | null> {
  // Get all selected field IDs
  const allFieldIds = Object.values(selectedFields).flat();
  
  if (allFieldIds.length === 0) {
    return null;
  }
  
  // Determine sheet type from selection
  const sheetType = getSheetTypeFromFields(selectedFields);
  if (!sheetType) {
    console.warn('Could not determine sheet type from selected fields');
    return null;
  }
  
  // Map frontend field IDs to backend field names
  const backendFields = mapFieldsToBackend(allFieldIds);
  
  if (backendFields.length === 0) {
    console.warn('No valid backend fields mapped from selection');
    return null;
  }
  
  return fetchConsolidatedSummary({
    clientName,
    consolidationJobId,
    sheetType,
    fields: backendFields,
    marketId,
    mediaType,
  });
}

// ============================================
// TRACKER API FUNCTIONS
// ============================================

export interface TrackerDataResponse {
  data: Array<Record<string, string | number | null | Record<string, unknown>>>;
  media_type: string;
  data_level: string;
  fields_returned: string[];
  record_count: number;
  available_fields: string[];
}

/**
 * Fetch complete tracker data for a media type
 * Uses the new /tracker/{media}/complete endpoint
 * Auto-resolves to latest consolidation job using client_id
 */
export async function fetchTrackerComplete(
  clientName: string,
  clientId: number,
  mediaType: TrackerMediaType,
  marketId?: number
): Promise<TrackerCompleteResponse> {
  const queryParams = new URLSearchParams({
    client_id: clientId.toString(),
  });
  
  // Only add market_id if it's a valid number (not undefined, null, or NaN)
  if (marketId !== undefined && marketId !== null && !isNaN(marketId)) {
    queryParams.append('market_id', marketId.toString());
  }
  
  const response = await apiClient.get<TrackerCompleteResponse>(
    `/api/v1/client/${clientName.toLowerCase()}/tracker/${mediaType}/complete?${queryParams.toString()}`
  );
  
  return response.data;
}

/**
 * Fetch tracker summary data (from Summary_YTD sheets)
 * This is different from media-specific data (TV, Print, etc.)
 * Returns aggregated spend data by media type
 */
export async function fetchTrackerSummaryData(
  clientName: string,
  clientId: number,
  marketId?: number,
  mediaType?: string
): Promise<TrackerSummaryItem[]> {
  const queryParams = new URLSearchParams({
    client_id: clientId.toString(),
  });
  
  if (marketId !== undefined && marketId !== null && !isNaN(marketId)) {
    queryParams.append('market_id', marketId.toString());
  }
  
  if (mediaType) {
    queryParams.append('media_type', mediaType);
  }
  
  const response = await apiClient.get<TrackerSummaryItem[]>(
    `/api/v1/client/${clientName.toLowerCase()}/tracker/summary?${queryParams.toString()}`
  );
  
  return response.data;
}

/**
 * Fetch tracker data with specific fields
 * Uses the /tracker/data endpoint with field selection
 * @deprecated Use fetchTrackerComplete for simpler integration
 */
export async function fetchTrackerData(
  params: TrackerSummaryParams
): Promise<TrackerDataResponse> {
  const { clientName, clientId, mediaType, fields, dataLevel, marketId } = params;
  
  const queryParams = new URLSearchParams({
    client_id: clientId.toString(),
    media_type: mediaType,
    data_level: dataLevel || 'general',
  });
  
  // Only add fields param if specific fields are requested
  if (fields && fields.length > 0) {
    queryParams.append('fields', fields.join(','));
  }
  
  if (marketId !== undefined) {
    queryParams.append('market_id', marketId.toString());
  }
  
  const response = await apiClient.get<TrackerDataResponse>(
    `/api/v1/client/${clientName.toLowerCase()}/tracker/data?${queryParams.toString()}`
  );
  
  return response.data;
}

/**
 * Fetch tracker summary data with specific fields
 * Uses the new /tracker/summary endpoint
 * @deprecated Use fetchTrackerComplete instead
 */
export async function fetchTrackerSummary(
  params: TrackerSummaryParams
): Promise<TrackerSummaryResponse> {
  const { clientName, clientId, mediaType, fields, dataLevel, marketId, month } = params;
  
  const queryParams = new URLSearchParams({
    client_id: clientId.toString(),
    media_type: mediaType,
    data_level: dataLevel || 'general',
  });
  
  if (fields && fields.length > 0) {
    queryParams.append('fields', fields.join(','));
  }
  
  if (marketId !== undefined) {
    queryParams.append('market_id', marketId.toString());
  }
  
  if (month) {
    queryParams.append('month', month.toUpperCase());
  }
  
  const response = await apiClient.get<TrackerSummaryResponse>(
    `/api/v1/client/${clientName.toLowerCase()}/tracker/summary?${queryParams.toString()}`
  );
  
  return response.data;
}

/**
 * Get available fields for tracker data
 */
export async function fetchTrackerAvailableFields(
  clientName: string,
  mediaType?: TrackerMediaType
): Promise<TrackerAvailableFieldsResponse> {
  const queryParams = mediaType ? `?media_type=${mediaType}` : '';
  
  const response = await apiClient.get<TrackerAvailableFieldsResponse>(
    `/api/v1/client/${clientName.toLowerCase()}/tracker/available-fields${queryParams}`
  );
  
  return response.data;
}

/**
 * Helper function to fetch tracker data based on selected fields in QueryBuilder
 * Uses the /tracker/data endpoint with client_id
 */
export async function fetchTrackerDataFromSelection(
  clientName: string,
  clientId: number,
  mediaType: TrackerMediaType,
  selectedFields: Record<string, string[]>,
  marketId?: number
): Promise<TrackerDataResponse | null> {
  // Get all selected field IDs
  const allFieldIds = Object.values(selectedFields).flat();
  
  if (allFieldIds.length === 0) {
    return null;
  }
  
  // Determine data level from selection
  const dataLevel = getTrackerDataLevel(allFieldIds);
  
  // Map frontend field IDs to backend field names
  const backendFields = mapTrackerFieldsToBackend(allFieldIds, mediaType);
  
  if (backendFields.length === 0) {
    console.warn('No valid backend fields mapped from selection for tracker');
    return null;
  }
  
  // For monthly data, always include 'month' field for x-axis
  if (dataLevel === 'monthly' && !backendFields.includes('month')) {
    backendFields.unshift('month');
  }
  
  return fetchTrackerData({
    clientName,
    clientId,
    mediaType,
    fields: backendFields,
    dataLevel,
    marketId,
  });
}

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

// ============================================
// DASHBOARD PPTX TYPES AND FUNCTIONS
// ============================================

export interface ChartImageForPPT {
  slide_index: number;
  image_base64: string;
  title: string;
  width?: number;
  height?: number;
  top?: number;
  left?: number;
}

export interface DashboardToPPTXRequest {
  client_name: string;
  charts: ChartImageForPPT[];
}

export interface ChartPlacementResult {
  slide_index: number;
  title: string;
  status: 'success' | 'error';
  position?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  error?: string;
}

export interface DashboardToPPTXResponse {
  output_path: string;
  download_url: string;
  charts_placed: number;
  charts_failed: number;
  placements: ChartPlacementResult[];
}

/**
 * Generate PowerPoint from dashboard chart images
 * Takes base64 encoded chart images and creates a PPTX presentation
 */
export async function generateDashboardPPTX(
  request: DashboardToPPTXRequest
): Promise<DashboardToPPTXResponse> {
  console.log('[generateDashboardPPTX] Starting request...');
  console.log('[generateDashboardPPTX] Client:', request.client_name);

  console.log('[generateDashboardPPTX] Number of charts:', request.charts.length);
  console.log('[generateDashboardPPTX] Chart titles:', request.charts.map(c => c.title));
  console.log('[generateDashboardPPTX] Chart slide indices:', request.charts.map(c => c.slide_index));
  
  try {
    console.log('[generateDashboardPPTX] Calling POST /api/v1/dashboard-pptx...');
    const response = await apiClient.post<DashboardToPPTXResponse>(
      '/api/v1/dashboard-pptx',
      request
    );
    console.log('[generateDashboardPPTX] Response received:', response.status);
    console.log('[generateDashboardPPTX] Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('[generateDashboardPPTX] Request failed:', error);
    throw error;
  }
}

/**
 * Helper to capture a chart element as base64 image
 * Uses html2canvas-pro to render the chart to a canvas and export as PNG
 * html2canvas-pro has better support for modern CSS color functions (lab, oklch, etc.)
 */
export async function captureChartAsBase64(
  element: HTMLElement
): Promise<string> {
  console.log('[captureChartAsBase64] Starting capture...');
  console.log('[captureChartAsBase64] Element:', element.tagName, element.className);
  console.log('[captureChartAsBase64] Element dimensions:', element.offsetWidth, 'x', element.offsetHeight);
  
  // Use html2canvas-pro which supports modern CSS color functions (lab, oklch, lch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2canvas = (await import('html2canvas-pro' as any)).default;
  console.log('[captureChartAsBase64] html2canvas-pro loaded');

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2, // Higher quality
    logging: false,
    useCORS: true,
  });
  console.log('[captureChartAsBase64] Canvas created:', canvas.width, 'x', canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  console.log('[captureChartAsBase64] DataURL length:', dataUrl.length);
  return dataUrl;
}
