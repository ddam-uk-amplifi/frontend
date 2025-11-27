/**
 * Enhanced types for authentication system
 */

import type { User } from "@/lib/types/api";
import { UserRole } from "@/lib/types/api";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  role?: UserRole;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 3,
  [UserRole.MODERATOR]: 2,
  [UserRole.USER]: 1,
} as const;

export type RoleLevel = (typeof ROLE_HIERARCHY)[keyof typeof ROLE_HIERARCHY];

// Auth store state
export interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Re-export types from API
export { UserRole };
export type { User };
