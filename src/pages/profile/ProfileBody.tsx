import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Achievement, AchievementKey, User, UserRank } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import {
  IconCheckBold,
  IconDumbbell,
  IconFire,
  IconLightning,
  IconMedal,
  IconPlus,
  IconStar,
  IconTrophy,
} from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { riseItem } from "@/shared/lib/motion";
import { useAvatar } from "@/shared/lib/useAvatar";
import {
  Avatar,
  AvatarViewer,
  Badge,
  GlassCard,
  ProgressBar,
  ProgressCounter,
  StreakFlame,
} from "@/shared/ui";
import styles from "./ProfilePage.module.css";

const ALL_ACHIEVEMENTS: AchievementKey[] = [
  "first_checkin",
  "workouts_10",
  "workouts_50",
  "workouts_100",
  "streak_7",
];

const ACHIEVEMENT_ICONS: Record<AchievementKey, typeof IconCheckBold> = {
  first_checkin: IconCheckBold,
  workouts_10: IconDumbbell,
  workouts_50: IconMedal,
  workouts_100: IconTrophy,
  streak_7: IconFire,
};

/* /me has no total workout counter, so the lower bound comes from milestones */
function inferWorkouts(earned: Set<AchievementKey>): number {
  if (earned.has("workouts_100")) return 100;
  if (earned.has("workouts_50")) return 50;
  if (earned.has("workouts_10")) return 10;
  if (earned.has("first_checkin")) return 1;
  return 0;
}

export function RankBadge({ rank, label }: { rank: UserRank; label: string }) {
  if (rank === "beast") {
    return (
      <Badge tone="orange" icon={<IconStar size={11} />}>
        {label}
      </Badge>
    );
  }
  if (rank === "regular") {
    return (
      <Badge tone="green" icon={<IconLightning size={11} />}>
        {label}
      </Badge>
    );
  }
  return <Badge tone="neutral">{label}</Badge>;
}

/* The emoji here is user content, like the avatar, so it is the one place in the app that
   renders an emoji at all: the no-emoji rule is about the interface, not about what people
   write about themselves. */
function StatusLine({
  user,
  editable,
  onEdit,
}: {
  user: User;
  editable?: boolean;
  onEdit?: () => void;
}) {
  const { t } = useI18n();
  const has = Boolean(user.status_emoji || user.status_text);

  if (!has && !editable) {
    return null;
  }
  if (!has) {
    return (
      <button type="button" className={styles.statusAdd} onClick={onEdit}>
        <IconPlus size={13} />
        {t.status.add}
      </button>
    );
  }

  const chip = (
    <>
      {user.status_emoji && (
        <span className={styles.statusEmoji} aria-hidden="true">
          {user.status_emoji}
        </span>
      )}
      <span className={styles.statusText}>{user.status_text}</span>
    </>
  );

  if (!editable) {
    return <span className={styles.statusChip}>{chip}</span>;
  }
  return (
    <button
      type="button"
      className={cx(styles.statusChip, styles.statusChipButton)}
      onClick={onEdit}
      aria-label={t.status.edit}
    >
      {chip}
    </button>
  );
}

/* Public profile: identity, status progress and achievements. Rendered for
   both the current user and other members, inside a stagger container. */
export function ProfileBody({
  user,
  achievements,
  bestStreak,
  editable,
  onEditStatus,
}: {
  user: User;
  achievements: Achievement[];
  bestStreak: number;
  /* only your own profile offers to write a status */
  editable?: boolean;
  onEditStatus?: () => void;
}) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { t } = useI18n();
  const avatarUrl = useAvatar(user.id, user.has_avatar);
  const earned = new Set(achievements.map((a) => a.key));
  const rankLabel: Record<UserRank, string> = {
    novice: t.members.statusNovice,
    regular: t.members.statusRegular,
    beast: t.members.statusBeast,
  };
  const workouts = inferWorkouts(earned);
  const nextGoal = user.rank === "novice" ? 10 : user.rank === "regular" ? 50 : null;
  const nextRank = user.rank === "novice" ? t.members.statusRegular : t.members.statusBeast;

  return (
    <>
      <motion.div className={styles.head} variants={riseItem}>
        {avatarUrl ? (
          <button
            type="button"
            className={styles.avatarButton}
            onClick={() => setAvatarOpen(true)}
            aria-label={user.first_name}
          >
            <Avatar name={user.first_name} hasAvatar seed={user.id} size={84} />
          </button>
        ) : (
          <Avatar name={user.first_name} seed={user.id} size={84} />
        )}
        <h1 className={styles.name}>{user.first_name}</h1>
        <span className={styles.headTags}>
          <RankBadge rank={user.rank} label={rankLabel[user.rank]} />
          {bestStreak > 0 && <StreakFlame streak={bestStreak} />}
        </span>
        <StatusLine user={user} editable={editable} onEdit={onEditStatus} />
      </motion.div>

      {nextGoal !== null && (
        <motion.div variants={riseItem}>
          <GlassCard>
            <div className={styles.statusTop}>
              <span className={styles.statusTitle}>{t.profile.toStatus(nextRank)}</span>
              <ProgressCounter value={workouts} goal={nextGoal} trackId="profile" />
            </div>
            <ProgressBar
              value={workouts}
              max={nextGoal}
              trackId="profile"
              className={styles.statusBar}
            />
            <span className={styles.statusLeft}>{t.profile.workoutsLeft(nextGoal - workouts)}</span>
          </GlassCard>
        </motion.div>
      )}

      <motion.div className={styles.sectionHead} variants={riseItem}>
        <h2 className={styles.sectionTitle}>{t.profile.achievements}</h2>
        <span className={styles.sectionCounter}>
          {t.profile.achievementsCount(earned.size, ALL_ACHIEVEMENTS.length)}
        </span>
      </motion.div>
      <motion.div className={styles.grid} variants={riseItem}>
        {ALL_ACHIEVEMENTS.map((key) => {
          const Icon = ACHIEVEMENT_ICONS[key];
          const isEarned = earned.has(key);
          return (
            <div key={key} className={cx(styles.tile, isEarned ? styles.earned : styles.locked)}>
              <span className={cx(styles.tileIcon, isEarned && styles.tileIconEarned)}>
                <Icon size={20} />
              </span>
              <span className={styles.tileLabel}>{t.achievements[key]}</span>
            </div>
          );
        })}
        <div className={cx(styles.tile, styles.locked, styles.soon)}>
          <span className={styles.soonPlus}>
            <IconPlus size={15} />
          </span>
          <span className={styles.tileLabel}>{t.profile.soonMore}</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {avatarOpen && avatarUrl && (
          <AvatarViewer photoUrl={avatarUrl} onClose={() => setAvatarOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
