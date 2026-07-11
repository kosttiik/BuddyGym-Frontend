import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import styles from "./Page.module.css";

export type PageProps = {
  children: ReactNode;
  /* room for the floating bottom nav or a fixed CTA */
  bottomSpace?: boolean;
  className?: string;
};

/* Entrances are owned by the route view transition (global.css). */
export function Page({ children, bottomSpace = false, className }: PageProps) {
  return (
    <main className={cx(styles.page, bottomSpace && styles.bottomSpace, className)}>
      {children}
    </main>
  );
}
