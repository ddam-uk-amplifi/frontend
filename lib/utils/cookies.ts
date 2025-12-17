/**
 * Cookie management utilities for authentication
 * These cookies are used by middleware for server-side route protection
 */

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "auth_access_token",
  REFRESH_TOKEN: "auth_refresh_token",
  IS_AUTHENTICATED: "auth_is_authenticated",
} as const;

export const cookieUtils = {
  /**
   * Set a cookie with appropriate settings
   */
  setCookie: (name: string, value: string, days: number = 7): void => {
    if (typeof window === "undefined") return;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  },

  /**
   * Get a cookie value by name
   */
  getCookie: (name: string): string | null => {
    if (typeof window === "undefined") return null;

    const nameEQ = name + "=";
    const ca = document.cookie.split(";");

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }

    return null;
  },

  /**
   * Delete a cookie by name
   */
  deleteCookie: (name: string): void => {
    if (typeof window === "undefined") return;

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },

  /**
   * Set authentication cookies (tokens + auth flag)
   */
  setAuthCookies: (accessToken: string, refreshToken: string): void => {
    cookieUtils.setCookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, 1); // 1 day for access token
    cookieUtils.setCookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, 365); // 1 year for refresh token
    cookieUtils.setCookie(COOKIE_NAMES.IS_AUTHENTICATED, "true", 365);
  },

  /**
   * Clear all authentication cookies
   */
  clearAuthCookies: (): void => {
    cookieUtils.deleteCookie(COOKIE_NAMES.ACCESS_TOKEN);
    cookieUtils.deleteCookie(COOKIE_NAMES.REFRESH_TOKEN);
    cookieUtils.deleteCookie(COOKIE_NAMES.IS_AUTHENTICATED);
  },

  /**
   * Check if user is authenticated based on cookies
   */
  isAuthenticated: (): boolean => {
    return cookieUtils.getCookie(COOKIE_NAMES.IS_AUTHENTICATED) === "true";
  },

  /**
   * Get auth tokens from cookies
   */
  getAuthTokens: () => {
    return {
      accessToken: cookieUtils.getCookie(COOKIE_NAMES.ACCESS_TOKEN),
      refreshToken: cookieUtils.getCookie(COOKIE_NAMES.REFRESH_TOKEN),
    };
  },
};
