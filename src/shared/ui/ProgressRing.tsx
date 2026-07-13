import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import styles from "./ProgressRing.module.css";

export type ProgressRingProps = {
  /* 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /* draw the arc with an animation on mount */
  animated?: boolean;
  /* waiting on votes rather than counted: the ring fills, but stays quiet */
  muted?: boolean;
  className?: string;
};

export function ProgressRing({
  progress,
  size = 150,
  strokeWidth = 10,
  animated = false,
  muted = false,
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className={styles.track}
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={animated && !reduceMotion ? { pathLength: 0 } : false}
        animate={{ pathLength: clamped }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={muted ? "#5f7d6d" : "#3ed488"} />
          <stop offset="1" stopColor={muted ? "#41604f" : "#0ea55c"} />
        </linearGradient>
      </defs>
    </svg>
  );
}
