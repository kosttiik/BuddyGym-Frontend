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
  | "workouts_250"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "rooms_3"
  | "buddies_5"
  | "comments_10"
  | "early_bird_10"
  | "night_owl_10";

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

/* The whole catalog comes back, earned or not: a locked one carries its progress. */
export type Achievement = {
  key: AchievementKey;
  current: number;
  target: number;
  granted_at?: string;
};

export type Stats = {
  total_workouts: number;
  best_streak: number;
  rooms: number;
  buddies: number;
  comments: number;
  early_workouts: number;
  late_workouts: number;
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
  has_avatar: boolean;
};

export type RoomAvatar = {
  id: number;
  uploaded_by: number;
  created_at: string;
  is_current: boolean;
};

export type RoomWithProgress = Room & {
  workouts_count: number;
  members_count: number;
  streak: number;
  /* when the current period closes and the streak burns unless the goal is met */
  period_ends_at: string;
  /* my personal goal in this room, falling back to the room goal */
  my_goal: number;
};

export type Freeze = {
  id: number;
  room_id: number;
  user_id: number;
  starts_at: string;
  ends_at: string;
  canceled_at?: string;
  created_at: string;
};

export type Member = User & {
  workouts_count: number;
  joined_at: string;
  streak: number;
  period_ends_at: string;
  sport_name: string;
  sport_emoji: string;
  goal_per_period: number | null;
  effective_goal: number;
  /* judged = closed and not frozen: only then can a member land on the shame board */
  has_closed_period: boolean;
  last_closed_period_failed: boolean;
  freeze?: Freeze;
  freeze_cooldown_until?: string;
};

export type UpdateMembershipRequest = {
  sport_name: string;
  sport_emoji: string;
  goal_per_period: number | null;
};

export type FreezeRequest = {
  starts_at: string;
  ends_at: string;
};

export type RoomDetailResponse = {
  room: Room;
  members: Member[];
};

export type GeoPoint = {
  lat: number;
  lon: number;
  horizontal_accuracy: number;
};

type CheckinGeoPoint = Pick<GeoPoint, "lat" | "lon">;

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
  geo?: CheckinGeoPoint;
  /* members the author tagged as training with them */
  buddies?: User[];
  comments_count?: number;
  /* the most liked comment: shown over the photo without loading the thread */
  top_comment?: Comment;
  votes_approve: number;
  votes_reject: number;
  votes_required: number;
  created_at: string;
  expires_at: string;
};

export type MeResponse = {
  user: User;
  achievements: Achievement[];
  stats: Stats;
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

export type Comment = {
  id: number;
  checkin_id: string;
  user_id: number;
  author: User;
  body: string;
  /* bytes come from GET /checkins/{id}/comments/{commentId}/photo */
  has_photo: boolean;
  likes: number;
  liked_by_me: boolean;
  created_at: string;
};
