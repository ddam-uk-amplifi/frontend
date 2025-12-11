"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import {
  fetchDashboardData,
  fetchFieldGroups,
  generatePPTReport,
  getChartRecommendations,
  type QueryParams,
  type ExportPPTRequest,
} from "@/lib/api/dashboard";

// ============================================
// QUERY KEYS - Centralized for cache management
// ============================================

export const dashboardKeys = {
  all: ["dashboard"] as const,
  data: (params: QueryParams) =>
    [...dashboardKeys.all, "data", params] as const,
  fields: (client: string, dataSource: string) =>
    [...dashboardKeys.all, "fields", client, dataSource] as const,
  recommendations: (fields: Record<string, string[]>) =>
    [...dashboardKeys.all, "recommendations", fields] as const,
};

// ============================================
// DEBOUNCE HELPER
// ============================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

import { useState } from "react";

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch dashboard visualization data
 * Includes debouncing, caching, and request cancellation
 */
export function useDashboardData(
  params: QueryParams,
  options?: { enabled?: boolean },
) {
  // Debounce the params to avoid too many requests during field selection
  const debouncedParams = useDebounce(params, 300);

  // Track if we should fetch
  const hasRequiredParams = Boolean(
    debouncedParams.client &&
    debouncedParams.dataSource &&
    Object.values(debouncedParams.selectedFields).some(
      (arr) => arr.length > 0,
    ),
  );

  return useQuery({
    queryKey: dashboardKeys.data(debouncedParams),
    queryFn: () => {
      return fetchDashboardData(debouncedParams);
    },
    enabled: (options?.enabled ?? true) && hasRequiredParams,
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard data can be cached
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to fetch available field groups
 */
export function useFieldGroups(client: string, dataSource: string) {
  return useQuery({
    queryKey: dashboardKeys.fields(client, dataSource),
    queryFn: () => fetchFieldGroups(client, dataSource),
    enabled: Boolean(client && dataSource),
    staleTime: 10 * 60 * 1000, // 10 minutes - field structure rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get AI-powered chart recommendations
 */
export function useChartRecommendations(
  selectedFields: Record<string, string[]>,
) {
  const debouncedFields = useDebounce(selectedFields, 500);
  const hasFields = Object.values(debouncedFields).some(
    (arr) => arr.length > 0,
  );

  return useQuery({
    queryKey: dashboardKeys.recommendations(debouncedFields),
    queryFn: () => getChartRecommendations(debouncedFields),
    enabled: hasFields,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to generate PPT report
 */
export function useGeneratePPT() {
  return useMutation({
    mutationFn: (request: ExportPPTRequest) => generatePPTReport(request),
    onSuccess: () => {
      // Optionally invalidate any related queries
    },
  });
}

/**
 * Hook to prefetch data for likely next selections
 * Improves perceived performance
 */
export function usePrefetchDashboardData() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (params: QueryParams) => {
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.data(params),
        queryFn: () => fetchDashboardData(params),
        staleTime: 2 * 60 * 1000,
      });
    },
    [queryClient],
  );

  return prefetch;
}

/**
 * Hook to invalidate dashboard cache
 * Use when underlying data might have changed
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);
}
