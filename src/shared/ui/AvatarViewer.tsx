import { motion } from "motion/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/shared/i18n";
import { IconCross } from "@/shared/icons";
import { showBackButton } from "@/shared/lib/telegram";
import styles from "./AvatarViewer.module.css";

export type AvatarViewerProps = {
  photoUrl: string;
  onClose: () => void;
};

export function AvatarViewer({ photoUrl, onClose }: AvatarViewerProps) {
  const { t } = useI18n();

  useEffect(() => showBackButton(onClose), [onClose]);

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label={t.common.close}>
        <IconCross size={16} />
      </button>
      <motion.img
        src={photoUrl}
        alt=""
        className={styles.photo}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      />
    </motion.div>,
    document.body,
  );
}
