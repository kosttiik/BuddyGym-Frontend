import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { MeResponse, Theme, User } from "@/shared/api/types";

export const meKey = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => api.get<MeResponse>("/me"),
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
