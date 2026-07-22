import type {
  Achievement,
  AchievementKey,
  Checkin,
  Comment,
  Member,
  Room,
  RoomAvatar,
  RoomWithProgress,
  User,
} from "@/shared/api/types";

/* Stand-in room picture: a two-tone gradient seeded by the room id, so the mock shows what a
   real uploaded photo occupies without shipping binary fixtures. */
export function roomPicture(roomId: number): string {
  const hue = (roomId * 67) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 62% 52%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 48) % 360} 58% 32%)"/>
    </linearGradient></defs>
    <rect width="240" height="240" fill="url(#g)"/>
    <circle cx="176" cy="64" r="86" fill="hsl(${hue} 70% 62%)" opacity="0.35"/>
  </svg>`;
}

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

function user(
  id: number,
  firstName: string,
  rank: User["rank"],
  status?: { emoji: string; text: string },
): User {
  return {
    id,
    username: "",
    first_name: firstName,
    photo_url: "",
    has_avatar: false,
    theme: "default",
    rank,
    status_emoji: status?.emoji ?? "",
    status_text: status?.text ?? "",
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
  comments: Map<string, Comment[]>;
  nextCommentId: number;
  roomAvatars: Map<number, RoomAvatar[]>;
  nextRoomAvatarId: number;
  nextFreezeId: number;
};

function member(
  u: User,
  workouts: number,
  joinedDaysAgo: number,
  streak = workouts,
  extra: Partial<Member> = {},
): Member {
  const goal = extra.goal_per_period ?? null;
  return {
    ...u,
    workouts_count: workouts,
    joined_at: iso(-joinedDaysAgo * DAY),
    streak,
    period_ends_at: iso(2 * DAY),
    sport_name: "",
    sport_emoji: "",
    goal_per_period: goal,
    effective_goal: goal ?? 5,
    /* joined less than a period ago: nothing has been judged yet, so no shame */
    has_closed_period: joinedDaysAgo >= 7,
    last_closed_period_failed: joinedDaysAgo >= 7 && workouts === 0,
    ...extra,
  };
}

/* Mirrors domain.Catalog on the server: every key comes back, locked ones carrying progress. */
const CATALOG: Array<[AchievementKey, number]> = [
  ["first_checkin", 1],
  ["workouts_10", 10],
  ["workouts_50", 50],
  ["workouts_100", 100],
  ["workouts_250", 250],
  ["streak_7", 7],
  ["streak_14", 14],
  ["streak_30", 30],
  ["rooms_3", 3],
  ["buddies_5", 5],
  ["comments_10", 10],
  ["early_bird_10", 10],
  ["night_owl_10", 10],
];

export function catalog(progress: Partial<Record<AchievementKey, number>>): Achievement[] {
  return CATALOG.map(([key, target]) => {
    const current = Math.min(progress[key] ?? 0, target);
    return {
      key,
      current,
      target,
      granted_at: current >= target ? iso(-30 * DAY) : undefined,
    };
  });
}

function achs(...keys: AchievementKey[]): Achievement[] {
  const progress: Partial<Record<AchievementKey, number>> = {};
  for (const key of keys) {
    const spec = CATALOG.find(([k]) => k === key);
    if (spec) {
      progress[key] = spec[1];
    }
  }
  return catalog(progress);
}

export function createDb(): MockDb {
  const me = user(1, "Костя", "regular");
  const marina = user(2, "Марина", "beast", { emoji: "🔥", text: "На сушке" });
  const dima = user(3, "Дима", "regular", { emoji: "🤕", text: "Травма" });
  const lera = user(4, "Лера", "novice");
  const pasha = user(5, "Паша", "novice", { emoji: "😴", text: "Отдыхаю" });
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
      has_avatar: true,
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
      has_avatar: false,
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
      has_avatar: true,
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
      has_avatar: false,
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
      has_avatar: false,
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

  const meAchievements: Achievement[] = catalog({
    first_checkin: 1,
    workouts_10: 10,
    workouts_50: 23,
    workouts_100: 23,
    workouts_250: 23,
    streak_7: 7,
    streak_14: 9,
    streak_30: 9,
    rooms_3: 2,
    buddies_5: 3,
    comments_10: 4,
    early_bird_10: 6,
    night_owl_10: 1,
  });

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
    roomAvatars: new Map<number, RoomAvatar[]>([
      [1, [{ id: 11, uploaded_by: 1, created_at: iso(-3 * DAY), is_current: true }]],
      [
        3,
        [
          { id: 31, uploaded_by: 3, created_at: iso(-2 * DAY), is_current: true },
          { id: 32, uploaded_by: 5, created_at: iso(-9 * DAY), is_current: false },
        ],
      ],
    ]),
    nextRoomAvatarId: 100,
    nextFreezeId: 1,
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
      /* room 1: everyone but Паша has already closed a period, and only Лера met the goal there.
         Паша joined mid-period, so nothing has been judged on him yet. */
      [
        1,
        [
          member(me, 2, 30, 2, { has_closed_period: true, last_closed_period_failed: true }),
          member(dima, 1, 25, 1, { has_closed_period: true, last_closed_period_failed: true }),
          member(lera, 3, 20, 3, { has_closed_period: true, last_closed_period_failed: false }),
          member(pasha, 0, 5, 0, { has_closed_period: false, last_closed_period_failed: false }),
        ],
      ],
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
    comments: new Map(),
    nextCommentId: 1,
  };
}

export function roomWithProgress(db: MockDb, room: Room): RoomWithProgress {
  const me = db.members.get(room.id)?.find((m) => m.id === db.me.id);
  return {
    ...room,
    workouts_count: db.progress.get(room.id) ?? 0,
    members_count: db.members.get(room.id)?.length ?? 0,
    streak: me?.streak ?? 0,
    period_ends_at: me?.period_ends_at ?? iso(2 * DAY),
    my_goal: me?.effective_goal ?? room.goal_per_period,
  };
}
