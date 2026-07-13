const KEY = "bg.seenTabs";

type Seen = Record<string, number>;

function read(): Seen {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Seen;
  } catch {
    return {};
  }
}

function write(seen: Seen): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    /* private mode: unread counts simply do not persist */
  }
}

function slot(roomId: number, status: string): string {
  return `${roomId}:${status}`;
}

export function unreadCount(roomId: number, status: string, total: number): number {
  const seen = read()[slot(roomId, status)] ?? 0;
  return Math.max(0, total - seen);
}

export function markSeen(roomId: number, status: string, total: number): void {
  const seen = read();
  seen[slot(roomId, status)] = total;
  write(seen);
}
