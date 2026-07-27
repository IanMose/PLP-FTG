/** Auth & user management types for Sentinel backend API */

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
  role: string;
  userId: number;
}

export interface SentinelUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  lastLoginAt: string | null;
}

export interface SentinelRole {
  id: number;
  name: string;
  description: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}
