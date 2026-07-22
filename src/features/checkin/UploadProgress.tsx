import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useI18n } from "@/shared/i18n";
import { IconCheck } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { ProgressRing } from "@/shared/ui";
import styles from "./UploadProgress.module.css";

export type UploadProgressProps = {
  /* 0..1 */
  progress: number;
  rooms: number;
};

export function UploadProgress({ progress, rooms }: UploadProgressProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const percent = Math.round(Math.min(progress, 1) * 100);
  const done = percent >= 100;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={styles.ring}
        animate={done ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className={cx(styles.glow, done && styles.glowDone)} aria-hidden="true" />
        <ProgressRing progress={progress} size={96} strokeWidth={6} />
        <span className={styles.value}>
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span
                key="done"
                className={styles.doneIcon}
                initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              >
                <IconCheck size={26} />
              </motion.span>
            ) : (
              <motion.span
                key="percent"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
              >
                {percent}%
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.div>
      <span className={styles.label}>
        {done ? t.uploadProgress.processing : t.uploadProgress.uploading(rooms)}
      </span>
    </motion.div>
  );
}
