import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useVote } from "@/entities/checkin";
import { CheckinPhoto, photoExpiryLabel } from "@/features/checkin/CheckinPhoto";
import { CommentsSheet } from "@/features/comments/CommentsSheet";
import type { Checkin, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import {
  IconCheck,
  IconChevronLeft,
  IconComment,
  IconCross,
  IconHeartFilled,
} from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticNotify } from "@/shared/lib/haptics";
import { spring } from "@/shared/lib/motion";
import { getMyVote } from "@/shared/lib/myVotes";
import { showBackButton } from "@/shared/lib/telegram";
import { Avatar, AvatarStack, Button } from "@/shared/ui";
import styles from "./PhotoViewer.module.css";
import { formatCheckinTime, hoursLeft } from "./time";

export type PhotoViewerProps = {
  checkin: Checkin;
  author?: Member;
  isMine: boolean;
  roomId: number;
  myId?: number;
  canModerate: boolean;
  onClose: () => void;
};

export function PhotoViewer({
  checkin,
  author,
  isMine,
  roomId,
  myId,
  canModerate,
  onClose,
}: PhotoViewerProps) {
  const { t, locale } = useI18n();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const top = checkin.top_comment;
  const total = checkin.comments_count ?? 0;
  const vote = useVote(roomId);
  const myVote = getMyVote(checkin.id);
  const name = author?.first_name ?? "—";
  const buddies = checkin.buddies ?? [];
  const expiry = photoExpiryLabel(checkin, t);

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
        <Avatar name={name} hasAvatar={author?.has_avatar} seed={checkin.user_id} size={34} />
        <div className={styles.who}>
          <span className={styles.name}>{name}</span>
          <span className={styles.meta}>
            {checkin.status === "pending"
              ? t.room.timeLeft(hoursLeft(checkin.expires_at))
              : formatCheckinTime(checkin.created_at, t, locale)}
          </span>
        </div>
        {buddies.length > 0 && (
          <div className={styles.buddies}>
            <AvatarStack
              size={26}
              max={3}
              people={buddies.map((b) => ({
                id: b.id,
                name: b.first_name,
                hasAvatar: b.has_avatar,
              }))}
            />
            <span className={styles.buddiesLabel}>
              {buddies.length === 1
                ? t.buddies.withOne(buddies[0]?.first_name ?? "")
                : t.buddies.withMany(buddies[0]?.first_name ?? "", buddies.length - 1)}
            </span>
          </div>
        )}
      </header>

      <div className={styles.photoWrap}>
        <CheckinPhoto checkin={checkin} className={styles.photo} />
      </div>

      {/* the thread lives in a sheet: only the most liked line sits under the photo, so it
          never covers the shot and never lands on top of the plate */}
      <motion.div
        className={cx(styles.commentsBar, checkin.status !== "pending" && styles.commentsBarLast)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.15 }}
      >
        <button
          type="button"
          className={cx(styles.topComment, !top && styles.topEmpty)}
          onClick={() => setCommentsOpen(true)}
        >
          {top ? (
            <>
              <span className={styles.topAuthor}>{top.author.first_name}</span>
              <span className={styles.topBody}>{top.body || t.comments.photoOnly}</span>
              {top.likes > 0 && (
                <span className={styles.topLikes}>
                  <IconHeartFilled size={11} />
                  {top.likes}
                </span>
              )}
            </>
          ) : (
            <span className={styles.topBody}>{t.comments.beFirst}</span>
          )}
        </button>

        <motion.button
          type="button"
          className={styles.allComments}
          aria-label={t.comments.title}
          whileTap={{ scale: 0.92 }}
          transition={spring.snappy}
          onClick={() => setCommentsOpen(true)}
        >
          <IconComment size={16} />
          {total > 0 && <span className={styles.count}>{total}</span>}
        </motion.button>
      </motion.div>

      {checkin.status === "pending" && (
        <motion.div
          className={styles.plate}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          {expiry && <span className={styles.expiry}>{expiry}</span>}
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

      <CommentsSheet
        checkinId={checkin.id}
        roomId={roomId}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        myId={myId}
        canModerate={canModerate}
        onOpenPhoto={setZoomed}
      />

      <AnimatePresence>
        {zoomed && (
          <motion.button
            type="button"
            className={styles.zoom}
            aria-label={t.common.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(null)}
          >
            <motion.img
              src={zoomed}
              alt=""
              className={styles.zoomPhoto}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={spring.soft}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
