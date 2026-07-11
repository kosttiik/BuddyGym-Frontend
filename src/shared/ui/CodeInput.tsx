import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./CodeInput.module.css";

export const CODE_LENGTH = 8;

/* Invite codes exclude ambiguous 0/O and 1/I, per backend alphabet. */
const CODE_CHARS = /[^A-HJ-NP-Z2-9]/g;

export function sanitizeCode(raw: string): string {
  return raw.toUpperCase().replace(CODE_CHARS, "").slice(0, CODE_LENGTH);
}

export type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  /* increment to replay the shake animation on an invalid code */
  shakeKey?: number;
  className?: string;
};

export function CodeInput({ value, onChange, shakeKey = 0, className }: CodeInputProps) {
  const inputId = useId();
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <motion.div
      key={shakeKey}
      className={cx(styles.wrap, className)}
      animate={shakeKey > 0 && !reduceMotion ? { x: [0, -8, 8, -6, 6, -3, 0] } : undefined}
      transition={{ duration: 0.45 }}
    >
      {/* label click focuses the hidden input natively */}
      <label className={styles.cells} htmlFor={inputId}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const char = value[i];
          const isActive = i === activeIndex && value.length < CODE_LENGTH;
          return (
            <span
              key={String(i)}
              className={cx(styles.cell, char && styles.filled, isActive && styles.active)}
            >
              {char}
              {isActive && <span className={styles.caret} />}
            </span>
          );
        })}
      </label>
      <input
        id={inputId}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(sanitizeCode(e.target.value))}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="one-time-code"
        spellCheck={false}
        inputMode="text"
        aria-label="code"
        maxLength={CODE_LENGTH}
      />
    </motion.div>
  );
}
