import type { Transition, Variants } from "motion/react";

/* Shared easings and springs so screens move consistently. Transform/opacity only. */
export const ease = {
  entry: [0.22, 1, 0.36, 1],
  exit: [0.55, 0, 0.85, 0.35],
  overshoot: [0.34, 1.56, 0.64, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 32, mass: 0.7 },
  soft: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
  bouncy: { type: "spring", stiffness: 420, damping: 17, mass: 0.8 },
  heavy: { type: "spring", stiffness: 220, damping: 30, mass: 1.1 },
} as const satisfies Record<string, Transition>;

export function stagger(step = 0.06, delayChildren = 0.04): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: step, delayChildren },
    },
  };
}

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: spring.soft,
  },
};

export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...spring.bouncy, opacity: { duration: 0.2 } },
  },
};

export const tap = { scale: 0.96 } as const;
export const tapSubtle = { scale: 0.98 } as const;
