import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import type { AuthState, User } from "@/lib/types/auth";
import { tokenUtils } from "@/lib/utils/token";

interface AuthStore extends AuthState {
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  error: string | null;
  hasHydrated: boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,

      initialize: async () => {
        const state = get();
        if (state.hasHydrated) return;

        try {
          set({ isLoading: true });

          if (tokenUtils.hasTokens()) {
            try {
              // Try to load user profile to verify token is still valid
              const user = await usersApi.getCurrentUserProfile();
              const tokens = tokenUtils.getTokens();

              if (tokens.access_token && tokens.refresh_token) {
                set({
                  user,
                  tokens: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                  },
                  isAuthenticated: true,
                  isLoading: false,
                  hasHydrated: true,
                });
              } else {
                throw new Error("Invalid tokens");
              }
            } catch {
              // Token is invalid, clear everything
              tokenUtils.clearTokens();

              set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                isLoading: false,
                hasHydrated: true,
              });
            }
          } else {
            set({
              isLoading: false,
              hasHydrated: true,
            });
          }
        } catch {
          set({
            isLoading: false,
            hasHydrated: true,
          });
        }
      },

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const tokens = await authApi.login({ username, password });

          // Store tokens using utility
          tokenUtils.setTokens(tokens.access_token, tokens.refresh_token);

          // Load user profile
          const user = await usersApi.getCurrentUserProfile();

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            hasHydrated: true,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Login failed";

          // Clear tokens on error
          tokenUtils.clearTokens();

          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            tokens: null,
          });

          throw error;
        }
      },

      register: async (
        username: string,
        email: string,
        password: string,
      ) => {
        try {
          set({ isLoading: true, error: null });

          console.log("Calling registration API...");
          const registrationResponse = await authApi.register({
            username,
            email,
            password,
          });
          console.log("Registration API response:", registrationResponse);

          // Auto-login after registration
          console.log("Registration successful, attempting auto-login...");
          await get().login(username, password);
          console.log("Auto-login successful");
        } catch (error) {
          console.error("Registration/Login error details:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Registration failed";
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        tokenUtils.clearTokens();

        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          hasHydrated: true,
        });
      },

      refreshToken: async () => {
        try {
          const refreshToken = tokenUtils.getRefreshToken();
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          const tokens = await authApi.refreshToken({
            refresh_token: refreshToken,
          });

          tokenUtils.setTokens(tokens.access_token, tokens.refresh_token);

          set({ tokens });
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          set({ isLoading: true, error: null });
          const updatedUser = await usersApi.updateCurrentUserProfile(data);
          set({ user: updatedUser, isLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Profile update failed";
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);
