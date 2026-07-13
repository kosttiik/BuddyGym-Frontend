import { motion } from "motion/react";
import { useCheckinPhoto } from "@/entities/checkin";
import type { Checkin } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconImage } from "@/shared/icons";
import styles from "./CheckinPhoto.module.css";

export type CheckinPhotoProps = {
  checkin: Checkin;
  className?: string;
  /* shares the layout animation with the full-screen viewer */
  layout?: boolean;
};

export function CheckinPhoto({ checkin, className, layout = true }: CheckinPhotoProps) {
  const { t } = useI18n();
  const url = useCheckinPhoto(checkin);

  if (checkin.photo_purged) {
    return (
      <span className={`${styles.placeholder} ${className ?? ""}`}>
        <IconImage size={18} />
        <span className={styles.placeholderText}>{t.photo.purged}</span>
      </span>
    );
  }

  if (!url) {
    return <span className={`${styles.skeleton} ${className ?? ""}`} />;
  }

  return (
    <motion.img
      layoutId={layout ? `checkin-photo-${checkin.id}` : undefined}
      src={url}
      alt=""
      className={className}
      decoding="async"
    />
  );
}

/* Photos are purged on a schedule, so the feed says when a given one goes away. */
export function photoExpiryLabel(
  checkin: Checkin,
  t: ReturnType<typeof useI18n>["t"],
  now = Date.now(),
): string | null {
  if (checkin.photo_purged) {
    return t.photo.purged;
  }
  if (!checkin.has_photo || !checkin.photo_expires_at) {
    return null;
  }
  const msLeft = new Date(checkin.photo_expires_at).getTime() - now;
  if (msLeft <= 0) {
    return t.photo.expiresToday;
  }
  const days = Math.ceil(msLeft / 86_400_000);
  return days <= 1 ? t.photo.expiresToday : t.photo.expiresIn(days);
}
