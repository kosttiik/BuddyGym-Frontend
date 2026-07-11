import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Progress.module.css";

const MAX_SEGMENTS = 8;

export type SegmentedProgressProps = {
  value: number;
  goal: number;
  /* highlight the most recently filled segment with a glow */
  glowLast?: boolean;
  className?: string;
};

/* Per handoff: a row of segments for small goals, a solid bar for large ones. */
export function SegmentedProgress({ value, goal, glowLast, className }: SegmentedProgressProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(value, goal));
  if (goal > MAX_SEGMENTS) {
    return <ProgressBar value={clamped} max={goal} className={className} />;
  }
  return (
    <span className={cx(styles.segments, className)}>
      {Array.from({ length: goal }, (_, i) => {
        const filled = i < clamped;
        return (
          <motion.span
            key={String(i)}
            className={cx(
              styles.segment,
              filled && styles.filled,
              glowLast && i === clamped - 1 && styles.glow,
            )}
            initial={filled && !reduceMotion ? { scaleY: 0.35, opacity: 0 } : false}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              delay: 0.15 + i * 0.07,
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          />
        );
      })}
    </span>
  );
}

export type ProgressBarProps = {
  value: number;
  max: number;
  height?: number;
  className?: string;
};

export function ProgressBar({ value, max, height = 10, className }: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  return (
    <span className={cx(styles.bar, className)} style={{ height }}>
      <motion.span
        className={styles.fill}
        initial={reduceMotion ? false : { width: 0 }}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}

/* Numbers tick up on mount, like a scoreboard. */
function useCountUp(target: number): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);
  const previous = useRef(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      previous.current = target;
      setValue(target);
      return;
    }
    const controls = animate(previous.current, target, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    previous.current = target;
    return () => controls.stop();
  }, [target, reduceMotion]);

  return value;
}

export type ProgressCounterProps = {
  value: number;
  goal: number;
  className?: string;
};

export function ProgressCounter({ value, goal, className }: ProgressCounterProps) {
  const shown = useCountUp(value);
  return (
    <span className={cx(styles.counter, className)}>
      {shown}
      <span className={styles.counterMuted}>/{goal}</span>
    </span>
  );
}
