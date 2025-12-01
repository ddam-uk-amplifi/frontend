import type {
  MessageResponse,
  UserCreate,
  UserListResponse,
  UserResponse,
  UserUpdate,
  UserUpdatePassword,
} from "@/lib/types/api";
import { apiClient } from "./client";

export interface GetUsersParams {
  is_superuser?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export const usersApi = {
  // Create a new user (Admin only)
  createUser: async (userData: UserCreate): Promise<UserResponse> => {
    const response = await apiClient.post("/api/v1/users/", userData);
    return response.data;
  },

  // Get users with pagination and filtering
  getUsers: async (params?: GetUsersParams): Promise<UserListResponse> => {
    const response = await apiClient.get("/api/v1/users/", { params });
    return response.data;
  },

  // Get current user profile
  getCurrentUserProfile: async (): Promise<UserResponse> => {
    const response = await apiClient.get("/api/v1/users/me");
    return response.data;
  },

  // Update current user profile
  updateCurrentUserProfile: async (
    userData: UserUpdate,
  ): Promise<UserResponse> => {
    const response = await apiClient.put("/api/v1/users/me", userData);
    return response.data;
  },

  // Update current user password
  updateCurrentUserPassword: async (
    passwordData: UserUpdatePassword,
  ): Promise<MessageResponse> => {
    const response = await apiClient.put(
      "/api/v1/users/me/password",
      passwordData,
    );
    return response.data;
  },

  // Get user by ID
  getUser: async (userId: string): Promise<UserResponse> => {
    const response = await apiClient.get(`/api/v1/users/${userId}`);
    return response.data;
  },

  // Update user (Admin only)
  updateUser: async (
    userId: string,
    userData: UserUpdate,
  ): Promise<UserResponse> => {
    const response = await apiClient.put(`/api/v1/users/${userId}`, userData);
    return response.data;
  },

  // Delete user (Admin only) - Soft delete
  deleteUser: async (userId: string): Promise<MessageResponse> => {
    const response = await apiClient.delete(`/api/v1/users/${userId}`);
    return response.data;
  },
};
