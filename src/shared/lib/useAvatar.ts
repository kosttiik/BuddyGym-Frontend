import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

/* Telegram serves avatars from hosts our users cannot reach, so core mirrors them into a
   private bucket and proxies the bytes behind the Bearer token. That rules out a plain
   <img src>, so the blob is fetched once and shared: the same face shows up in the member
   list, the feed and the profile, and must not be downloaded once per component.
   Object URLs are never revoked: they are bounded by the number of distinct users seen in
   a session, and revoking one would blank every avatar still rendering it. */
const urls = new Map<number, string>();
const inFlight = new Map<number, Promise<string | undefined>>();

function load(userId: number): Promise<string | undefined> {
  const pending = inFlight.get(userId);
  if (pending) {
    return pending;
  }
  const request = api
    .getBlob(`/users/${userId}/avatar`)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      urls.set(userId, url);
      return url;
    })
    .catch(() => undefined)
    .finally(() => inFlight.delete(userId));

  inFlight.set(userId, request);
  return request;
}

export function useAvatar(userId: number, hasAvatar: boolean | undefined): string | undefined {
  const [url, setUrl] = useState(() => (hasAvatar ? urls.get(userId) : undefined));

  useEffect(() => {
    if (!hasAvatar) {
      setUrl(undefined);
      return;
    }
    const cached = urls.get(userId);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    load(userId).then((loaded) => {
      if (!cancelled) {
        setUrl(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hasAvatar]);

  return url;
}
