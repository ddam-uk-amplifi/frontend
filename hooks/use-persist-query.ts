'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface DashboardQueryState {
  client: string;
  dataSource: 'summary' | 'trackers' | '';
  market: string;
  period: string;
  selectedFields: Record<string, string[]>;
  graphType: string | null;
}

const STORAGE_KEY = 'dashboard_query_state';

/**
 * Hook to persist dashboard query state across page refreshes
 * Uses both URL params (for sharing) and localStorage (for persistence)
 */
export function usePersistQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isInitialized = useRef(false);

  // Load initial state from URL or localStorage
  const loadState = useCallback((): Partial<DashboardQueryState> => {
    // First try URL params
    const client = searchParams.get('client');
    const dataSource = searchParams.get('dataSource') as DashboardQueryState['dataSource'];
    const market = searchParams.get('market');
    const period = searchParams.get('period');
    const graphType = searchParams.get('graphType');
    const fieldsParam = searchParams.get('fields');

    if (client || dataSource) {
      let selectedFields: Record<string, string[]> = {};
      if (fieldsParam) {
        try {
          selectedFields = JSON.parse(decodeURIComponent(fieldsParam));
        } catch (e) {
          console.warn('Failed to parse fields from URL');
        }
      }

      return {
        client: client || '',
        dataSource: dataSource || '',
        market: market || '',
        period: period || '',
        graphType: graphType || null,
        selectedFields,
      };
    }

    // Fall back to localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to load state from localStorage');
      }
    }

    return {};
  }, [searchParams]);

  // Save state to localStorage and optionally URL
  const saveState = useCallback((state: DashboardQueryState, updateUrl = false) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save state to localStorage');
      }
    }

    // Optionally update URL for sharing
    if (updateUrl) {
      const params = new URLSearchParams();
      
      if (state.client) params.set('client', state.client);
      if (state.dataSource) params.set('dataSource', state.dataSource);
      if (state.market) params.set('market', state.market);
      if (state.period) params.set('period', state.period);
      if (state.graphType) params.set('graphType', state.graphType);
      if (Object.keys(state.selectedFields).length > 0) {
        params.set('fields', encodeURIComponent(JSON.stringify(state.selectedFields)));
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [pathname, router]);

  // Clear saved state
  const clearState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    loadState,
    saveState,
    clearState,
    isInitialized,
  };
}

/**
 * Hook to generate shareable link for current query
 */
export function useShareableLink(state: DashboardQueryState) {
  const generateLink = useCallback(() => {
    if (typeof window === 'undefined') return '';

    const params = new URLSearchParams();
    
    if (state.client) params.set('client', state.client);
    if (state.dataSource) params.set('dataSource', state.dataSource);
    if (state.market) params.set('market', state.market);
    if (state.period) params.set('period', state.period);
    if (state.graphType) params.set('graphType', state.graphType);
    if (Object.keys(state.selectedFields).length > 0) {
      params.set('fields', encodeURIComponent(JSON.stringify(state.selectedFields)));
    }

    return `${window.location.origin}/dashboard?${params.toString()}`;
  }, [state]);

  const copyToClipboard = useCallback(async () => {
    const link = generateLink();
    if (link && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      return true;
    }
    return false;
  }, [generateLink]);

  return {
    generateLink,
    copyToClipboard,
  };
}
