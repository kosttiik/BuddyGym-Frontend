import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useI18n } from "@/shared/i18n";
import { IconPerson, IconRooms } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import styles from "./BottomNav.module.css";

export function BottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/", label: t.tabs.rooms, icon: <IconRooms size={18} /> },
    { to: "/profile", label: t.tabs.profile, icon: <IconPerson size={18} /> },
  ] as const;

  return (
    <nav className={styles.nav}>
      <div className={styles.pill}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cx(styles.tab, isActive && styles.active)}
              onClick={() => {
                if (!isActive) {
                  hapticSelection();
                }
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className={styles.activeBg}
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <span className={styles.content}>
                {tab.icon}
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
