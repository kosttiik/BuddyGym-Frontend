import type {
  Achievement,
  AchievementKey,
  Checkin,
  Member,
  Room,
  RoomWithProgress,
  User,
} from "@/shared/api/types";

/* Diagonal-hatch placeholder, like the photo stubs in the design handoff. */
export const PLACEHOLDER_PHOTO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <defs><pattern id="h" width="14" height="14" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="#233229"/><line x1="0" y1="0" x2="0" y2="14" stroke="#2e4237" stroke-width="6"/>
    </pattern></defs>
    <rect width="400" height="400" fill="url(#h)"/>
  </svg>`,
)}`;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function user(id: number, firstName: string, status: User["status"]): User {
  return {
    id,
    username: "",
    first_name: firstName,
    photo_url: "",
    theme: "default",
    status,
    created_at: iso(-90 * DAY),
  };
}

export type MockDb = {
  me: User;
  achievements: Achievement[];
  users: Map<number, User>;
  userAchievements: Map<number, Achievement[]>;
  rooms: Room[];
  myRoomIds: Set<number>;
  progress: Map<number, number>;
  members: Map<number, Member[]>;
  checkins: Checkin[];
  votedBy: Map<string, Set<number>>;
  flags: { checkinsDown: boolean };
  nextRoomId: number;
  nextCheckinId: number;
};

function member(u: User, workouts: number, joinedDaysAgo: number): Member {
  return { ...u, workouts_count: workouts, joined_at: iso(-joinedDaysAgo * DAY) };
}

function achs(...keys: AchievementKey[]): Achievement[] {
  return keys.map((key, i) => ({ key, granted_at: iso(-(70 - i * 8) * DAY) }));
}

export function createDb(): MockDb {
  const me = user(1, "Костя", "regular");
  const marina = user(2, "Марина", "beast");
  const dima = user(3, "Дима", "regular");
  const lera = user(4, "Лера", "novice");
  const pasha = user(5, "Паша", "novice");
  const extra = Array.from({ length: 8 }, (_, i) => user(10 + i, `Гость ${i + 1}`, "novice"));

  const rooms: Room[] = [
    {
      id: 1,
      name: "Утренние тренировки",
      kind: "open",
      invite_code: "M3PXQ2YF",
      goal_per_period: 3,
      period_days: 7,
      votes_required: 2,
      creator_id: 1,
      created_at: iso(-30 * DAY),
    },
    {
      id: 2,
      name: "Железные братья",
      kind: "invite",
      invite_code: "K7WM2Q9F",
      goal_per_period: 5,
      period_days: 7,
      votes_required: 2,
      creator_id: 2,
      created_at: iso(-60 * DAY),
    },
    {
      id: 3,
      name: "Большая цель",
      kind: "open",
      invite_code: "R8TCV4ZD",
      goal_per_period: 40,
      period_days: 30,
      votes_required: 3,
      creator_id: 3,
      created_at: iso(-14 * DAY),
    },
    {
      id: 4,
      name: "Клуб новичков",
      kind: "open",
      invite_code: "P4KLM8VC",
      goal_per_period: 2,
      period_days: 7,
      votes_required: 2,
      creator_id: 5,
      created_at: iso(-5 * DAY),
    },
    {
      id: 99,
      name: "Секретная качалка",
      kind: "invite",
      invite_code: "ZZ77XX22",
      goal_per_period: 4,
      period_days: 7,
      votes_required: 2,
      creator_id: 4,
      created_at: iso(-10 * DAY),
    },
  ];

  const checkins: Checkin[] = [
    {
      id: "c-1",
      room_id: 2,
      user_id: 2,
      status: "pending",
      has_photo: true,
      photo_purged: false,
      photo_expires_at: iso(14 * DAY),
      votes_approve: 1,
      votes_reject: 0,
      votes_required: 2,
      created_at: iso(-6 * HOUR),
      expires_at: iso(18 * HOUR),
    },
    {
      id: "c-2",
      room_id: 2,
      user_id: 4,
      status: "pending",
      has_photo: true,
      photo_purged: false,
      photo_expires_at: iso(14 * DAY),
      votes_approve: 0,
      votes_reject: 1,
      votes_required: 2,
      created_at: iso(-2 * HOUR),
      expires_at: iso(22 * HOUR),
    },
    {
      id: "c-3",
      room_id: 2,
      user_id: 3,
      status: "approved",
      has_photo: false,
      photo_purged: false,
      geo: { lat: 55.751, lon: 37.618 },
      votes_approve: 0,
      votes_reject: 0,
      votes_required: 2,
      created_at: iso(-26 * HOUR),
      expires_at: iso(-2 * HOUR),
    },
    {
      id: "c-4",
      room_id: 2,
      user_id: 2,
      status: "approved",
      has_photo: true,
      photo_purged: false,
      photo_expires_at: iso(14 * DAY),
      votes_approve: 2,
      votes_reject: 0,
      votes_required: 2,
      created_at: iso(-30 * HOUR),
      expires_at: iso(-6 * HOUR),
    },
    {
      id: "c-5",
      room_id: 2,
      user_id: 5,
      status: "rejected",
      has_photo: true,
      photo_purged: false,
      photo_expires_at: iso(14 * DAY),
      votes_approve: 0,
      votes_reject: 2,
      votes_required: 2,
      created_at: iso(-40 * HOUR),
      expires_at: iso(-16 * HOUR),
    },
    {
      id: "c-6",
      room_id: 2,
      user_id: 4,
      status: "expired",
      /* old enough that the retention job already removed the photo */
      has_photo: false,
      photo_purged: true,
      photo_expires_at: iso(-2 * DAY),
      votes_approve: 1,
      votes_reject: 0,
      votes_required: 2,
      created_at: iso(-50 * HOUR),
      expires_at: iso(-26 * HOUR),
    },
    {
      id: "c-7",
      room_id: 1,
      user_id: 1,
      status: "approved",
      has_photo: false,
      photo_purged: false,
      geo: { lat: 55.751, lon: 37.618 },
      votes_approve: 0,
      votes_reject: 0,
      votes_required: 2,
      created_at: iso(-20 * HOUR),
      expires_at: iso(4 * HOUR),
    },
  ];

  const meAchievements: Achievement[] = [
    { key: "first_checkin", granted_at: iso(-80 * DAY) },
    { key: "workouts_10", granted_at: iso(-30 * DAY) },
    { key: "streak_7", granted_at: iso(-7 * DAY) },
  ];

  const allUsers = [me, marina, dima, lera, pasha, ...extra];
  const users = new Map<number, User>(allUsers.map((u) => [u.id, u]));
  const userAchievements = new Map<number, Achievement[]>([
    [me.id, meAchievements],
    [marina.id, achs("first_checkin", "workouts_10", "workouts_50", "workouts_100", "streak_7")],
    [dima.id, achs("first_checkin", "workouts_10")],
    [lera.id, achs("first_checkin")],
    [pasha.id, []],
    ...extra.map(
      (u, i) => [u.id, i % 2 === 0 ? achs("first_checkin") : []] as [number, Achievement[]],
    ),
  ]);

  return {
    me,
    achievements: meAchievements,
    users,
    userAchievements,
    rooms,
    myRoomIds: new Set([1, 2, 3]),
    progress: new Map([
      [1, 2],
      [2, 3],
      [3, 12],
    ]),
    members: new Map([
      [1, [member(me, 2, 30), member(dima, 1, 25), member(lera, 3, 20), member(pasha, 0, 5)]],
      [
        2,
        [
          member(marina, 4, 60),
          member(me, 3, 55),
          member(dima, 2, 50),
          member(lera, 1, 30),
          ...extra.map((u, i) => member(u, 0, 20 - i)),
        ],
      ],
      [3, [member(dima, 15, 14), member(me, 12, 13), member(marina, 20, 12)]],
      [4, [member(pasha, 0, 5)]],
      [99, [member(lera, 1, 10)]],
    ]),
    checkins,
    votedBy: new Map([["c-4", new Set([1, 3])]]),
    flags: { checkinsDown: false },
    nextRoomId: 100,
    nextCheckinId: 10,
  };
}

export function roomWithProgress(db: MockDb, room: Room): RoomWithProgress {
  return {
    ...room,
    workouts_count: db.progress.get(room.id) ?? 0,
    members_count: db.members.get(room.id)?.length ?? 0,
  };
}
