import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/shared/api/client";
import type { MeResponse, Theme, User, UserProfileResponse } from "@/shared/api/types";

export const meKey = ["me"] as const;
export const userKey = (id: number) => ["user", id] as const;

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => api.get<MeResponse>("/me"),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: userKey(id),
    queryFn: () => api.get<UserProfileResponse>(`/users/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    /* a missing or private profile will not appear on retry */
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (theme: Theme) => api.patch<User>("/me", { theme }),
    onSuccess: (user) => {
      queryClient.setQueryData<MeResponse>(meKey, (prev) => (prev ? { ...prev, user } : undefined));
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: { status_emoji: string; status_text: string }) =>
      api.patch<User>("/me", status),
    onSuccess: (user) => {
      queryClient.setQueryData<MeResponse>(meKey, (prev) => (prev ? { ...prev, user } : undefined));
    },
  });
}
