import type { CSSProperties } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ width, height = 14, radius = 10, className, style }: SkeletonProps) {
  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
