import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./TextField.module.css";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  showCounter?: boolean;
};

export function TextField({
  label,
  showCounter = false,
  maxLength,
  value,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const length = typeof value === "string" ? value.length : 0;
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.row}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {showCounter && maxLength !== undefined && (
          <span className={styles.counter}>
            {length}/{maxLength}
          </span>
        )}
      </div>
      <input id={id} className={styles.input} maxLength={maxLength} value={value} {...rest} />
    </div>
  );
}
