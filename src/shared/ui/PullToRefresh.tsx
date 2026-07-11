import { motion } from "motion/react";
import type { ReactNode, TouchEvent } from "react";
import { useRef, useState } from "react";
import { useI18n } from "@/shared/i18n";
import { hapticImpact } from "@/shared/lib/haptics";
import styles from "./PullToRefresh.module.css";
import { Spinner } from "./Spinner";

const THRESHOLD = 64;
const MAX_PULL = 96;

export type PullToRefreshProps = {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
};

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { t } = useI18n();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const crossed = useRef(false);

  const onTouchStart = (e: TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      startY.current = e.touches[0]?.clientY ?? null;
      crossed.current = false;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null || refreshing) {
      return;
    }
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (dy <= 0 || window.scrollY > 0) {
      setPull(0);
      return;
    }
    const next = Math.min(dy * 0.45, MAX_PULL);
    if (next >= THRESHOLD && !crossed.current) {
      crossed.current = true;
      hapticImpact("medium");
    }
    setPull(next);
  };

  const onTouchEnd = () => {
    if (startY.current === null) {
      return;
    }
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      void onRefresh().finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      setPull(0);
    }
  };

  const visible = refreshing || pull > 6;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <motion.div
        className={styles.indicator}
        animate={{ height: refreshing ? THRESHOLD : pull }}
        transition={
          refreshing || pull === 0
            ? { type: "spring", stiffness: 360, damping: 30 }
            : { duration: 0 }
        }
      >
        {visible && (
          <div className={styles.inner} style={{ opacity: Math.min(pull / THRESHOLD, 1) }}>
            <Spinner size={22} />
            {!refreshing && <span className={styles.label}>{t.loading.pullToRefresh}</span>}
          </div>
        )}
      </motion.div>
      {children}
    </div>
  );
}
