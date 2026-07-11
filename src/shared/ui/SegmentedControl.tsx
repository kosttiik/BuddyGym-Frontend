import { motion } from "motion/react";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import styles from "./SegmentedControl.module.css";

export type SegmentedControlProps<K extends string> = {
  options: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (key: K) => void;
  className?: string;
};

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<K>) {
  return (
    <div className={cx(styles.control, className)} role="radiogroup">
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: standard ARIA radiogroup-of-buttons pattern
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={cx(styles.option, isActive && styles.active)}
            onClick={() => {
              if (!isActive) {
                hapticSelection();
                onChange(option.key);
              }
            }}
          >
            {isActive && (
              <motion.span
                layoutId="segmented-control-thumb"
                className={styles.thumb}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className={styles.label}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
