import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Achievement, Stats, User, UserRank } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconLightning, IconPlus, IconStar } from "@/shared/icons";
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
import { Achievements } from "./Achievements";
import styles from "./ProfilePage.module.css";

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
  stats,
  bestStreak,
  editable,
  onEditStatus,
}: {
  user: User;
  achievements: Achievement[];
  stats: Stats;
  bestStreak: number;
  /* only your own profile offers to write a status */
  editable?: boolean;
  onEditStatus?: () => void;
}) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { t } = useI18n();
  const avatarUrl = useAvatar(user.id, user.has_avatar);
  const rankLabel: Record<UserRank, string> = {
    novice: t.members.statusNovice,
    regular: t.members.statusRegular,
    beast: t.members.statusBeast,
  };
  const workouts = stats.total_workouts;
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

      <Achievements achievements={achievements} />

      <AnimatePresence>
        {avatarOpen && avatarUrl && (
          <AvatarViewer photoUrl={avatarUrl} onClose={() => setAvatarOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
