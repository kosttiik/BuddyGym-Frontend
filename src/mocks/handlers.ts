import { delay, HttpResponse, http } from "msw";
import type {
  Achievement,
  Checkin,
  CheckinStatus,
  Comment,
  CreateRoomRequest,
  FreezeRequest,
  GeoPoint,
  Stats,
  Theme,
  UpdateMembershipRequest,
} from "@/shared/api/types";
import { createDb, PLACEHOLDER_PHOTO, roomPicture, roomWithProgress } from "./db";

const MAX_PHOTO_BYTES = 10 << 20;

export let db = createDb();

/* The server derives the stats and folds the catalog against them; the mock walks it back. */
function statsOf(achievements: Achievement[]): Stats {
  const of = (key: string) => achievements.find((a) => a.key === key)?.current ?? 0;
  return {
    total_workouts: of("workouts_250"),
    best_streak: of("streak_30"),
    rooms: of("rooms_3"),
    buddies: of("buddies_5"),
    comments: of("comments_10"),
    early_workouts: of("early_bird_10"),
    late_workouts: of("night_owl_10"),
  };
}

function bestStreak(userId = db.me.id): number {
  let best = 0;
  for (const members of db.members.values()) {
    const found = members.find((m) => m.id === userId);
    best = Math.max(best, found?.streak ?? 0);
  }
  return best;
}

function likeComment(checkinId: string, id: number, on: boolean) {
  const list = db.comments.get(checkinId) ?? [];
  const comment = list.find((c) => c.id === id);
  if (!comment) {
    return error(404, "comment not found");
  }
  if (comment.liked_by_me !== on) {
    comment.liked_by_me = on;
    comment.likes += on ? 1 : -1;
  }
  return HttpResponse.json(comment);
}

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

  http.get("/api/v1/me", () =>
    HttpResponse.json({
      user: db.me,
      achievements: db.achievements,
      stats: statsOf(db.achievements),
      best_streak: bestStreak(),
    }),
  ),

  http.patch("/api/v1/me", async ({ request }) => {
    const body = (await request.json()) as {
      theme?: Theme;
      status_emoji?: string;
      status_text?: string;
    };
    if (body.theme !== undefined) {
      if (!["default", "dark", "neon"].includes(body.theme)) {
        return error(400, "unknown theme");
      }
      db.me = { ...db.me, theme: body.theme };
    }
    if (body.status_emoji !== undefined || body.status_text !== undefined) {
      const text = (body.status_text ?? db.me.status_text).trim();
      if (text.length > 60) {
        return error(400, "status text must be at most 60 characters");
      }
      db.me = {
        ...db.me,
        status_emoji: body.status_emoji ?? db.me.status_emoji,
        status_text: text,
      };
    }
    return HttpResponse.json(db.me);
  }),

  http.get("/api/v1/checkins/:id/comments", ({ params }) => {
    return HttpResponse.json(db.comments.get(String(params.id)) ?? []);
  }),

  http.post("/api/v1/checkins/:id/comments", async ({ params, request }) => {
    const checkinId = String(params.id);
    let body = "";
    let hasPhoto = false;

    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await request.formData();
      body = String(form.get("body") ?? "");
      hasPhoto = form.get("photo") instanceof File;
    } else {
      body = ((await request.json()) as { body?: string }).body ?? "";
    }
    body = body.trim();
    if (!body && !hasPhoto) {
      return error(400, "comment must not be empty");
    }
    if (body.length > 500) {
      return error(400, "comment too long");
    }

    const comment: Comment = {
      id: db.nextCommentId++,
      checkin_id: checkinId,
      user_id: db.me.id,
      author: db.me,
      body,
      has_photo: hasPhoto,
      likes: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    db.comments.set(checkinId, [...(db.comments.get(checkinId) ?? []), comment]);
    return HttpResponse.json(comment, { status: 201 });
  }),

  http.delete("/api/v1/checkins/:id/comments/:commentId", ({ params }) => {
    const checkinId = String(params.id);
    const id = Number(params.commentId);
    db.comments.set(
      checkinId,
      (db.comments.get(checkinId) ?? []).filter((c) => c.id !== id),
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/checkins/:id/comments/:commentId/like", ({ params }) => {
    return likeComment(String(params.id), Number(params.commentId), true);
  }),

  http.delete("/api/v1/checkins/:id/comments/:commentId/like", ({ params }) => {
    return likeComment(String(params.id), Number(params.commentId), false);
  }),

  http.get("/api/v1/users/:id", async ({ params }) => {
    await delay(250);
    const id = Number(params.id);
    const user = db.users.get(id);
    if (!user) {
      return error(404, "user not found");
    }
    const achievements = db.userAchievements.get(id) ?? [];
    return HttpResponse.json({
      user,
      achievements,
      stats: statsOf(achievements),
      best_streak: bestStreak(id),
    });
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
      has_avatar: false,
    };
    db.rooms.push(room);
    db.myRoomIds.add(room.id);
    db.progress.set(room.id, 0);
    db.members.set(room.id, [
      {
        ...db.me,
        workouts_count: 0,
        joined_at: new Date().toISOString(),
        streak: 0,
        period_ends_at: new Date(Date.now() + room.period_days * 86400_000).toISOString(),
        sport_name: "",
        sport_emoji: "",
        goal_per_period: null,
        effective_goal: room.goal_per_period,
        has_closed_period: false,
        last_closed_period_failed: false,
      },
    ]);
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
    /* members without a personal goal follow the room, the way COALESCE does on the server */
    for (const member of db.members.get(roomId) ?? []) {
      if (member.goal_per_period === null) {
        member.effective_goal = body.goal_per_period;
      }
    }
    return HttpResponse.json(room);
  }),

  http.get("/api/v1/rooms/:id/avatar", ({ params }) => {
    const room = db.rooms.find((r) => r.id === Number(params.id));
    const current = db.roomAvatars.get(room?.id ?? 0)?.[0];
    if (!room?.has_avatar || !current) {
      return error(404, "room has no picture");
    }
    return new HttpResponse(roomPicture(current.id), {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }),

  http.get("/api/v1/rooms/:id/avatars", ({ params }) => {
    const res = requireRoom(String(params.id));
    if ("fail" in res) {
      return res.fail;
    }
    const gallery = db.roomAvatars.get(res.room.id) ?? [];
    return HttpResponse.json(gallery.map((a, index) => ({ ...a, is_current: index === 0 })));
  }),

  http.get("/api/v1/rooms/:id/avatars/:avatarId", ({ params }) => {
    const gallery = db.roomAvatars.get(Number(params.id)) ?? [];
    const avatar = gallery.find((a) => a.id === Number(params.avatarId));
    if (!avatar) {
      return error(404, "picture not found");
    }
    return new HttpResponse(roomPicture(avatar.id), {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }),

  http.put("/api/v1/rooms/:id/avatar", async ({ params, request }) => {
    const res = requireRoom(String(params.id));
    if ("fail" in res) {
      return res.fail;
    }
    /* the body is not parsed: undici refuses a jsdom File, and the bytes are stubbed anyway */
    if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      return error(400, "photo is required");
    }
    await delay(300);
    const added = {
      id: db.nextRoomAvatarId++,
      uploaded_by: db.me.id,
      created_at: new Date().toISOString(),
      is_current: true,
    };
    db.roomAvatars.set(res.room.id, [added, ...(db.roomAvatars.get(res.room.id) ?? [])]);
    res.room.has_avatar = true;
    return HttpResponse.json(added, { status: 201 });
  }),

  http.delete("/api/v1/rooms/:id/avatars/:avatarId", ({ params }) => {
    const res = requireRoom(String(params.id));
    if ("fail" in res) {
      return res.fail;
    }
    const gallery = db.roomAvatars.get(res.room.id) ?? [];
    const avatar = gallery.find((a) => a.id === Number(params.avatarId));
    if (!avatar) {
      return error(404, "picture not found");
    }
    if (avatar.uploaded_by !== db.me.id && res.room.creator_id !== db.me.id) {
      return error(403, "uploader or room creator only");
    }
    const left = gallery.filter((a) => a.id !== avatar.id);
    db.roomAvatars.set(res.room.id, left);
    res.room.has_avatar = left.length > 0;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete("/api/v1/rooms/:id", ({ params }) => {
    const roomId = Number(params.id);
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) {
      return error(404, "room not found");
    }
    if (room.creator_id !== db.me.id) {
      return error(403, "room creator only");
    }
    db.rooms = db.rooms.filter((r) => r.id !== roomId);
    db.myRoomIds.delete(roomId);
    db.members.delete(roomId);
    db.progress.delete(roomId);
    db.checkins = db.checkins.filter((c) => c.room_id !== roomId);
    return new HttpResponse(null, { status: 204 });
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

  http.patch("/api/v1/rooms/:id/membership", async ({ params, request }) => {
    const roomId = Number(params.id);
    const me = db.members.get(roomId)?.find((m) => m.id === db.me.id);
    if (!me) {
      return error(403, "room members only");
    }
    const body = (await request.json()) as UpdateMembershipRequest;
    const room = db.rooms.find((r) => r.id === roomId);
    Object.assign(me, {
      sport_name: body.sport_name,
      sport_emoji: body.sport_emoji,
      goal_per_period: body.goal_per_period,
      effective_goal: body.goal_per_period ?? room?.goal_per_period ?? 3,
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/rooms/:id/freeze", async ({ params, request }) => {
    const roomId = Number(params.id);
    const me = db.members.get(roomId)?.find((m) => m.id === db.me.id);
    if (!me) {
      return error(403, "room members only");
    }
    if (me.freeze) {
      return error(400, "another freeze is already active or scheduled");
    }
    const body = (await request.json()) as FreezeRequest;
    me.freeze = {
      id: db.nextFreezeId++,
      room_id: roomId,
      user_id: db.me.id,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(me.freeze, { status: 201 });
  }),

  http.delete("/api/v1/rooms/:id/freeze", ({ params }) => {
    const roomId = Number(params.id);
    const me = db.members.get(roomId)?.find((m) => m.id === db.me.id);
    if (!me?.freeze) {
      return error(404, "no freeze");
    }
    me.freeze = undefined;
    me.freeze_cooldown_until = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    return new HttpResponse(null, { status: 204 });
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
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => {
        const thread = db.comments.get(c.id) ?? [];
        const top = [...thread].sort((a, b) => b.likes - a.likes)[0];
        return { ...c, comments_count: thread.length, top_comment: top };
      });
    return HttpResponse.json(list);
  }),

  http.post("/api/v1/checkins", async ({ request }) => {
    if (db.flags.checkinsDown) {
      return unavailable();
    }
    const replace = new URL(request.url).searchParams.get("replace") === "true";
    const contentType = request.headers.get("content-type") ?? "";
    let geo: GeoPoint | undefined;
    let hasPhoto = false;
    let roomIds: number[] = [];
    let buddyIds: number[] = [];

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
      buddyIds = form.getAll("buddy_ids").map((value) => Number(value));
    } else {
      const body = (await request.json()) as {
        geo?: GeoPoint;
        room_ids?: number[];
        buddy_ids?: number[];
      };
      if (!body.geo) {
        return error(400, "geo required");
      }
      geo = body.geo;
      roomIds = body.room_ids ?? [];
      buddyIds = body.buddy_ids ?? [];
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

    const today = new Date().toISOString().slice(0, 10);
    const existing = db.checkins.filter(
      (c) =>
        c.user_id === db.me.id &&
        roomIds.includes(c.room_id) &&
        (c.status === "pending" || c.status === "approved") &&
        c.created_at.slice(0, 10) === today,
    );
    if (existing.length > 0) {
      if (!replace) {
        return HttpResponse.json({ error: "already logged today", existing }, { status: 409 });
      }
      for (const old of existing) {
        old.status = "expired";
      }
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
        buddies: (db.members.get(room.id) ?? []).filter((m) => buddyIds.includes(m.id)),
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
