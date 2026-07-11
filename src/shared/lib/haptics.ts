import { hapticFeedback } from "@telegram-apps/sdk-react";

/* All helpers no-op outside Telegram so the web/dev build works unchanged. */

export function hapticTap(): void {
  if (hapticFeedback.impactOccurred.isAvailable()) {
    hapticFeedback.impactOccurred("light");
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" | "soft" | "rigid"): void {
  if (hapticFeedback.impactOccurred.isAvailable()) {
    hapticFeedback.impactOccurred(style);
  }
}

export function hapticNotify(type: "error" | "success" | "warning"): void {
  if (hapticFeedback.notificationOccurred.isAvailable()) {
    hapticFeedback.notificationOccurred(type);
  }
}

export function hapticSelection(): void {
  if (hapticFeedback.selectionChanged.isAvailable()) {
    hapticFeedback.selectionChanged();
  }
}
