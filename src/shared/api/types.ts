/* Mirrors core-service swagger (/api/v1). Do not invent fields. */

export type Theme = "default" | "dark" | "neon";
/* Derived from the workout total. What the member writes themselves is status_emoji + status_text. */
export type UserRank = "novice" | "regular" | "beast";
export type RoomKind = "open" | "invite";
export type CheckinStatus = "pending" | "approved" | "rejected" | "expired";

export type AchievementKey =
  | "first_checkin"
  | "workouts_10"
  | "workouts_50"
  | "workouts_100"
  | "streak_7";

export type User = {
  id: number;
  username: string;
  first_name: string;
  /* the telegram URL, unreachable for our users: the bytes come from GET /users/{id}/avatar */
  photo_url: string;
  has_avatar: boolean;
  theme: Theme;
  rank: UserRank;
  status_emoji: string;
  status_text: string;
  created_at: string;
};

export type Achievement = {
  key: AchievementKey;
  granted_at: string;
};

export type Room = {
  id: number;
  name: string;
  kind: RoomKind;
  invite_code?: string;
  goal_per_period: number;
  period_days: number;
  votes_required: number;
  creator_id: number;
  created_at: string;
};

export type RoomWithProgress = Room & {
  workouts_count: number;
  members_count: number;
  streak: number;
  /* when the current period closes and the streak burns unless the goal is met */
  period_ends_at: string;
};

export type Member = User & {
  workouts_count: number;
  joined_at: string;
  streak: number;
  period_ends_at: string;
};

export type RoomDetailResponse = {
  room: Room;
  members: Member[];
};

export type GeoPoint = {
  lat: number;
  lon: number;
};

export type Checkin = {
  id: string;
  room_id: number;
  user_id: number;
  status: CheckinStatus;
  /* the bucket is private: bytes come from GET /checkins/{id}/photo with the Bearer token */
  has_photo: boolean;
  /* photos are purged after a retention window; after that the bytes are gone */
  photo_purged: boolean;
  photo_expires_at?: string;
  geo?: GeoPoint;
  votes_approve: number;
  votes_reject: number;
  votes_required: number;
  created_at: string;
  expires_at: string;
};

export type MeResponse = {
  user: User;
  achievements: Achievement[];
  /* the highest streak across the user rooms */
  best_streak: number;
};

export type UserProfileResponse = MeResponse;

export type AuthTelegramResponse = {
  token: string;
  user: User;
};

export type CreateRoomRequest = {
  name: string;
  kind: RoomKind;
  goal_per_period: number;
  period_days: number;
  votes_required: number;
};
