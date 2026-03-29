import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, login, register, resendCode, verifyCode } from "@/services/authService";
import type { LoginRequest, RegisterRequest, ResendVerificationRequest, VerifyCodeRequest } from "@/types";
import { STORAGE_KEYS, queryKeys } from "@/utils/constants";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getCurrentUser,
    enabled: Boolean(localStorage.getItem(STORAGE_KEYS.authToken)),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (response) => {
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.authToken, response.token);
        localStorage.removeItem(STORAGE_KEYS.pendingVerification);
      }
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: (response) => {
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.authToken, response.token);
        localStorage.removeItem(STORAGE_KEYS.pendingVerification);
      }
      queryClient.invalidateQueries();
    },
  });
}

export function useVerifyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VerifyCodeRequest) => verifyCode(data),
    onSuccess: (response) => {
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.authToken, response.token);
        localStorage.removeItem(STORAGE_KEYS.pendingVerification);
      }
      queryClient.invalidateQueries();
    },
  });
}

export function useResendCode() {
  return useMutation({
    mutationFn: (data: ResendVerificationRequest) => resendCode(data),
  });
}

export function logout(queryClient: ReturnType<typeof useQueryClient>) {
  localStorage.removeItem(STORAGE_KEYS.authToken);
  localStorage.removeItem(STORAGE_KEYS.pendingVerification);
  queryClient.clear();
}
