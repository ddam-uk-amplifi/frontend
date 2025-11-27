"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import { tokenUtils } from "@/lib/utils/token";

interface UseTokenRefreshOptions {
  /**
   * Show toast notifications for token refresh events
   * Default: false (silent refresh for better UX)
   */
  showNotifications?: boolean;
}

/**
 * Hook to automatically refresh tokens before they expire
 * This keeps users logged in as long as they're active
 */
export function useTokenRefresh(options: UseTokenRefreshOptions = {}) {
  const { showNotifications: _showNotifications = false } = options;
  const { refreshToken, isAuthenticated, logout } = useAuthStore();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timers if not authenticated
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
        activityTimerRef.current = null;
      }
      return;
    }

    /**
     * Calculate when to refresh the token
     * Refresh at 75% of token lifetime to ensure we refresh before expiry
     *
     * Token Configuration:
     * - Access Token: 24 hours (1440 minutes)
     * - Refresh Token: 1 year (365 days)
     *
     * Refresh Strategy:
     * - Access token refreshes every 18 hours (75% of 24 hours)
     * - As long as refresh token is valid, user stays logged in
     * - Even if browser is closed, refresh token persists in localStorage
     * - When user reopens, expired access token is refreshed using valid refresh token
     */
    const scheduleTokenRefresh = () => {
      const user = tokenUtils.getCurrentUser();
      if (!user || !user.exp) {
        return;
      }

      const now = Date.now();
      const expiresAt = user.exp * 1000; // Convert to milliseconds
      const timeUntilExpiry = expiresAt - now;

      // If token is already expired or will expire soon, logout
      if (timeUntilExpiry <= 0) {
        console.warn("Token expired, logging out");
        logout();
        return;
      }

      // Refresh at 75% of token lifetime
      // For 24 hour token (1440 min), this refreshes after 18 hours
      const refreshAt = timeUntilExpiry * 0.75;

      console.log(
        `Token refresh scheduled in ${Math.round(refreshAt / 1000 / 60)} minutes`,
      );

      // Clear existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Schedule refresh
      refreshTimerRef.current = setTimeout(async () => {
        try {
          console.log("Auto-refreshing token...");
          await refreshToken();
          console.log("Token refreshed successfully");
          // Schedule next refresh
          scheduleTokenRefresh();
        } catch (error) {
          console.error("Failed to refresh token:", error);
          logout();
        }
      }, refreshAt);
    };

    /**
     * Track user activity - no automatic logout for inactivity
     * Just update last activity timestamp for potential future use
     */
    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // No automatic token refresh or logout based on inactivity
      // Users should stay logged in until token naturally expires (12 hours)
      // or they manually logout
    };

    // Set up activity tracking
    const activityEvents = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Debounced activity handler
    let activityTimeout: NodeJS.Timeout | null = null;
    const debouncedActivityHandler = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      activityTimeout = setTimeout(handleUserActivity, 1000);
    };

    // Add activity listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, debouncedActivityHandler, {
        passive: true,
      });
    });

    // Initial schedule
    scheduleTokenRefresh();

    // Cleanup
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, debouncedActivityHandler);
      });
    };
  }, [isAuthenticated, refreshToken, logout]);
}
