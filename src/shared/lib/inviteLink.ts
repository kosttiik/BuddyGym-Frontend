/* Invite deep link: Telegram passes ?startapp=CODE to the mini app as the start param,
   which RoomsPage turns into a prefilled join screen. */
export function inviteLink(code: string): string {
  const bot = import.meta.env.VITE_BOT_USERNAME;
  const app = import.meta.env.VITE_MINIAPP_NAME;
  if (!bot) {
    /* no bot configured (dev/mock): fall back to the current origin, still a working join link */
    return `${window.location.origin}/join?code=${code}`;
  }
  const path = app ? `${bot}/${app}` : bot;
  return `https://t.me/${path}?startapp=${code}`;
}
