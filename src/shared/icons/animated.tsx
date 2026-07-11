import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/shared/lib/motion";
import type { IconProps } from "./index";

/* Checkmark that draws itself on mount. */
export function CheckDraw({ size = 24, ...rest }: IconProps) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" {...rest}>
      <motion.path
        d="M5 12.5l4.2 4.2L18.5 7.5"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.4, ease: ease.entry, delay: 0.3 },
          opacity: { duration: 0.1, delay: 0.3 },
        }}
      />
    </svg>
  );
}

/* Three dots that breathe in sequence. For quiet/empty states. */
export function PulseDots({ size = 24, ...rest }: IconProps) {
  const reduce = useReducedMotion();
  const cx = [6, 12, 18];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" {...rest}>
      {cx.map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={12}
          r={2.2}
          fill="currentColor"
          initial={reduce ? false : { opacity: 0.3, scale: 0.8 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
          style={{ transformOrigin: `${x}px 12px` }}
        />
      ))}
    </svg>
  );
}
