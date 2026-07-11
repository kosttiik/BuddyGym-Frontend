import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Page.module.css";

export type PageProps = {
  children: ReactNode;
  /* room for the floating bottom nav or a fixed CTA */
  bottomSpace?: boolean;
  className?: string;
};

export function Page({ children, bottomSpace = false, className }: PageProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.main
      className={cx(styles.page, bottomSpace && styles.bottomSpace, className)}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}
