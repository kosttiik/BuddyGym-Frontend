import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Progress.module.css";

const MAX_SEGMENTS = 8;

/* The fill animates when the value changes, not when the component remounts. */
const shown = new Map<string, number>();

function useFrom(trackId: string | undefined, value: number): number | null {
  const reduceMotion = useReducedMotion();
  const from = useRef<number | null>(null);

  if (from.current === null) {
    if (reduceMotion) {
      from.current = value;
    } else if (trackId === undefined) {
      from.current = 0;
    } else {
      from.current = shown.get(trackId) ?? 0;
    }
  }

  useEffect(() => {
    if (trackId !== undefined) {
      shown.set(trackId, value);
    }
  }, [trackId, value]);

  return from.current === value ? null : from.current;
}

export type SegmentedProgressProps = {
  value: number;
  goal: number;
  glowLast?: boolean;
  trackId?: string;
  className?: string;
};

export function SegmentedProgress({
  value,
  goal,
  glowLast,
  trackId,
  className,
}: SegmentedProgressProps) {
  const clamped = Math.max(0, Math.min(value, goal));
  const from = useFrom(trackId, clamped);

  if (goal > MAX_SEGMENTS) {
    return <ProgressBar value={clamped} max={goal} trackId={trackId} className={className} />;
  }

  return (
    <span className={cx(styles.segments, className)}>
      {Array.from({ length: goal }, (_, i) => {
        const filled = i < clamped;
        const isNew = from !== null && filled && i >= from;
        return (
          <motion.span
            key={String(i)}
            className={cx(
              styles.segment,
              filled && styles.filled,
              glowLast && i === clamped - 1 && styles.glow,
            )}
            initial={isNew ? { scaleY: 0.35, opacity: 0 } : false}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              delay: isNew ? 0.15 + (i - from) * 0.07 : 0,
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
  trackId?: string;
  className?: string;
};

export function ProgressBar({ value, max, height = 10, trackId, className }: ProgressBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const from = useFrom(trackId, value);
  const fromRatio = from !== null && max > 0 ? Math.max(0, Math.min(from / max, 1)) : null;

  return (
    <span className={cx(styles.bar, className)} style={{ height }}>
      <motion.span
        className={styles.fill}
        initial={fromRatio === null ? false : { width: `${fromRatio * 100}%` }}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}

function useCountUp(target: number, trackId: string | undefined): number {
  const from = useFrom(trackId, target);
  const [value, setValue] = useState(from ?? target);
  const previous = useRef(from ?? target);

  useEffect(() => {
    if (previous.current === target) {
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
  }, [target]);

  return value;
}

export type ProgressCounterProps = {
  value: number;
  goal: number;
  trackId?: string;
  className?: string;
};

export function ProgressCounter({ value, goal, trackId, className }: ProgressCounterProps) {
  const displayed = useCountUp(value, trackId);
  return (
    <span className={cx(styles.counter, className)}>
      {displayed}
      <span className={styles.counterMuted}>/{goal}</span>
    </span>
  );
}
