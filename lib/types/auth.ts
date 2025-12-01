/**
 * Authentication system types
 */

import type { User } from "@/lib/types/api";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Auth store state
export interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Re-export types from API
export type { User };
