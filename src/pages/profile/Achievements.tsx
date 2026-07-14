import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Achievement, AchievementKey } from "@/shared/api/types";
import { formatDay, useI18n } from "@/shared/i18n";
import {
  IconCheckBold,
  IconComment,
  IconDumbbell,
  IconFire,
  IconMedal,
  IconMoon,
  IconStar,
  IconSunrise,
  IconTrophy,
  IconUsers,
} from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticTap } from "@/shared/lib/haptics";
import { riseItem, spring, stagger } from "@/shared/lib/motion";
import { BottomSheet, ProgressBar, sheetItemVariants } from "@/shared/ui";
import styles from "./Achievements.module.css";

const ICONS: Record<AchievementKey, typeof IconCheckBold> = {
  first_checkin: IconCheckBold,
  workouts_10: IconDumbbell,
  workouts_50: IconMedal,
  workouts_100: IconTrophy,
  workouts_250: IconStar,
  streak_7: IconFire,
  streak_14: IconFire,
  streak_30: IconFire,
  rooms_3: IconUsers,
  buddies_5: IconUsers,
  comments_10: IconComment,
  early_bird_10: IconSunrise,
  night_owl_10: IconMoon,
};

export function Achievements({ achievements }: { achievements: Achievement[] }) {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<Achievement | null>(null);

  const earned = achievements.filter((a) => a.granted_at).length;

  return (
    <>
      <motion.div className={styles.head} variants={riseItem}>
        <h2 className={styles.title}>{t.profile.achievements}</h2>
        <span className={styles.counter}>
          {t.profile.achievementsCount(earned, achievements.length)}
        </span>
      </motion.div>

      <motion.div className={styles.grid} variants={stagger(0.03)}>
        {achievements.map((achievement) => {
          const Icon = ICONS[achievement.key];
          const done = Boolean(achievement.granted_at);
          const ratio = achievement.target > 0 ? achievement.current / achievement.target : 0;

          return (
            <motion.button
              key={achievement.key}
              type="button"
              className={cx(styles.tile, done ? styles.earned : styles.locked)}
              variants={riseItem}
              whileTap={reduced ? undefined : { scale: 0.95 }}
              transition={spring.snappy}
              onClick={() => {
                hapticTap();
                setOpen(achievement);
              }}
            >
              <span className={cx(styles.icon, done && styles.iconEarned)}>
                <Icon size={19} />
              </span>
              <span className={styles.label}>{t.achievements[achievement.key]}</span>

              {done ? (
                <span className={styles.done}>{t.profile.achievementDone}</span>
              ) : (
                <>
                  <span className={styles.track}>
                    <motion.span
                      className={styles.fill}
                      initial={reduced ? false : { scaleX: 0 }}
                      animate={{ scaleX: Math.min(ratio, 1) }}
                      transition={{ ...spring.soft, delay: 0.1 }}
                    />
                  </span>
                  <span className={styles.progress}>
                    {achievement.current}/{achievement.target}
                  </span>
                </>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      <BottomSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? t.achievements[open.key] : ""}
      >
        {open && (
          <motion.div className={styles.detail} variants={sheetItemVariants}>
            <span
              className={cx(
                styles.detailIcon,
                open.granted_at ? styles.iconEarned : styles.detailIconLocked,
              )}
            >
              {(() => {
                const Icon = ICONS[open.key];
                return <Icon size={30} />;
              })()}
            </span>
            <p className={styles.detailDesc}>{t.achievementsDesc[open.key]}</p>

            <ProgressBar
              value={open.current}
              max={open.target}
              trackId={`achievement:${open.key}`}
              className={styles.detailBar}
            />
            <span className={styles.detailProgress}>
              {open.current} / {open.target}
            </span>

            <AnimatePresence>
              {open.granted_at && (
                <motion.span
                  className={styles.detailDate}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {t.profile.achievementGranted(formatDay(open.granted_at, locale))}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </BottomSheet>
    </>
  );
}
