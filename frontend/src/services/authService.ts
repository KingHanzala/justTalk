import { apiRequest } from "@/services/api";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types";

export function login(data: LoginRequest) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function register(data: RegisterRequest) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function getCurrentUser() {
  return apiRequest<User>("/api/auth/me");
}
