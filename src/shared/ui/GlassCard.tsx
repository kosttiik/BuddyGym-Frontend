import type { HTMLAttributes } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./GlassCard.module.css";

export type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "md" | "lg" | "none";
};

export function GlassCard({ padding = "md", className, ...rest }: GlassCardProps) {
  return <div className={cx(styles.card, styles[padding], className)} {...rest} />;
}
