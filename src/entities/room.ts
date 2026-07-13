import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type {
  CreateRoomRequest,
  Room,
  RoomDetailResponse,
  RoomWithProgress,
} from "@/shared/api/types";

export const roomsKey = ["rooms"] as const;
export const openRoomsKey = ["open-rooms"] as const;
export const roomKey = (id: number) => ["room", id] as const;

export const roomsQueryOptions = () =>
  queryOptions({
    queryKey: roomsKey,
    queryFn: () => api.get<RoomWithProgress[]>("/rooms"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

export const openRoomsQueryOptions = () =>
  queryOptions({
    queryKey: openRoomsKey,
    queryFn: () => api.get<Room[]>("/rooms/open"),
  });

export const roomQueryOptions = (id: number) =>
  queryOptions({
    queryKey: roomKey(id),
    queryFn: () => api.get<RoomDetailResponse>(`/rooms/${id}`),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error instanceof Error && "status" in error) {
        const status = (error as { status: number }).status;
        if (status === 403 || status === 404) {
          return false;
        }
      }
      return failureCount < 2;
    },
  });

export function useRooms() {
  return useQuery(roomsQueryOptions());
}

export function useOpenRooms() {
  return useQuery(openRoomsQueryOptions());
}

export function useRoom(id: number) {
  return useQuery(roomQueryOptions(id));
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoomRequest) => api.post<Room>("/rooms", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomsKey });
    },
  });
}

export function useUpdateRoom(roomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoomRequest) => api.patch<Room>(`/rooms/${roomId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomsKey });
      void queryClient.invalidateQueries({ queryKey: openRoomsKey });
      void queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
    },
  });
}

export function useJoinByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => api.post<Room>("/rooms/join", { invite_code: inviteCode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomsKey });
    },
  });
}

export function useJoinRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => api.post<Room>(`/rooms/${roomId}/join`),
    onSuccess: (_, roomId) => {
      void queryClient.invalidateQueries({ queryKey: roomsKey });
      void queryClient.invalidateQueries({ queryKey: openRoomsKey });
      void queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
    },
  });
}

export function useLeaveRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => api.post<void>(`/rooms/${roomId}/leave`),
    onSuccess: (_, roomId) => {
      void queryClient.invalidateQueries({ queryKey: roomsKey });
      queryClient.removeQueries({ queryKey: roomKey(roomId) });
    },
  });
}
