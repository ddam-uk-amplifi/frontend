// Generated TypeScript types from OpenAPI specification

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
}

export interface LoginRequest {
  username: string;
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
  username: string;
  email: string;
  password: string;
  is_superuser?: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
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
