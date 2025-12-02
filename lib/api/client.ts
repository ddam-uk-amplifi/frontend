import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenUtils } from "@/lib/utils/token";

interface NetworkError extends Error {
  code?: string;
  response?: unknown;
}

// Track if a token refresh is in progress to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<unknown> | null = null;

// Create axios instance with base configuration
const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const client = axios.create({
    baseURL,
    timeout: 120000, // 2 minutes for large file operations (PDF downloads)
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth token and handle FormData
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Skip token validation for auth endpoints
      const isAuthEndpoint =
        config.url?.includes("/auth/login") ||
        config.url?.includes("/auth/register") ||
        config.url?.includes("/auth/refresh");

      // Check if tokens are valid format (only for non-auth requests)
      if (
        !isAuthEndpoint &&
        tokenUtils.hasTokens() &&
        !tokenUtils.areTokensValid()
      ) {
        console.warn("Invalid token format detected, clearing tokens");
        tokenUtils.clearTokens();

        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.href = "/auth/login?reason=invalid_tokens";
          }, 100);
        }
        return Promise.reject(new Error("Invalid authentication tokens"));
      }

      // Check if token is expiring soon and proactively refresh
      if (
        tokenUtils.isTokenExpiringSoon() &&
        !config.url?.includes("/auth/refresh") &&
        !config.url?.includes("/auth/login") &&
        !isRefreshing
      ) {
        console.log("Token expiring soon, attempting proactive refresh...");

        // Prevent concurrent refresh attempts
        if (!refreshPromise) {
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const refreshToken = tokenUtils.getRefreshToken();
              if (refreshToken) {
                const refreshResponse = await axios.post(
                  `${baseURL}/api/v1/auth/refresh?refresh_token=${refreshToken}`,
                  {},
                  {
                    timeout: 30000,
                    withCredentials: true,
                    headers: { "Content-Type": "application/json" },
                  },
                );

                const { access_token, refresh_token: newRefreshToken } =
                  refreshResponse.data;
                if (access_token && newRefreshToken) {
                  tokenUtils.setTokens(access_token, newRefreshToken);
                  console.log("Proactive token refresh successful");

                  // Log token info for debugging
                  const user = tokenUtils.getCurrentUser();
                  if (user) {
                    const timeLeft = user.exp - Date.now() / 1000;
                    console.log(
                      `New token expires in ${Math.floor(timeLeft / 60)} minutes`,
                    );
                  }
                }
              }
            } catch (refreshError) {
              console.warn("Proactive token refresh failed:", refreshError);
              // Don't block the request, let it proceed and handle 401 if needed
            } finally {
              isRefreshing = false;
              refreshPromise = null;
            }
          })();
        }

        // Wait for refresh to complete before continuing
        try {
          await refreshPromise;
        } catch (_error) {
          // Ignore refresh errors, let the request proceed
        }
      }

      const token = tokenUtils.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Handle FormData uploads - remove Content-Type to let browser set boundary
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor for token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        try {
          // Prevent concurrent refresh attempts
          if (isRefreshing && refreshPromise) {
            console.log("Token refresh already in progress, waiting...");
            await refreshPromise;

            // Retry the original request with the refreshed token
            const newToken = tokenUtils.getAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return client.request(originalRequest);
            }
          }

          // Try to refresh the token with proper error handling
          const refreshToken = tokenUtils.getRefreshToken();
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          console.log("Attempting token refresh...");

          isRefreshing = true;
          refreshPromise = (async () => {
            // Use a separate axios instance for refresh to avoid interceptor loops
            const refreshResponse = await axios.post(
              `${baseURL}/api/v1/auth/refresh?refresh_token=${refreshToken}`,
              {},
              {
                timeout: 30000, // 30 second timeout for refresh
                withCredentials: true, // Include credentials for refresh
                headers: {
                  "Content-Type": "application/json",
                },
              },
            );

            const { access_token, refresh_token: newRefreshToken } =
              refreshResponse.data;

            // Ensure we have both tokens
            if (!access_token || !newRefreshToken) {
              throw new Error("Invalid token response from server");
            }

            tokenUtils.setTokens(access_token, newRefreshToken);
            return access_token;
          })();

          const access_token = await refreshPromise;
          console.log("Token refresh successful");

          // Log new token info for debugging
          const user = tokenUtils.getCurrentUser();
          if (user) {
            const timeLeft = user.exp - Date.now() / 1000;
            console.log(
              `New token expires in ${Math.floor(timeLeft / 60)} minutes`,
            );
          }

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          // Add a small delay to ensure token is properly set
          await new Promise((resolve) => setTimeout(resolve, 100));

          return client.request(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);

          // Check if it's a network error vs auth error
          const networkError = refreshError as NetworkError;
          const isNetworkError =
            !refreshError ||
            networkError?.code === "NETWORK_ERROR" ||
            networkError?.code === "ECONNABORTED" ||
            !networkError?.response;

          if (isNetworkError) {
            // For network errors, don't immediately logout - let user try again
            console.warn("Network error during token refresh, not logging out");
            return Promise.reject(error);
          }

          // For actual auth errors (401, 403), logout the user
          console.log("Authentication error during refresh, logging out user");

          // Log authentication failure details for debugging
          const user = tokenUtils.getCurrentUser();
          if (user) {
            const timeLeft = user.exp - Date.now() / 1000;
            console.log(
              `Failed refresh - token had ${Math.floor(timeLeft / 60)} minutes left`,
            );
          }

          tokenUtils.clearTokens();

          if (typeof window !== "undefined") {
            // Add a small delay before redirect to prevent flickering
            setTimeout(() => {
              window.location.href = "/auth/login?reason=session_expired";
            }, 100);
          }
        } finally {
          // Clean up refresh state
          isRefreshing = false;
          refreshPromise = null;
        }
      }

      return Promise.reject(error);
    },
  );
  return client;
};

export const apiClient = createApiClient();

// Utility function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { detail?: unknown; message?: string } };
    };

    if (axiosError.response?.data?.detail) {
      if (Array.isArray(axiosError.response.data.detail)) {
        return axiosError.response.data.detail
          .map((detail: { msg: string }) => detail.msg)
          .join(", ");
      }
      return String(axiosError.response.data.detail);
    }

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "An unexpected error occurred";
};
