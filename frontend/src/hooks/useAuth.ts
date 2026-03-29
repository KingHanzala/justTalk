import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, login, register } from "@/services/authService";
import type { LoginRequest, RegisterRequest } from "@/types";
import { STORAGE_KEYS, queryKeys } from "@/utils/constants";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (response) => {
      localStorage.setItem(STORAGE_KEYS.authToken, response.token);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: (response) => {
      localStorage.setItem(STORAGE_KEYS.authToken, response.token);
      queryClient.invalidateQueries();
    },
  });
}

export function logout(queryClient: ReturnType<typeof useQueryClient>) {
  localStorage.removeItem(STORAGE_KEYS.authToken);
  queryClient.clear();
}
