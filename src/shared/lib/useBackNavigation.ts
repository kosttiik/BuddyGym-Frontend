import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { showBackButton } from "@/shared/lib/telegram";

/* Telegram reports its BackButton as available even on clients that never draw it (iOS,
   desktop), so the in-app control is always shown rather than trusted away. */
export function useBackNavigation() {
  const router = useRouter();

  const goBack = useCallback(() => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      void router.navigate({ to: "/" });
    }
  }, [router]);

  useEffect(() => showBackButton(goBack), [goBack]);

  return { goBack, showFallback: true };
}
