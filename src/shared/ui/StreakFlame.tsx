import { motion, useReducedMotion } from "motion/react";
import { IconFire } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import styles from "./StreakFlame.module.css";

export type StreakFlameProps = {
  streak: number;
  /* the period is closing and the goal is not met yet: the streak burns unless the user trains */
  atRisk?: boolean;
  size?: number;
  className?: string;
};

/* A cold flame is never animated away: the burn already happened, and replaying it every
   time the screen mounts would nag rather than motivate. The at-risk pulse is the nudge. */
export function StreakFlame({ streak, atRisk, size = 14, className }: StreakFlameProps) {
  const reduced = useReducedMotion();
  const lit = streak > 0;
  const risk = lit && Boolean(atRisk);
  const tone = !lit ? styles.cold : risk ? styles.risk : styles.lit;

  const flicker =
    reduced || !lit
      ? undefined
      : risk
        ? { scale: [1, 1.14, 1], rotate: [0, 0, 0] }
        : { scale: [1, 1.07, 1.02, 1], rotate: [0, -2.5, 2.5, 0] };

  return (
    <span className={cx(styles.flame, tone, className)}>
      <motion.span
        className={styles.icon}
        animate={flicker}
        transition={
          flicker && {
            duration: risk ? 1 : 2.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }
        }
      >
        <IconFire size={size} />
      </motion.span>
      {streak}
    </span>
  );
}
