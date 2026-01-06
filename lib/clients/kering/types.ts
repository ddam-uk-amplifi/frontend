// ============================================
// KERING-SPECIFIC API TYPES
// ============================================

/**
 * Kering Type filter values
 */
export type KeringType = "ALL" | "DIRECT BUY" | "CENTRAL HUB" | "CLIENT BUY";

/**
 * Kering Tracker Summary (from Summary_Overall sheets)
 */
export interface KeringTrackerSummaryItem {
  id: number;
  market_id: number;
  type: string;
  period: string;
  media_type: string;
  total_net_net_media_spend: number | null;
  total_non_affectable_spend: number | null;
  measured_spend: number | null;
  non_measured_spend: number | null;
  total_affectable_spend: number | null;
  measured_spend_pct: number | null;
  total_savings: number | null;
  total_savings_pct: number | null;
  measured_savings: number | null;
  measured_savings_pct: number | null;
  inflation_mitigation: number | null;
  added_value_penalty_avoidance: number | null;
  added_value_penalty_avoidance_pct: number | null;
}

export interface KeringTrackerSummaryResponse {
  consolidation_job_id: string;
  period: string | null;
  media_type: string | null;
  total_records: number;
  data: KeringTrackerSummaryItem[];
}

/**
 * Kering Brand Summary (from Summary_ByBrand sheets)
 */
export interface KeringBrandSummaryItem {
  id: number;
  market_id: number;
  brand_name: string;
  type: string;
  period: string;
  media_type: string;
  total_net_net_media_spend: number | null;
  total_non_affectable_spend: number | null;
  measured_spend: number | null;
  non_measured_spend: number | null;
  total_affectable_spend: number | null;
  measured_spend_pct: number | null;
  total_savings: number | null;
  total_savings_pct: number | null;
  measured_savings: number | null;
  measured_savings_pct: number | null;
  inflation_mitigation: number | null;
  added_value_penalty_avoidance: number | null;
  added_value_penalty_avoidance_pct: number | null;
}

export interface KeringBrandSummaryResponse {
  consolidation_job_id: string;
  brand_name: string | null;
  period: string | null;
  media_type: string | null;
  total_records: number;
  data: KeringBrandSummaryItem[];
}

/**
 * Kering Tracker Filters
 */
export interface KeringTrackerFiltersResponse {
  consolidation_job_id: string;
  periods: string[];
  media_types: string[];
  brands: string[];
  types: string[];
}

/**
 * Kering Consolidated Data (from "YTD By Brand" sheet)
 */
export interface KeringConsolidatedItem {
  id: number;
  market: string;
  brand: string;
  media: string;
  sub_media: string;
  total_net_net_media_spend: number | null;
  total_non_affectable_spend: number | null;
  measured_spend: number | null;
  total_affectable_spend: number | null;
  measured_spend_pct: number | null;
  total_savings: number | null;
  total_savings_pct: number | null;
  measured_savings: number | null;
  measured_savings_pct: number | null;
  inflation_mitigation: number | null;
  added_value_penalty_avoidance: number | null;
  added_value_penalty_avoidance_pct: number | null;
}

export interface KeringConsolidatedDataResponse {
  consolidation_job_id: string;
  filters: {
    market: string | null;
    brand: string | null;
    media: string | null;
    sub_media: string | null;
  };
  total_records: number;
  data: KeringConsolidatedItem[];
}

/**
 * Kering Summary by Market
 */
export interface KeringMarketSummary {
  market: string;
  total_spend: number;
  measured_spend: number;
  total_savings: number;
  added_value: number;
  record_count: number;
}

export interface KeringMarketSummaryResponse {
  consolidation_job_id: string;
  total_markets: number;
  data: KeringMarketSummary[];
}

/**
 * Kering Summary by Brand
 */
export interface KeringBrandAggSummary {
  brand: string;
  total_spend: number;
  measured_spend: number;
  total_savings: number;
  added_value: number;
  record_count: number;
}

export interface KeringBrandAggSummaryResponse {
  consolidation_job_id: string;
  market_filter: string | null;
  total_brands: number;
  data: KeringBrandAggSummary[];
}

/**
 * Kering Consolidated Filters
 */
export interface KeringConsolidatedFiltersResponse {
  consolidation_job_id: string;
  markets: string[];
  brands: string[];
  media_types: string[];
  sub_media_types: string[];
}
