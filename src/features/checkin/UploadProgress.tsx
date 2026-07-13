import { motion } from "motion/react";
import { useI18n } from "@/shared/i18n";
import { IconCheck } from "@/shared/icons";
import { ProgressRing } from "@/shared/ui";
import styles from "./UploadProgress.module.css";

export type UploadProgressProps = {
  /* 0..1 */
  progress: number;
  rooms: number;
};

export function UploadProgress({ progress, rooms }: UploadProgressProps) {
  const { t } = useI18n();
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
      <div className={styles.ring}>
        <ProgressRing progress={progress} size={96} strokeWidth={6} />
        <span className={styles.value}>
          {done ? (
            <motion.span
              className={styles.doneIcon}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
            >
              <IconCheck size={26} />
            </motion.span>
          ) : (
            `${percent}%`
          )}
        </span>
      </div>
      <span className={styles.label}>
        {done ? t.uploadProgress.processing : t.uploadProgress.uploading(rooms)}
      </span>
    </motion.div>
  );
}
