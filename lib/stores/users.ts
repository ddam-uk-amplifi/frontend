import { create } from "zustand";
import { type GetUsersParams, usersApi } from "@/lib/api/users";
import type { User, UserListResponse } from "@/lib/types/api";

interface UsersStore {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: (params?: GetUsersParams) => Promise<void>;
  createUser: (userData: {
    email: string;
    password: string;
    username: string;
    is_superuser?: boolean;
  }) => Promise<void>;
  updateUser: (userId: number, userData: Partial<User>) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  isLoading: false,
  error: null,

  fetchUsers: async (params?: GetUsersParams) => {
    try {
      set({ isLoading: true, error: null });

      const currentState = get();
      const fetchParams = {
        page: currentState.page,
        page_size: currentState.pageSize,
        ...params,
      };

      const response: UserListResponse = await usersApi.getUsers(fetchParams);

      set({
        users: response.users,
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch users";
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  createUser: async (userData) => {
    try {
      set({ isLoading: true, error: null });

      await usersApi.createUser(userData);

      // Refresh the users list
      await get().fetchUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateUser: async (userId: number, userData: Partial<User>) => {
    try {
      set({ isLoading: true, error: null });

      await usersApi.updateUser(userId.toString(), userData);

      // Update the user in the local state
      const currentUsers = get().users;
      const updatedUsers = currentUsers.map((user) =>
        user.id === userId ? { ...user, ...userData } : user,
      );

      set({ users: updatedUsers, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  deleteUser: async (userId: number) => {
    try {
      set({ isLoading: true, error: null });

      await usersApi.deleteUser(userId.toString());

      // Remove the user from the local state
      const currentUsers = get().users;
      const filteredUsers = currentUsers.filter((user) => user.id !== userId);

      set({
        users: filteredUsers,
        total: get().total - 1,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  clearError: () => {
    set({ error: null });
  },

  setPage: (page: number) => {
    set({ page });
  },

  setPageSize: (pageSize: number) => {
    set({ pageSize });
  },
}));
