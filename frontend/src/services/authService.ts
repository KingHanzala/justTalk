import { apiRequest } from "@/services/api";
import type { AuthFlowResponse, LoginRequest, RegisterRequest, ResendVerificationRequest, User, VerifyCodeRequest } from "@/types";

export function login(data: LoginRequest) {
  return apiRequest<AuthFlowResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function register(data: RegisterRequest) {
  return apiRequest<AuthFlowResponse>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function verifyCode(data: VerifyCodeRequest) {
  return apiRequest<AuthFlowResponse>("/api/auth/verify", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function resendCode(data: ResendVerificationRequest) {
  return apiRequest<AuthFlowResponse>("/api/auth/resend-code", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function getCurrentUser() {
  return apiRequest<User>("/api/auth/me");
}
