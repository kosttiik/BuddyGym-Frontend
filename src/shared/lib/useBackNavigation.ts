import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { canUseTelegramBackButton, showBackButton } from "@/shared/lib/telegram";

/* Telegram omits its BackButton on iOS and desktop, so fall back to an in-app one. */
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

  return { goBack, showFallback: !canUseTelegramBackButton() };
}
