import { delay, HttpResponse, http } from "msw";
import type {
  Checkin,
  CheckinStatus,
  CreateRoomRequest,
  GeoPoint,
  Theme,
} from "@/shared/api/types";
import { createDb, PLACEHOLDER_PHOTO, roomWithProgress } from "./db";

const MAX_PHOTO_BYTES = 10 << 20;

export let db = createDb();

export function resetDb(): void {
  db = createDb();
}

/* Console helper for demos: __bgMock.checkinsDown = true simulates a 502. */
declare global {
  interface Window {
    __bgMock?: { checkinsDown: boolean };
  }
}
if (typeof window !== "undefined") {
  window.__bgMock = db.flags;
}

const error = (status: number, message: string) =>
  HttpResponse.json({ error: message }, { status });

const unavailable = () => error(502, "checkin service unavailable");

function requireRoom(id: string) {
  const roomId = Number(id);
  const room = db.rooms.find((r) => r.id === roomId);
  if (!room) {
    return { fail: error(404, "room not found") } as const;
  }
  if (!db.myRoomIds.has(roomId)) {
    if (room.kind === "invite") {
      return { fail: error(403, "room members only") } as const;
    }
    return { room, isMember: false } as const;
  }
  return { room, isMember: true } as const;
}

function finalizeVotes(checkin: Checkin): Checkin {
  if (checkin.votes_approve >= checkin.votes_required) {
    checkin.status = "approved";
    db.progress.set(checkin.room_id, (db.progress.get(checkin.room_id) ?? 0) + 1);
  } else if (checkin.votes_reject >= checkin.votes_required) {
    checkin.status = "rejected";
  }
  return checkin;
}

export const handlers = [
  http.post("/api/v1/auth/telegram", async () => {
    await delay(300);
    return HttpResponse.json({ token: "mock-token", user: db.me });
  }),

  http.get("/api/v1/me", () => HttpResponse.json({ user: db.me, achievements: db.achievements })),

  http.patch("/api/v1/me", async ({ request }) => {
    const { theme } = (await request.json()) as { theme: Theme };
    if (!["default", "dark", "neon"].includes(theme)) {
      return error(400, "unknown theme");
    }
    db.me = { ...db.me, theme };
    return HttpResponse.json(db.me);
  }),

  http.get("/api/v1/users/:id", async ({ params }) => {
    await delay(250);
    const id = Number(params.id);
    const user = db.users.get(id);
    if (!user) {
      return error(404, "user not found");
    }
    return HttpResponse.json({ user, achievements: db.userAchievements.get(id) ?? [] });
  }),

  http.get("/api/v1/rooms", async () => {
    await delay(400);
    const mine = db.rooms.filter((r) => db.myRoomIds.has(r.id));
    return HttpResponse.json(mine.map((r) => roomWithProgress(db, r)));
  }),

  http.get("/api/v1/rooms/open", async () => {
    await delay(400);
    return HttpResponse.json(
      db.rooms
        .filter((room) => room.kind === "open" && !db.myRoomIds.has(room.id))
        .map(({ invite_code: _, ...room }) => room),
    );
  }),

  http.post("/api/v1/rooms", async ({ request }) => {
    const body = (await request.json()) as CreateRoomRequest;
    const name = body.name.trim();
    if (name.length < 1 || name.length > 64) {
      return error(400, "invalid name");
    }
    const room = {
      id: db.nextRoomId++,
      name,
      kind: body.kind,
      invite_code: "A2B3C4D5",
      goal_per_period: body.goal_per_period,
      period_days: body.period_days,
      votes_required: body.votes_required,
      creator_id: db.me.id,
      created_at: new Date().toISOString(),
    };
    db.rooms.push(room);
    db.myRoomIds.add(room.id);
    db.progress.set(room.id, 0);
    db.members.set(room.id, [{ ...db.me, workouts_count: 0, joined_at: new Date().toISOString() }]);
    return HttpResponse.json(room, { status: 201 });
  }),

  http.post("/api/v1/rooms/join", async ({ request }) => {
    const { invite_code } = (await request.json()) as { invite_code: string };
    const code = invite_code.trim().toUpperCase();
    const room = db.rooms.find((r) => r.invite_code === code);
    if (!room) {
      return error(404, "invalid invite code");
    }
    db.myRoomIds.add(room.id);
    db.progress.set(room.id, db.progress.get(room.id) ?? 0);
    return HttpResponse.json(room);
  }),

  http.patch("/api/v1/rooms/:id", async ({ params, request }) => {
    const roomId = Number(params.id);
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) {
      return error(404, "room not found");
    }
    if (room.creator_id !== db.me.id) {
      return error(403, "room creator only");
    }
    const body = (await request.json()) as CreateRoomRequest;
    const name = body.name.trim();
    if (name.length < 1 || name.length > 64) {
      return error(400, "invalid name");
    }
    Object.assign(room, {
      name,
      kind: body.kind,
      goal_per_period: body.goal_per_period,
      period_days: body.period_days,
      votes_required: body.votes_required,
    });
    return HttpResponse.json(room);
  }),

  http.get("/api/v1/rooms/:id", ({ params }) => {
    const res = requireRoom(String(params.id));
    if ("fail" in res) {
      return res.fail;
    }
    const room = res.isMember ? res.room : { ...res.room, invite_code: undefined };
    return HttpResponse.json({ room, members: db.members.get(res.room.id) ?? [] });
  }),

  http.post("/api/v1/rooms/:id/join", ({ params }) => {
    const roomId = Number(params.id);
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) {
      return error(404, "room not found");
    }
    if (room.kind !== "open") {
      return error(403, "invite only");
    }
    db.myRoomIds.add(roomId);
    return HttpResponse.json(room);
  }),

  http.post("/api/v1/rooms/:id/leave", ({ params }) => {
    const roomId = Number(params.id);
    if (!db.myRoomIds.has(roomId)) {
      return error(404, "not a member");
    }
    db.myRoomIds.delete(roomId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/rooms/:id/checkins", async ({ params, request }) => {
    if (db.flags.checkinsDown) {
      return unavailable();
    }
    const res = requireRoom(String(params.id));
    if ("fail" in res) {
      return res.fail;
    }
    await delay(300);
    const status = new URL(request.url).searchParams.get("status") as CheckinStatus | null;
    const list = db.checkins
      .filter((c) => c.room_id === res.room.id && (!status || c.status === status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return HttpResponse.json(list);
  }),

  http.post("/api/v1/checkins", async ({ request }) => {
    if (db.flags.checkinsDown) {
      return unavailable();
    }
    const contentType = request.headers.get("content-type") ?? "";
    let geo: GeoPoint | undefined;
    let hasPhoto = false;
    let roomIds: number[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const photo = form.get("photo");
      if (!(photo instanceof File) || photo.size === 0) {
        return error(400, "photo required");
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return error(400, "photo too large");
      }
      hasPhoto = true;
      roomIds = form.getAll("room_ids").map((value) => Number(value));
    } else {
      const body = (await request.json()) as { geo?: GeoPoint; room_ids?: number[] };
      if (!body.geo) {
        return error(400, "geo required");
      }
      geo = body.geo;
      roomIds = body.room_ids ?? [];
    }

    if (roomIds.length === 0) {
      return error(400, "room_ids required");
    }

    const rooms = [];
    for (const roomId of roomIds) {
      const res = requireRoom(String(roomId));
      if ("fail" in res) {
        return res.fail;
      }
      rooms.push(res.room);
    }

    await delay(600);
    const instant = geo !== undefined;
    /* one proof, one photo, one checkin per room */
    const created: Checkin[] = rooms.map((room) => {
      const checkin: Checkin = {
        id: `c-${db.nextCheckinId++}`,
        room_id: room.id,
        user_id: db.me.id,
        status: instant ? "approved" : "pending",
        has_photo: hasPhoto,
        photo_purged: false,
        photo_expires_at: hasPhoto
          ? new Date(Date.now() + 14 * 24 * 3_600_000).toISOString()
          : undefined,
        geo,
        votes_approve: 0,
        votes_reject: 0,
        votes_required: room.votes_required,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      };
      if (instant) {
        db.progress.set(room.id, (db.progress.get(room.id) ?? 0) + 1);
      }
      db.checkins.unshift(checkin);
      return checkin;
    });

    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/v1/checkins/:id/photo", async ({ params }) => {
    const checkin = db.checkins.find((c) => c.id === params.id);
    if (!checkin?.has_photo || checkin.photo_purged) {
      return error(404, "photo not found");
    }
    await delay(200);
    const svg = decodeURIComponent(PLACEHOLDER_PHOTO.replace("data:image/svg+xml,", ""));
    return new HttpResponse(svg, { headers: { "Content-Type": "image/svg+xml" } });
  }),

  http.post("/api/v1/checkins/:id/vote", async ({ params, request }) => {
    if (db.flags.checkinsDown) {
      return unavailable();
    }
    const checkin = db.checkins.find((c) => c.id === params.id);
    if (!checkin) {
      return error(404, "checkin not found");
    }
    if (checkin.user_id === db.me.id) {
      return error(403, "cannot vote on own checkin");
    }
    const voters = db.votedBy.get(checkin.id) ?? new Set<number>();
    if (voters.has(db.me.id)) {
      return error(409, "already voted");
    }
    const { approve } = (await request.json()) as { approve: boolean };
    voters.add(db.me.id);
    db.votedBy.set(checkin.id, voters);
    if (approve) {
      checkin.votes_approve += 1;
    } else {
      checkin.votes_reject += 1;
    }
    await delay(250);
    return HttpResponse.json(finalizeVotes(checkin));
  }),
];
