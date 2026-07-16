import type { AnyRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { hapticImpact } from "@/shared/lib/haptics";

const EDGE = 28;
const DISTANCE = 72;
const VELOCITY = 0.35;

/* iOS-style pop: Telegram gives mini apps no back gesture of their own. The router comes in as
   an argument: the gesture lives outside RouterProvider, where useRouter has no context. */
export function useEdgeSwipeBack(router: AnyRouter): void {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let tracking = false;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || event.touches.length > 1) {
        tracking = false;
        return;
      }
      if (touch.clientX > EDGE) {
        tracking = false;
        return;
      }
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      startedAt = event.timeStamp;
    };

    const onEnd = (event: TouchEvent) => {
      if (!tracking) {
        return;
      }
      tracking = false;

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      const elapsed = Math.max(1, event.timeStamp - startedAt);

      if (dx < 0 || dy > dx * 0.8) {
        return;
      }
      if (dx >= DISTANCE || dx / elapsed >= VELOCITY) {
        hapticImpact("light");
        if (router.history.canGoBack()) {
          router.history.back();
        } else {
          void router.navigate({ to: "/" });
        }
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [router]);
}
