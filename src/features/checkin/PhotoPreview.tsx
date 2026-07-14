import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Member, RoomWithProgress } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCamera, IconCheck } from "@/shared/icons";
import { hapticSelection } from "@/shared/lib/haptics";
import type { CompressedPhoto } from "@/shared/lib/photo";
import { showBackButton } from "@/shared/lib/telegram";
import { Button } from "@/shared/ui";
import { BuddyPicker } from "./BuddyPicker";
import styles from "./PhotoPreview.module.css";
import { UploadProgress } from "./UploadProgress";

export type PhotoPreviewProps = {
  photo: CompressedPhoto;
  rooms: RoomWithProgress[];
  selected: number[];
  onToggleRoom: (roomId: number) => void;
  buddyCandidates: Member[];
  selectedBuddies: number[];
  onToggleBuddy: (userId: number) => void;
  pending: boolean;
  /* 0..1 */
  progress: number;
  onRetake: () => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function PhotoPreview({
  photo,
  rooms,
  selected,
  onToggleRoom,
  buddyCandidates,
  selectedBuddies,
  onToggleBuddy,
  pending,
  progress,
  onRetake,
  onSubmit,
  onClose,
}: PhotoPreviewProps) {
  const { t } = useI18n();
  const url = useMemo(() => URL.createObjectURL(photo.file), [photo.file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => showBackButton(onClose), [onClose]);

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className={styles.header}>
        <button type="button" className={styles.retake} onClick={onRetake} disabled={pending}>
          <IconCamera size={15} />
          {t.photoPreview.retake}
        </button>
      </header>

      <motion.div
        className={styles.photoWrap}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={url} alt="" className={styles.photo} />
        {pending && <UploadProgress progress={progress} rooms={selected.length} />}
      </motion.div>

      <motion.div
        className={styles.bottom}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      >
        <p className={styles.sendTo}>{t.photoPreview.sendTo}</p>

        <ul className={styles.rooms}>
          {rooms.map((room) => {
            const on = selected.includes(room.id);
            return (
              <li key={room.id}>
                <button
                  type="button"
                  className={styles.room}
                  data-on={on || undefined}
                  disabled={pending}
                  aria-pressed={on}
                  onClick={() => {
                    hapticSelection();
                    onToggleRoom(room.id);
                  }}
                >
                  <span className={styles.box} aria-hidden="true">
                    {on && <IconCheck size={11} />}
                  </span>
                  <span className={styles.roomName}>{room.name}</span>
                  <span className={styles.roomVotes}>
                    {t.photoPreview.votesNeeded(room.votes_required)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <BuddyPicker
          className={styles.buddies}
          members={buddyCandidates}
          selected={selectedBuddies}
          onToggle={onToggleBuddy}
        />

        <Button block disabled={pending || selected.length === 0} onClick={onSubmit}>
          {pending ? t.photoPreview.sending : t.photoPreview.submit}
        </Button>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
