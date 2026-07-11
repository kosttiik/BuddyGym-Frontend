import type { Dictionary, Locale } from "@/shared/i18n";
import { formatDay, formatTime } from "@/shared/i18n";

export function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
}

export function formatCheckinTime(createdAt: string, t: Dictionary, locale: Locale): string {
  const created = new Date(createdAt);
  const now = new Date();
  const time = formatTime(created, locale);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (created >= startOfDay) {
    return `${t.room.today}, ${time}`;
  }
  const startOfYesterday = new Date(startOfDay.getTime() - 24 * 3_600_000);
  if (created >= startOfYesterday) {
    return `${t.room.yesterday}, ${time}`;
  }
  return `${formatDay(created, locale)}, ${time}`;
}
