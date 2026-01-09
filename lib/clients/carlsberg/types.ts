// ============================================
// CARLSBERG CLIENT TYPES
// ============================================
// All Carlsberg-specific TypeScript interfaces

// ============================================
// MEDIA DATA TYPES (Tracker buy_specifics)
// ============================================

export interface CarlsbergMediaDataGeneralItem {
  id: number;
  market_id: number;
  row_index?: number;
  field_value?: string;
  buy_specifics?: Record<string, string | number | null>;
}

export interface CarlsbergMediaDataMonthlyItem {
  id: number;
  market_id: number;
  general_data_id: number;
  row_index?: number;
  period: string;
  field_value?: string;
  net_net_cost?: number | null;
  actual_units?: number | null;
  net_net_cpu?: number | null;
  cpu_index?: number | null;
  savings?: number | null;
  savings_pct?: number | null;
}

export interface CarlsbergMediaDataResponse {
  media_type: string;
  consolidation_job_id: string;
  period?: string | null;
  field_name?: string | null;
  field_value?: string | null;
  general: CarlsbergMediaDataGeneralItem[];
  monthly: CarlsbergMediaDataMonthlyItem[];
  counts: {
    general: number;
    monthly: number;
  };
}

// ============================================
// CONSOLIDATED OVERVIEW TYPES
// ============================================

export interface CarlsbergConsolidatedOverviewItem {
  id: number;
  market_id?: number;
  market?: string;
  media?: string; // Media type (TV, Online, Print, TOTAL, etc.)
  fy_actual_media_expenditure?: number | null;
  fy_yoy_comparable_media_expenditure?: number | null;
  fy_measured_spend_pct?: number | null;
  fy_savings_delivery?: number | null;
  fy_value_achievement?: number | null;
  ytd_total_ytd_media_expenditure?: number | null;
  ytd_affectable_spend?: number | null;
  ytd_yoy_comparable_media_expenditure?: number | null;
  ytd_measured_spend_pct?: number | null;
  ytd_savings_delivery_vs_adjusted_pitch_grid_for_inflation?: number | null;
  ytd_value_achievement?: number | null;
  inflation_media_inflation_pct?: number | null;
  inflation_cost_avoidance_ytd?: number | null;
  inflation_cost_avoidance_fy?: number | null;
}

export interface CarlsbergConsolidatedOverviewResponse {
  data: CarlsbergConsolidatedOverviewItem[];
  total_records: number;
  consolidation_job_id?: string;
}

// ============================================
// CONSOLIDATED MEU TYPES
// ============================================

export interface CarlsbergConsolidatedMEUItem {
  id: number;
  market_id?: number;
  market?: string;
  total_spend_budgeted?: number | null;
  fy_total_cost_avoidance?: number | null;
  fy_total_cost_avoidance_pct?: number | null;
  fy_projected_spend?: number | null;
  fy_projected_measured_spend?: number | null;
  measured_vs_affectable_media_spend_pct?: number | null;
  fy_projected_savings_delivery?: number | null;
  fy_projected_value_achievement_pct?: number | null;
  fy1_cost_avoidance_savings?: number | null;
  h1_total_spend?: number | null;
  h1_total_cost_avoidance?: number | null;
  h1_total_cost_avoidance_pct?: number | null;
  h1_affectable_spend?: number | null;
  h1_measured_spend?: number | null;
  h1_measured_spend_pct?: number | null;
  h1_baseline_equivalent_spend?: number | null;
  h1_savings_delivery?: number | null;
  h1_value_achievement_pct?: number | null;
  h1_cost_avoidance_savings?: number | null;
  cost_avoidance_ytd?: number | null;
  cost_avoidance_fy?: number | null;
  tv_prime_time?: number | null;
  tv_pib?: number | null;
  tv_reach?: number | null;
  digital_compliance_rate?: number | null;
}

export interface CarlsbergConsolidatedMEUResponse {
  data: CarlsbergConsolidatedMEUItem[];
  total_records: number;
  consolidation_job_id?: string;
}
