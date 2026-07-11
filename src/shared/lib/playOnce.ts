import { useEffect, useRef } from "react";

/* True only on the first mount for a key, so a re-mounted page (tab switch)
   does not replay its reveal cascade. */
const played = new Set<string>();

export function useFirstReveal(key: string): boolean {
  const first = useRef(!played.has(key));
  useEffect(() => {
    played.add(key);
  }, [key]);
  return first.current;
}
