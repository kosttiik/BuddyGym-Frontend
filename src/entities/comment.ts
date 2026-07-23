import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import type { Comment } from "@/shared/api/types";

export const commentsKey = (checkinId: string) => ["comments", checkinId] as const;

export const commentsQueryOptions = (checkinId: string) =>
  queryOptions({
    queryKey: commentsKey(checkinId),
    queryFn: () => api.get<Comment[]>(`/checkins/${checkinId}/comments`),
  });

export function useComments(checkinId: string, enabled = true) {
  return useQuery({ ...commentsQueryOptions(checkinId), enabled });
}

export type NewComment = { body: string; photo?: File; replyTo?: number };

export function useAddComment(checkinId: string, roomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, photo, replyTo }: NewComment) => {
      if (!photo) {
        return api.post<Comment>(`/checkins/${checkinId}/comments`, {
          body,
          ...(replyTo ? { reply_to: replyTo } : {}),
        });
      }
      const form = new FormData();
      form.append("body", body);
      form.append("photo", photo);
      if (replyTo) {
        form.append("reply_to", String(replyTo));
      }
      return api.postForm<Comment>(`/checkins/${checkinId}/comments`, form);
    },
    onSuccess: (comment) => {
      queryClient.setQueryData<Comment[]>(commentsKey(checkinId), (prev) => [
        ...(prev ?? []),
        comment,
      ]);
      void queryClient.invalidateQueries({ queryKey: ["checkins", roomId] });
    },
  });
}

export function useDeleteComment(checkinId: string, roomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/checkins/${checkinId}/comments/${id}`),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Comment[]>(commentsKey(checkinId), (prev) =>
        (prev ?? []).filter((c) => c.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: ["checkins", roomId] });
    },
  });
}

/* The heart flips instantly and rolls back if the server disagrees: a like is not worth a
   spinner. */
export function useLikeComment(checkinId: string, roomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, liked }: { id: number; liked: boolean }) => {
      if (liked) {
        await api.del(`/checkins/${checkinId}/comments/${id}/like`);
        return;
      }
      await api.post<Comment>(`/checkins/${checkinId}/comments/${id}/like`);
    },
    onMutate: async ({ id, liked }) => {
      await queryClient.cancelQueries({ queryKey: commentsKey(checkinId) });
      const previous = queryClient.getQueryData<Comment[]>(commentsKey(checkinId));
      queryClient.setQueryData<Comment[]>(commentsKey(checkinId), (prev) =>
        (prev ?? []).map((c) =>
          c.id === id ? { ...c, liked_by_me: !liked, likes: c.likes + (liked ? -1 : 1) } : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commentsKey(checkinId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(checkinId) });
      void queryClient.invalidateQueries({ queryKey: ["checkins", roomId] });
    },
  });
}

/* Comment photos sit in the same private bucket as everything else, so they are pulled with
   the token and handed to <img> as an object URL. */
export function useCommentPhoto(checkinId: string, comment: Comment): string | undefined {
  const [url, setUrl] = useState<string>();
  const { id, has_photo } = comment;

  useEffect(() => {
    if (!has_photo) {
      setUrl(undefined);
      return;
    }
    let cancelled = false;
    let objectUrl: string | undefined;

    api
      .getBlob(`/checkins/${checkinId}/comments/${id}/photo`)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(undefined));

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [checkinId, id, has_photo]);

  return url;
}
