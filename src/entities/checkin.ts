import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/shared/api/client";
import type { Checkin, CheckinStatus, GeoPoint } from "@/shared/api/types";
import { rememberMyVote } from "@/shared/lib/myVotes";
import { roomsKey } from "./room";

export const checkinsKey = (roomId: number, status?: CheckinStatus) =>
  ["checkins", roomId, status ?? "all"] as const;

export const checkinsQueryOptions = (roomId: number, status?: CheckinStatus) => {
  const search = status ? `?status=${status}&limit=100` : "?limit=100";
  return queryOptions({
    queryKey: checkinsKey(roomId, status),
    queryFn: () => api.get<Checkin[]>(`/rooms/${roomId}/checkins${search}`),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 502 || error.status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export function useRoomCheckins(roomId: number, status?: CheckinStatus) {
  return useQuery(checkinsQueryOptions(roomId, status));
}

export type CreateCheckinInput = { photo: File } | { geo: GeoPoint };

export function useCreateCheckin(roomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCheckinInput) => {
      if ("photo" in input) {
        const form = new FormData();
        form.append("photo", input.photo);
        return api.postForm<Checkin>(`/rooms/${roomId}/checkins`, form);
      }
      return api.post<Checkin>(`/rooms/${roomId}/checkins`, { geo: input.geo });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["checkins", roomId] });
      void queryClient.invalidateQueries({ queryKey: roomsKey });
    },
  });
}

export function useVote(roomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checkinId, approve }: { checkinId: string; approve: boolean }) =>
      api.post<Checkin>(`/checkins/${checkinId}/vote`, { approve }),
    onMutate: async ({ checkinId, approve }) => {
      /* optimistic bump of the vote counters in every cached list for this room */
      await queryClient.cancelQueries({ queryKey: ["checkins", roomId] });
      const snapshots = queryClient.getQueriesData<Checkin[]>({ queryKey: ["checkins", roomId] });
      for (const [key, list] of snapshots) {
        if (!list) {
          continue;
        }
        queryClient.setQueryData<Checkin[]>(
          key,
          list.map((c) =>
            c.id === checkinId
              ? {
                  ...c,
                  votes_approve: c.votes_approve + (approve ? 1 : 0),
                  votes_reject: c.votes_reject + (approve ? 0 : 1),
                }
              : c,
          ),
        );
      }
      return { snapshots };
    },
    onError: (error, { checkinId, approve }, context) => {
      for (const [key, list] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, list);
      }
      /* 409 means the vote already exists server-side: fix the local state */
      if (error instanceof ApiError && error.status === 409) {
        rememberMyVote(checkinId, approve);
      }
    },
    onSuccess: (checkin, { checkinId, approve }) => {
      rememberMyVote(checkinId, approve);
      const snapshots = queryClient.getQueriesData<Checkin[]>({ queryKey: ["checkins", roomId] });
      for (const [key, list] of snapshots) {
        if (!list) {
          continue;
        }
        queryClient.setQueryData<Checkin[]>(
          key,
          list.map((c) => (c.id === checkin.id ? checkin : c)),
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["checkins", roomId] });
    },
  });
}
