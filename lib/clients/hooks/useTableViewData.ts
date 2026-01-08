// ============================================
// TABLE VIEW DATA FETCHING HOOK
// ============================================
// Generic data fetching hook that works with ANY client.
// Uses config-driven API endpoints - no client-specific code needed.

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchConsolidatedSummary,
  fetchTrackerSummaryData,
  fetchLatestJob,
} from "@/lib/api/dashboard";
import { getClientTableView, getClientIdByName } from "../index";
import { transformDataWithConfig, getTransformConfig } from "../transforms";
import { fetchClientData, getClientApiConfig, hasGenericApi } from "../api";
import type { TableRow } from "../transforms";

// ============================================
// TYPES
// ============================================

export interface UseTableViewDataParams {
  clientName: string | undefined;
  dataSource: "summary" | "trackers" | "" | undefined;
  sheetType: string; // For summary: "ytd", "fyfc", or brand name
  selectedPeriod: string; // For trackers: period code or brand name
  selectedMarket: string;
  periodFilter: string; // For trackers with period filter (e.g., "DECEMBER")
}

export interface UseTableViewDataResult {
  rows: TableRow[];
  isLoading: boolean;
  isError: boolean;
  lastUpdated: Date | null;
  refetch: () => void;
  noJobFound: boolean;
}

// ============================================
// QUERY KEYS
// ============================================

export const tableViewQueryKeys = {
  all: ["tableView"] as const,
  latestJob: (client: string) =>
    [...tableViewQueryKeys.all, "latestJob", client] as const,
  summary: (client: string, jobId: string, sheetType: string) =>
    [...tableViewQueryKeys.all, "summary", client, jobId, sheetType] as const,
  tracker: (client: string, market: string) =>
    [...tableViewQueryKeys.all, "tracker", client, market] as const,
  // Generic API query keys
  genericSummary: (client: string, variant: string, brand: string | undefined, market: string) =>
    [...tableViewQueryKeys.all, "generic", "summary", client, variant, brand || "all", market] as const,
  genericTracker: (client: string, variant: string, brand: string | undefined, market: string) =>
    [...tableViewQueryKeys.all, "generic", "tracker", client, variant, brand || "all", market] as const,
};

// ============================================
// SUMMARY FIELDS (for default clients)
// ============================================

const SUMMARY_FIELDS = [
  "total_net_net_spend",
  "total_addressable_net_net_spend",
  "total_net_net_measured",
  "measured_spend_pct",
  "savings_value",
  "savings_pct",
  "inflation_pct",
  "inflation_migration_pct",
  "inflation_after_migration_pct",
];

// ============================================
// HOOK
// ============================================

export function useTableViewData(params: UseTableViewDataParams): UseTableViewDataResult {
  const {
    clientName,
    dataSource,
    sheetType,
    selectedPeriod,
    selectedMarket,
    periodFilter,
  } = params;

  const clientSlug = clientName?.toLowerCase() || "";
  const clientId = clientName ? getClientIdByName(clientName) : undefined;
  const clientTableView = useMemo(() => getClientTableView(clientSlug), [clientSlug]);

  // Check if client uses generic API
  const useGenericApi = useMemo(() => hasGenericApi(clientSlug), [clientSlug]);
  const apiConfig = useMemo(() => getClientApiConfig(clientSlug), [clientSlug]);

  // Get brand lists
  const brands = clientTableView?.brands?.list || [];
  const hasBrandsInSummary = clientTableView?.brands?.inSummary || false;
  const hasBrandsInTrackers = clientTableView?.brands?.inTrackers || false;

  // Determine if a brand is selected
  const isSummaryBrandSelected = hasBrandsInSummary && brands.includes(sheetType);
  const selectedSummaryBrand = isSummaryBrandSelected ? sheetType : undefined;

  const isTrackerBrandSelected = hasBrandsInTrackers && brands.includes(selectedPeriod);
  const selectedTrackerBrand = isTrackerBrandSelected ? selectedPeriod : undefined;

  // ============================================
  // LATEST JOB QUERY (for default clients without generic API)
  // ============================================

  const {
    data: latestJob,
    isError: isLatestJobError,
  } = useQuery({
    queryKey: tableViewQueryKeys.latestJob(clientName || ""),
    queryFn: () => fetchLatestJob(clientName!),
    enabled: Boolean(clientName && dataSource === "summary" && !useGenericApi),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const jobId = latestJob?.consolidation_job_id || "";

  // ============================================
  // DEFAULT SUMMARY QUERY (non-generic API clients)
  // ============================================

  const {
    data: defaultSummaryData,
    isLoading: isDefaultSummaryLoading,
    refetch: refetchDefaultSummary,
    dataUpdatedAt: defaultSummaryUpdatedAt,
  } = useQuery({
    queryKey: tableViewQueryKeys.summary(clientName || "", jobId, sheetType),
    queryFn: () =>
      fetchConsolidatedSummary({
        clientName: clientName!,
        consolidationJobId: jobId,
        sheetType: sheetType as "ytd" | "fyfc",
        fields: SUMMARY_FIELDS,
      }),
    enabled: Boolean(
      clientName && dataSource === "summary" && jobId && !useGenericApi
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // ============================================
  // DEFAULT TRACKER QUERY (non-generic API clients)
  // ============================================

  const {
    data: defaultTrackerData,
    isLoading: isDefaultTrackerLoading,
    refetch: refetchDefaultTracker,
    dataUpdatedAt: defaultTrackerUpdatedAt,
  } = useQuery({
    queryKey: tableViewQueryKeys.tracker(clientName || "", selectedMarket),
    queryFn: () =>
      fetchTrackerSummaryData(
        clientName!,
        clientId!,
        undefined,
        undefined,
        selectedMarket,
      ),
    enabled: Boolean(
      clientName &&
      dataSource === "trackers" &&
      selectedMarket &&
      clientId &&
      !useGenericApi
    ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // ============================================
  // GENERIC API QUERIES
  // ============================================

  // Generic Summary - Default (all-brand)
  const {
    data: genericSummaryDefaultResult,
    isLoading: isGenericSummaryDefaultLoading,
    refetch: refetchGenericSummaryDefault,
    dataUpdatedAt: genericSummaryDefaultUpdatedAt,
  } = useQuery({
    queryKey: tableViewQueryKeys.genericSummary(clientSlug, "default", undefined, selectedMarket),
    queryFn: () =>
      fetchClientData(
        apiConfig!,
        "summary",
        "default",
        {
          clientId: clientId ?? undefined,
          market: selectedMarket || undefined,
        }
      ),
    enabled: Boolean(
      useGenericApi &&
      apiConfig &&
      dataSource === "summary" &&
      clientId &&
      !isSummaryBrandSelected
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Generic Summary - Brand
  const {
    data: genericSummaryBrandResult,
    isLoading: isGenericSummaryBrandLoading,
    refetch: refetchGenericSummaryBrand,
    dataUpdatedAt: genericSummaryBrandUpdatedAt,
  } = useQuery({
    queryKey: tableViewQueryKeys.genericSummary(clientSlug, "brand", selectedSummaryBrand, selectedMarket),
    queryFn: () =>
      fetchClientData(
        apiConfig!,
        "summary",
        "brand",
        {
          clientId: clientId ?? undefined,
          brand: selectedSummaryBrand,
          market: selectedMarket || undefined,
        }
      ),
    enabled: Boolean(
      useGenericApi &&
      apiConfig &&
      dataSource === "summary" &&
      clientId &&
      isSummaryBrandSelected &&
      selectedSummaryBrand
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Generic Tracker - Default (detailed)
  const {
    data: genericTrackerDefaultResult,
    isLoading: isGenericTrackerDefaultLoading,
    refetch: refetchGenericTrackerDefault,
    dataUpdatedAt: genericTrackerDefaultUpdatedAt,
  } = useQuery({
    queryKey: tableViewQueryKeys.genericTracker(clientSlug, "default", undefined, selectedMarket),
    queryFn: () =>
      fetchClientData(
        apiConfig!,
        "trackers",
        "default",
        {
          clientId: clientId ?? undefined,
          market: selectedMarket || undefined,
        }
      ),
    enabled: Boolean(
      useGenericApi &&
      apiConfig &&
      dataSource === "trackers" &&
      clientId &&
      selectedMarket &&
      !isTrackerBrandSelected
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // Generic Tracker - Brand
  const {
    data: genericTrackerBrandResult,
    isLoading: isGenericTrackerBrandLoading,
    refetch: refetchGenericTrackerBrand,
    dataUpdatedAt: genericTrackerBrandUpdatedAt,
  } = useQuery({
    queryKey: tableViewQueryKeys.genericTracker(clientSlug, "brand", selectedTrackerBrand, selectedMarket),
    queryFn: () =>
      fetchClientData(
        apiConfig!,
        "trackers",
        "brand",
        {
          clientId: clientId ?? undefined,
          brand: selectedTrackerBrand,
          market: selectedMarket || undefined,
        }
      ),
    enabled: Boolean(
      useGenericApi &&
      apiConfig &&
      dataSource === "trackers" &&
      clientId &&
      selectedMarket &&
      isTrackerBrandSelected &&
      selectedTrackerBrand
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  // ============================================
  // TRANSFORM DATA TO ROWS
  // ============================================

  const rows = useMemo((): TableRow[] => {
    // Generic API - Summary
    if (useGenericApi && dataSource === "summary") {
      // Brand-specific summary
      if (isSummaryBrandSelected && genericSummaryBrandResult?.success && genericSummaryBrandResult.data) {
        const transformName = clientTableView?.summary?.brandTransformName;
        if (transformName) {
          const config = getTransformConfig(transformName);
          if (config) {
            return transformDataWithConfig(genericSummaryBrandResult.data, config);
          }
        }
      }
      // All-brand summary
      if (!isSummaryBrandSelected && genericSummaryDefaultResult?.success && genericSummaryDefaultResult.data) {
        const transformName = clientTableView?.summary?.transformName;
        if (transformName) {
          const config = getTransformConfig(transformName);
          if (config) {
            return transformDataWithConfig(genericSummaryDefaultResult.data, config);
          }
        }
      }
    }

    // Generic API - Trackers
    if (useGenericApi && dataSource === "trackers") {
      // Brand-specific tracker
      if (isTrackerBrandSelected && genericTrackerBrandResult?.success && genericTrackerBrandResult.data) {
        const transformName = clientTableView?.trackers?.brandTransformName;
        if (transformName) {
          const config = getTransformConfig(transformName);
          if (config) {
            return transformDataWithConfig(genericTrackerBrandResult.data, config, periodFilter);
          }
        }
      }
      // Detailed tracker
      if (!isTrackerBrandSelected && genericTrackerDefaultResult?.success && genericTrackerDefaultResult.data) {
        const transformName = clientTableView?.trackers?.transformName;
        if (transformName) {
          const config = getTransformConfig(transformName);
          if (config) {
            return transformDataWithConfig(genericTrackerDefaultResult.data, config, periodFilter);
          }
        }
      }
    }

    // Default API - Summary (handled by legacy transform in component)
    // Default API - Trackers (handled by legacy transform in component)

    return [];
  }, [
    useGenericApi,
    dataSource,
    isSummaryBrandSelected,
    genericSummaryBrandResult,
    genericSummaryDefaultResult,
    isTrackerBrandSelected,
    genericTrackerBrandResult,
    genericTrackerDefaultResult,
    clientTableView,
    periodFilter,
  ]);

  // ============================================
  // LOADING STATE
  // ============================================

  const isLoading = useMemo(() => {
    if (useGenericApi) {
      if (dataSource === "summary") {
        return isSummaryBrandSelected
          ? isGenericSummaryBrandLoading
          : isGenericSummaryDefaultLoading;
      }
      if (dataSource === "trackers") {
        return isTrackerBrandSelected
          ? isGenericTrackerBrandLoading
          : isGenericTrackerDefaultLoading;
      }
    } else {
      if (dataSource === "summary") {
        return isDefaultSummaryLoading;
      }
      if (dataSource === "trackers") {
        return isDefaultTrackerLoading;
      }
    }
    return false;
  }, [
    useGenericApi,
    dataSource,
    isSummaryBrandSelected,
    isTrackerBrandSelected,
    isGenericSummaryBrandLoading,
    isGenericSummaryDefaultLoading,
    isGenericTrackerBrandLoading,
    isGenericTrackerDefaultLoading,
    isDefaultSummaryLoading,
    isDefaultTrackerLoading,
  ]);

  // ============================================
  // ERROR STATE
  // ============================================

  const isError = useMemo(() => {
    if (useGenericApi) {
      if (dataSource === "summary") {
        return isSummaryBrandSelected
          ? genericSummaryBrandResult?.success === false
          : genericSummaryDefaultResult?.success === false;
      }
      if (dataSource === "trackers") {
        return isTrackerBrandSelected
          ? genericTrackerBrandResult?.success === false
          : genericTrackerDefaultResult?.success === false;
      }
    }
    return false;
  }, [
    useGenericApi,
    dataSource,
    isSummaryBrandSelected,
    isTrackerBrandSelected,
    genericSummaryBrandResult,
    genericSummaryDefaultResult,
    genericTrackerBrandResult,
    genericTrackerDefaultResult,
  ]);

  // ============================================
  // LAST UPDATED
  // ============================================

  const lastUpdated = useMemo((): Date | null => {
    let timestamp: number | undefined;

    if (useGenericApi) {
      if (dataSource === "summary") {
        timestamp = isSummaryBrandSelected
          ? genericSummaryBrandUpdatedAt
          : genericSummaryDefaultUpdatedAt;
      } else if (dataSource === "trackers") {
        timestamp = isTrackerBrandSelected
          ? genericTrackerBrandUpdatedAt
          : genericTrackerDefaultUpdatedAt;
      }
    } else {
      if (dataSource === "summary") {
        timestamp = defaultSummaryUpdatedAt;
      } else if (dataSource === "trackers") {
        timestamp = defaultTrackerUpdatedAt;
      }
    }

    return timestamp ? new Date(timestamp) : null;
  }, [
    useGenericApi,
    dataSource,
    isSummaryBrandSelected,
    isTrackerBrandSelected,
    genericSummaryBrandUpdatedAt,
    genericSummaryDefaultUpdatedAt,
    genericTrackerBrandUpdatedAt,
    genericTrackerDefaultUpdatedAt,
    defaultSummaryUpdatedAt,
    defaultTrackerUpdatedAt,
  ]);

  // ============================================
  // REFETCH
  // ============================================

  const refetch = useMemo(() => {
    if (useGenericApi) {
      if (dataSource === "summary") {
        return isSummaryBrandSelected
          ? refetchGenericSummaryBrand
          : refetchGenericSummaryDefault;
      }
      if (dataSource === "trackers") {
        return isTrackerBrandSelected
          ? refetchGenericTrackerBrand
          : refetchGenericTrackerDefault;
      }
    } else {
      if (dataSource === "summary") {
        return refetchDefaultSummary;
      }
      if (dataSource === "trackers") {
        return refetchDefaultTracker;
      }
    }
    return () => {};
  }, [
    useGenericApi,
    dataSource,
    isSummaryBrandSelected,
    isTrackerBrandSelected,
    refetchGenericSummaryBrand,
    refetchGenericSummaryDefault,
    refetchGenericTrackerBrand,
    refetchGenericTrackerDefault,
    refetchDefaultSummary,
    refetchDefaultTracker,
  ]);

  // ============================================
  // RETURN
  // ============================================

  return {
    rows,
    isLoading,
    isError,
    lastUpdated,
    refetch,
    noJobFound: !useGenericApi && isLatestJobError && dataSource === "summary",
  };
}
