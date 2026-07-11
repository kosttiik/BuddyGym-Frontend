import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCamera } from "@/shared/icons";
import { showBackButton } from "@/shared/lib/telegram";
import { Button } from "@/shared/ui";
import styles from "./PhotoPreview.module.css";

export type PhotoPreviewProps = {
  photo: File;
  room: Room;
  pending: boolean;
  onRetake: () => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function PhotoPreview({
  photo,
  room,
  pending,
  onRetake,
  onSubmit,
  onClose,
}: PhotoPreviewProps) {
  const { t } = useI18n();
  const url = useMemo(() => URL.createObjectURL(photo), [photo]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => showBackButton(onClose), [onClose]);

  const sizeMb = (photo.size / (1 << 20)).toFixed(1).replace(".", ",");

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className={styles.header}>
        <button type="button" className={styles.retake} onClick={onRetake}>
          <IconCamera size={15} />
          {t.photoPreview.retake}
        </button>
        <span className={styles.sizeBadge}>{t.photoPreview.sizeOf(sizeMb)}</span>
      </header>

      <motion.div
        className={styles.photoWrap}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={url} alt="" className={styles.photo} />
      </motion.div>

      <motion.div
        className={styles.bottom}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      >
        <p className={styles.info}>{t.photoPreview.info(room.name, room.votes_required)}</p>
        <Button block disabled={pending} onClick={onSubmit}>
          {t.photoPreview.submit}
        </Button>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
