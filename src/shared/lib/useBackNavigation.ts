import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { isInsideTelegram, showBackButton } from "@/shared/lib/telegram";

/* Nested screens: Telegram BackButton inside Telegram, in-app fallback outside. */
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

  return { goBack, showFallback: !isInsideTelegram() };
}
