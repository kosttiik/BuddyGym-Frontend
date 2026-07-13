import { motion } from "motion/react";
import { createPortal } from "react-dom";
import { useI18n } from "@/shared/i18n";
import { Spinner } from "@/shared/ui";
import styles from "./ProcessingOverlay.module.css";

/* Decoding a HEIC through wasm takes seconds on a mid Android, so the wait is shown. */
export function ProcessingOverlay({ label }: { label?: string }) {
  const { t } = useI18n();
  return createPortal(
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Spinner />
      <span className={styles.label}>{label ?? t.camera.processing}</span>
    </motion.div>,
    document.body,
  );
}
