import type { HTMLMotionProps } from "motion/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { hapticTap } from "@/shared/lib/haptics";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "tint";
type Size = "md" | "sm";

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  block?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  block = false,
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      onClick={(event) => {
        hapticTap();
        onClick?.(event);
      }}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  );
}
