import { useCallback } from "react";
import { ApiError } from "@/shared/api/client";
import { useI18n } from "@/shared/i18n";
import { useToast } from "@/shared/ui";

/* Maps backend errors to the toasts from the handoff (429, 502, generic). */
export function useApiErrorToast(): (error: unknown) => void {
  const { t } = useI18n();
  const showToast = useToast();

  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 429) {
        showToast({
          title: t.errors.tooOften,
          description: t.errors.tooOftenDesc,
          tone: "warning",
        });
        return;
      }
      if (error instanceof ApiError && error.status === 502) {
        showToast({
          title: t.errors.checkinsUnavailable,
          description: t.errors.checkinsUnavailableDesc,
          tone: "warning",
        });
        return;
      }
      showToast({ title: t.errors.generic, description: t.errors.genericDesc, tone: "error" });
    },
    [showToast, t],
  );
}
