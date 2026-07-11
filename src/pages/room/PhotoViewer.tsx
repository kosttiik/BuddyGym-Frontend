import { motion } from "motion/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useVote } from "@/entities/checkin";
import type { Checkin, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCheck, IconChevronLeft, IconCross } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { getMyVote } from "@/shared/lib/myVotes";
import { showBackButton } from "@/shared/lib/telegram";
import { Avatar, Button } from "@/shared/ui";
import styles from "./PhotoViewer.module.css";
import { formatCheckinTime, hoursLeft } from "./time";

export type PhotoViewerProps = {
  checkin: Checkin;
  author?: Member;
  isMine: boolean;
  roomId: number;
  onClose: () => void;
};

export function PhotoViewer({ checkin, author, isMine, roomId, onClose }: PhotoViewerProps) {
  const { t, locale } = useI18n();
  const vote = useVote(roomId);
  const myVote = getMyVote(checkin.id);
  const name = author?.first_name ?? "—";

  useEffect(() => showBackButton(onClose), [onClose]);

  const castVote = (approve: boolean) => {
    vote.mutate(
      { checkinId: checkin.id, approve },
      {
        onSuccess: () => {
          hapticNotify("success");
          onClose();
        },
        onError: () => hapticNotify("error"),
      },
    );
  };

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onClose} aria-label={t.common.back}>
          <IconChevronLeft size={18} />
        </button>
        <Avatar
          name={name}
          photoUrl={author?.photo_url || undefined}
          seed={checkin.user_id}
          size={34}
        />
        <div className={styles.who}>
          <span className={styles.name}>{name}</span>
          <span className={styles.meta}>
            {checkin.status === "pending"
              ? t.room.timeLeft(hoursLeft(checkin.expires_at))
              : formatCheckinTime(checkin.created_at, t, locale)}
          </span>
        </div>
      </header>

      <motion.div
        className={styles.photoWrap}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {checkin.photo_url && <img src={checkin.photo_url} alt="" className={styles.photo} />}
      </motion.div>

      {checkin.status === "pending" && (
        <motion.div
          className={styles.plate}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <div className={styles.votes}>
            <span className={styles.segments}>
              {Array.from({ length: checkin.votes_required }, (_, i) => (
                <span
                  key={String(i)}
                  className={styles.segment}
                  data-filled={i < checkin.votes_approve || undefined}
                />
              ))}
            </span>
            <span className={styles.votesLabel}>
              {t.room.votesFor(checkin.votes_approve, checkin.votes_required)}
            </span>
          </div>
          {!isMine && myVote === undefined && (
            <div className={styles.actions}>
              <Button
                icon={<IconCheck size={15} />}
                className={styles.action}
                disabled={vote.isPending}
                onClick={() => castVote(true)}
              >
                {t.room.confirm}
              </Button>
              <Button
                variant="destructive"
                icon={<IconCross size={13} />}
                className={styles.action}
                disabled={vote.isPending}
                onClick={() => castVote(false)}
              >
                {t.room.reject}
              </Button>
            </div>
          )}
          {myVote !== undefined && (
            <div className={styles.actions}>
              <Button
                variant={myVote ? "primary" : "destructive"}
                className={styles.action}
                disabled
              >
                {myVote ? t.room.youConfirmed : t.room.youRejected}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>,
    document.body,
  );
}
