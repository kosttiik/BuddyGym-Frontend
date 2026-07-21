import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

/* Telegram serves avatars from hosts our users cannot reach, so core mirrors them into a
   private bucket and proxies the bytes behind the Bearer token. Room pictures live in the
   same bucket. That rules out a plain <img src>, so the blob is fetched once and shared:
   the same face shows up in the member list, the feed and the profile, and must not be
   downloaded once per component.
   Object URLs are never revoked: they are bounded by the number of distinct users and rooms
   seen in a session, and revoking one would blank every avatar still rendering it. */
const urls = new Map<string, string>();
const inFlight = new Map<string, Promise<string | undefined>>();

function load(path: string): Promise<string | undefined> {
  const pending = inFlight.get(path);
  if (pending) {
    return pending;
  }
  const request = api
    .getBlob(path)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      urls.set(path, url);
      return url;
    })
    .catch(() => undefined)
    .finally(() => inFlight.delete(path));

  inFlight.set(path, request);
  return request;
}

/* warms the cache for a neighbouring slide so a swipe never lands on an empty frame */
export function prefetchImage(path: string): void {
  if (!urls.has(path)) {
    void load(path);
  }
}

/* a replaced picture reuses its key, so the cached object URL has to be dropped by hand */
export function forgetAvatar(path: string): void {
  urls.delete(path);
  inFlight.delete(path);
}

function useRemoteImage(path: string, exists: boolean | undefined): string | undefined {
  const [url, setUrl] = useState(() => (exists ? urls.get(path) : undefined));

  useEffect(() => {
    if (!exists) {
      setUrl(undefined);
      return;
    }
    const cached = urls.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    load(path).then((loaded) => {
      if (!cancelled) {
        setUrl(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [path, exists]);

  return url;
}

export const avatarPath = (userId: number) => `/users/${userId}/avatar`;
export const roomAvatarPath = (roomId: number) => `/rooms/${roomId}/avatar`;
export const roomAvatarByIdPath = (roomId: number, avatarId: number) =>
  `/rooms/${roomId}/avatars/${avatarId}`;

export function useAvatar(userId: number, hasAvatar: boolean | undefined): string | undefined {
  return useRemoteImage(avatarPath(userId), hasAvatar);
}

export function useRoomAvatar(roomId: number, hasAvatar: boolean | undefined): string | undefined {
  return useRemoteImage(roomAvatarPath(roomId), hasAvatar);
}

/* one picture from the room gallery: the key never changes, so it caches like any other */
export function useRoomGalleryPhoto(roomId: number, avatarId: number | undefined) {
  return useRemoteImage(roomAvatarByIdPath(roomId, avatarId ?? 0), avatarId !== undefined);
}
