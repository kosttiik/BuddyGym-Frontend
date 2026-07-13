/* Mirrors core-service swagger (/api/v1). Do not invent fields. */

export type Theme = "default" | "dark" | "neon";
export type UserStatus = "novice" | "regular" | "beast";
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
  photo_url: string;
  theme: Theme;
  status: UserStatus;
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
};

export type Member = User & {
  workouts_count: number;
  joined_at: string;
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
