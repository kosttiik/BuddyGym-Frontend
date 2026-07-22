import { motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { IconMinus, IconPlus } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import styles from "./Stepper.module.css";

export type StepperProps = {
  label: string;
  hint?: string;
  unit?: string;
  icon?: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
};

export function Stepper({
  label,
  hint,
  unit,
  icon,
  value,
  min,
  max,
  onChange,
  className,
}: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    setDraft(null);
    if (next !== value) {
      hapticSelection();
      onChange(next);
    }
  };

  const commit = () => {
    if (draft === null) {
      return;
    }
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    if (!Number.isNaN(parsed)) {
      const next = Math.max(min, Math.min(max, parsed));
      if (next !== value) {
        onChange(next);
      }
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
        <span className={styles.valueBox}>
          <input
            className={styles.value}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={label}
            value={draft ?? String(value)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
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
