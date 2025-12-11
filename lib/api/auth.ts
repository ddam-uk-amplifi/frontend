import type {
  LoginRequest,
  MessageResponse,
  PasswordReset,
  PasswordResetRequest,
  Token,
  TokenRefresh,
  UserCreate,
  UserResponse,
} from "@/lib/types/api";
import { apiClient } from "./client";

export const authApi = {
  // Register a new user
  register: async (userData: UserCreate): Promise<UserResponse> => {
    console.log("authApi.register - sending request to /api/v1/auth/register");
    console.log("Request data:", { ...userData, password: "[REDACTED]" });
    try {
      const response = await apiClient.post("/api/v1/auth/register", userData);
      console.log("authApi.register - response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("authApi.register - error occurred:", error);
      throw error;
    }
  },

  // Login user
  login: async (credentials: LoginRequest): Promise<Token> => {
    const response = await apiClient.post("/api/v1/auth/login", credentials);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshData: TokenRefresh): Promise<Token> => {
    const response = await apiClient.post(
      `/api/v1/auth/refresh?refresh_token=${refreshData.refresh_token}`,
    );
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (
    resetData: PasswordResetRequest,
  ): Promise<MessageResponse> => {
    const response = await apiClient.post(
      "/api/v1/auth/password-reset/request",
      resetData,
    );
    return response.data;
  },

  // Confirm password reset
  confirmPasswordReset: async (
    resetData: PasswordReset,
  ): Promise<MessageResponse> => {
    const response = await apiClient.post(
      "/api/v1/auth/password-reset/confirm",
      resetData,
    );
    return response.data;
  },
};
