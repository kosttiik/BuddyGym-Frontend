import { cx } from "@/shared/lib/cx";
import styles from "./Spinner.module.css";

export function Spinner({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cx(styles.spinner, className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" className={styles.track} strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" className={styles.arc} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
