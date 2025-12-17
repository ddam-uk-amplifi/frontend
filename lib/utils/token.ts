/**
 * Centralized token management utilities
 */

import { cookieUtils } from "./cookies";

export const TOKEN_KEYS = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
} as const;

export const tokenUtils = {
  /**
   * Get access token from localStorage
   */
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEYS.ACCESS);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEYS.REFRESH);
  },

  /**
   * Store tokens in localStorage and cookies with error handling
   */
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);

      // Also set cookies for server-side middleware access
      cookieUtils.setAuthCookies(accessToken, refreshToken);

      // Verify tokens were stored correctly
      const storedAccess = localStorage.getItem(TOKEN_KEYS.ACCESS);
      const storedRefresh = localStorage.getItem(TOKEN_KEYS.REFRESH);

      if (storedAccess !== accessToken || storedRefresh !== refreshToken) {
        console.warn("Token storage verification failed, retrying...");
        // Retry once
        localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
        localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
        cookieUtils.setAuthCookies(accessToken, refreshToken);
      }
    } catch (error) {
      console.error("Failed to store tokens in localStorage:", error);
      // Fallback: try to clear corrupted storage and retry
      try {
        localStorage.clear();
        localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
        localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
        cookieUtils.setAuthCookies(accessToken, refreshToken);
      } catch (retryError) {
        console.error(
          "Critical: Unable to store authentication tokens:",
          retryError,
        );
      }
    }
  },

  /**
   * Clear all tokens from localStorage and cookies
   */
  clearTokens: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);

    // Also clear cookies
    cookieUtils.clearAuthCookies();
  },

  /**
   * Check if user has valid tokens stored
   */
  hasTokens: (): boolean => {
    return !!(tokenUtils.getAccessToken() && tokenUtils.getRefreshToken());
  },

  /**
   * Decode JWT token and extract user information
   */
  getCurrentUser: () => {
    const token = tokenUtils.getAccessToken();
    if (!token) return null;

    try {
      // Decode JWT payload (basic decoding without verification)
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.sub,
        email: payload.email,
        exp: payload.exp,
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  },

  /**
   * Check if access token is close to expiring (within 10 minutes)
   */
  isTokenExpiringSoon: (): boolean => {
    const user = tokenUtils.getCurrentUser();
    if (!user?.exp) return true;

    const now = Date.now() / 1000; // Convert to seconds
    const timeLeft = user.exp - now;

    // Return true if token expires in less than 10 minutes (600 seconds)
    // Increased from 5 to 10 minutes for more proactive refresh
    return timeLeft < 600;
  },

  /**
   * Check if access token is expired
   */
  isTokenExpired: (): boolean => {
    const user = tokenUtils.getCurrentUser();
    if (!user?.exp) return true;

    const now = Date.now() / 1000; // Convert to seconds
    return user.exp <= now;
  },

  /**
   * Get tokens as object
   */
  getTokens: () => {
    return {
      access_token: tokenUtils.getAccessToken(),
      refresh_token: tokenUtils.getRefreshToken(),
    };
  },

  /**
   * Validate token format (basic JWT format check)
   */
  isValidTokenFormat: (token: string | null): boolean => {
    if (!token) return false;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return false;

      // Try to decode the payload
      const payload = JSON.parse(atob(parts[1]));
      return payload && typeof payload === "object" && payload.exp;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Check if stored tokens are valid and not corrupted
   */
  areTokensValid: (): boolean => {
    const accessToken = tokenUtils.getAccessToken();
    const refreshToken = tokenUtils.getRefreshToken();

    return (
      tokenUtils.isValidTokenFormat(accessToken) &&
      tokenUtils.isValidTokenFormat(refreshToken)
    );
  },
};
