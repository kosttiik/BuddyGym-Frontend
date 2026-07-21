import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type {
  CreateRoomRequest,
  Room,
  RoomAvatar,
  RoomDetailResponse,
  RoomWithProgress,
} from "@/shared/api/types";
import { forgetAvatar, roomAvatarPath } from "@/shared/lib/useAvatar";

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

export const roomAvatarsKey = (id: number) => ["room-avatars", id] as const;

export function useRoomAvatars(roomId: number, enabled = true) {
  return useQuery({
    queryKey: roomAvatarsKey(roomId),
    queryFn: () => api.get<RoomAvatar[]>(`/rooms/${roomId}/avatars`),
    enabled,
  });
}

function useGalleryRefresh(roomId: number) {
  const queryClient = useQueryClient();
  return () => {
    /* the room wears the newest picture, so its cached blob is stale after any change */
    forgetAvatar(roomAvatarPath(roomId));
    void queryClient.invalidateQueries({ queryKey: roomAvatarsKey(roomId) });
    void queryClient.invalidateQueries({ queryKey: roomsKey });
    void queryClient.invalidateQueries({ queryKey: openRoomsKey });
    void queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
  };
}

export function useAddRoomAvatar(roomId: number) {
  const refresh = useGalleryRefresh(roomId);
  return useMutation({
    mutationFn: (photo: File) => {
      const form = new FormData();
      form.append("photo", photo);
      return api.putForm<RoomAvatar>(`/rooms/${roomId}/avatar`, form);
    },
    onSuccess: refresh,
  });
}

export function useDeleteRoomAvatar(roomId: number) {
  const refresh = useGalleryRefresh(roomId);
  return useMutation({
    mutationFn: (avatarId: number) => api.del(`/rooms/${roomId}/avatars/${avatarId}`),
    onSuccess: refresh,
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: number) => api.del(`/rooms/${roomId}`),
    onSuccess: (_, roomId) => {
      queryClient.removeQueries({ queryKey: roomKey(roomId) });
      void queryClient.invalidateQueries({ queryKey: roomsKey });
      void queryClient.invalidateQueries({ queryKey: openRoomsKey });
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
