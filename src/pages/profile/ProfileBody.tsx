import { motion } from "motion/react";
import type { Achievement, AchievementKey, User, UserStatus } from "@/shared/api/types";
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
import { Avatar, Badge, GlassCard, ProgressBar, ProgressCounter } from "@/shared/ui";
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

export function StatusBadge({ status, label }: { status: UserStatus; label: string }) {
  if (status === "beast") {
    return (
      <Badge tone="orange" icon={<IconStar size={11} />}>
        {label}
      </Badge>
    );
  }
  if (status === "regular") {
    return (
      <Badge tone="green" icon={<IconLightning size={11} />}>
        {label}
      </Badge>
    );
  }
  return <Badge tone="neutral">{label}</Badge>;
}

/* Public profile: identity, status progress and achievements. Rendered for
   both the current user and other members, inside a stagger container. */
export function ProfileBody({ user, achievements }: { user: User; achievements: Achievement[] }) {
  const { t } = useI18n();
  const earned = new Set(achievements.map((a) => a.key));
  const statusLabel: Record<UserStatus, string> = {
    novice: t.members.statusNovice,
    regular: t.members.statusRegular,
    beast: t.members.statusBeast,
  };
  const workouts = inferWorkouts(earned);
  const nextGoal = user.status === "novice" ? 10 : user.status === "regular" ? 50 : null;
  const nextStatus = user.status === "novice" ? t.members.statusRegular : t.members.statusBeast;

  return (
    <>
      <motion.div className={styles.head} variants={riseItem}>
        <Avatar
          name={user.first_name}
          photoUrl={user.photo_url || undefined}
          seed={user.id}
          size={84}
        />
        <h1 className={styles.name}>{user.first_name}</h1>
        <StatusBadge status={user.status} label={statusLabel[user.status]} />
      </motion.div>

      {nextGoal !== null && (
        <motion.div variants={riseItem}>
          <GlassCard>
            <div className={styles.statusTop}>
              <span className={styles.statusTitle}>{t.profile.toStatus(nextStatus)}</span>
              <ProgressCounter value={workouts} goal={nextGoal} />
            </div>
            <ProgressBar value={workouts} max={nextGoal} className={styles.statusBar} />
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
    </>
  );
}
