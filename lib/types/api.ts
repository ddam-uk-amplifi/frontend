// Generated TypeScript types from OpenAPI specification

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  MODERATOR = "moderator",
}

export enum BpoRole {
  MANAGER = "Manager",
  TEAM_LEADER = "Team leader",
  FULL_TIMER = "Full timer",
  PART_TIMER = "Part timer",
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

export interface PasswordReset {
  token: string;
  new_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface TokenRefresh {
  refresh_token: string;
}

export interface UserCreate {
  email: string;
  password: string;
  username: string;
  team?: string;
  bpo_role?: string;
  role?: UserRole;
}

export interface UserResponse {
  email: string;
  username: string;
  team?: "Bayan" | "Cashmere" | "Tenger" | "Khadaan" | "Nomads";
  bpo_role?: string;
  role?: UserRole;
  is_active?: boolean;
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  email?: string | null;
  username?: string | null;
  team?: string | null;
  bpo_role?: string | null;
  role?: UserRole | null;
  is_active?: boolean | null;
}

export interface UserUpdatePassword {
  current_password: string;
  new_password: string;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

// Additional types for frontend state management
export interface User extends UserResponse {}

export interface AuthState {
  user: User | null;
  tokens: Token | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: string[];
}
