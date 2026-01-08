// ============================================
// SHARED TRACKER FIELD DEFINITIONS
// ============================================

import type { Field } from "../types";

/**
 * Common summary fields used across multiple clients
 */
export const commonSummaryFields: Field[] = [
  { id: "total-net-net-spend", label: "Total net net spend" },
  {
    id: "total-addressable-net-net-spend",
    label: "Total addressable net net spend",
  },
  { id: "total-net-net-measured", label: "Total net net measured" },
  { id: "measured-spend-pct", label: "Measured Spend %" },
  { id: "savings-value", label: "Savings Value" },
  { id: "savings-pct", label: "Savings %" },
  { id: "inflation-pct", label: "Inflation %" },
  { id: "inflation-mitigation", label: "Inflation Mitigation" },
  {
    id: "inflation-after-mitigation-pct",
    label: "Inflation after Mitigation %",
  },
];

/**
 * Tracker summary fields (from Summary_YTD sheets)
 */
export const trackerSummaryFields: Field[] = [
  { id: "total-net-net-spend", label: "Total Net Net Spend" },
  { id: "total-non-addressable-spend", label: "Total Non-Addressable Spend" },
  { id: "total-addressable-spend", label: "Total Addressable Spend" },
  { id: "measured-spend", label: "Measured Spend" },
  { id: "measured-spend-pct", label: "Measured Spend %" },
  {
    id: "benchmark-equivalent-net-net-spend",
    label: "Benchmark Equivalent Spend",
  },
  { id: "value-loss", label: "Value Loss" },
  { id: "value-loss-pct", label: "Value Loss %" },
];

/**
 * Common monthly tracker fields
 */
export const commonMonthlyTrackerFields: Field[] = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

/**
 * Common buy specifics tracker fields
 */
export const commonBuySpecificsFields: Field[] = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

/**
 * Helper to prefix fields with a media type
 */
export function prefixFields(fields: Field[], prefix: string): Field[] {
  return fields.map((f) => ({ ...f, id: `${prefix}-${f.id}` }));
}

/**
 * Helper to prefix fields with a client identifier
 */
export function prefixFieldsWithClient(
  fields: Field[],
  clientPrefix: string,
  typePrefix: string,
): Field[] {
  return fields.map((f) => ({
    ...f,
    id: `${clientPrefix}-${typePrefix}-${f.id}`,
  }));
}
