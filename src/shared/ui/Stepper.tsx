import { motion } from "motion/react";
import type { ReactNode } from "react";
import { IconMinus, IconPlus } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import styles from "./Stepper.module.css";

export type StepperProps = {
  label: string;
  hint?: string;
  icon?: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
};

export function Stepper({ label, hint, icon, value, min, max, onChange, className }: StepperProps) {
  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) {
      hapticSelection();
      onChange(next);
    }
  };
  return (
    <div className={cx(styles.stepper, className)}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <div className={styles.controls}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className={cx(styles.round, styles.minus)}
          disabled={value <= min}
          aria-label="−"
          onClick={() => step(-1)}
        >
          <IconMinus size={15} />
        </motion.button>
        <span className={styles.value}>{value}</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className={cx(styles.round, styles.plus)}
          disabled={value >= max}
          aria-label="+"
          onClick={() => step(1)}
        >
          <IconPlus size={15} />
        </motion.button>
      </div>
    </div>
  );
}
