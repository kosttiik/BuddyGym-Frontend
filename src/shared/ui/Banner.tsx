import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Banner.module.css";

export type BannerProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

export function Banner({ icon, title, description, className }: BannerProps) {
  return (
    <div className={cx(styles.banner, className)}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </div>
  );
}
