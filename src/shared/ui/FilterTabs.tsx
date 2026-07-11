import { motion } from "motion/react";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import styles from "./FilterTabs.module.css";

export type FilterTab<K extends string> = {
  key: K;
  label: string;
  count?: number;
};

export type FilterTabsProps<K extends string> = {
  tabs: ReadonlyArray<FilterTab<K>>;
  active: K;
  onChange: (key: K) => void;
  className?: string;
};

export function FilterTabs<K extends string>({
  tabs,
  active,
  onChange,
  className,
}: FilterTabsProps<K>) {
  return (
    <div className={cx(styles.tabs, className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cx(styles.tab, isActive && styles.active)}
            onClick={() => {
              if (!isActive) {
                hapticSelection();
                onChange(tab.key);
              }
            }}
          >
            {isActive && (
              <motion.span
                layoutId="filter-tab-pill"
                className={styles.pill}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className={styles.label}>
              {tab.label}
              {tab.count !== undefined && ` · ${tab.count}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
