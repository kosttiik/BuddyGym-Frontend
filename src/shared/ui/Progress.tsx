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
  const clamped = Math.max(0, Math.min(value, goal));
  if (goal > MAX_SEGMENTS) {
    return <ProgressBar value={clamped} max={goal} className={className} />;
  }
  return (
    <span className={cx(styles.segments, className)}>
      {Array.from({ length: goal }, (_, i) => (
        <span
          key={String(i)}
          className={cx(
            styles.segment,
            i < clamped && styles.filled,
            glowLast && i === clamped - 1 && styles.glow,
          )}
        />
      ))}
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
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  return (
    <span className={cx(styles.bar, className)} style={{ height }}>
      <span className={styles.fill} style={{ width: `${ratio * 100}%` }} />
    </span>
  );
}

export type ProgressCounterProps = {
  value: number;
  goal: number;
  className?: string;
};

export function ProgressCounter({ value, goal, className }: ProgressCounterProps) {
  return (
    <span className={cx(styles.counter, className)}>
      {value}
      <span className={styles.counterMuted}>/{goal}</span>
    </span>
  );
}
