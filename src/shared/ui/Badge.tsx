import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Badge.module.css";

export type BadgeTone = "green" | "purple" | "red" | "orange" | "neutral";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  icon?: ReactNode;
};

export function Badge({ tone = "green", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}
