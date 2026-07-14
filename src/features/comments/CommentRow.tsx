import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCommentPhoto } from "@/entities/comment";
import type { Comment } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconHeart, IconHeartFilled, IconTrash } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticTap } from "@/shared/lib/haptics";
import { spring } from "@/shared/lib/motion";
import { Avatar } from "@/shared/ui";
import styles from "./CommentRow.module.css";

export function CommentRow({
  checkinId,
  comment,
  canDelete,
  onLike,
  onDelete,
  onOpenPhoto,
}: {
  checkinId: string;
  comment: Comment;
  canDelete: boolean;
  onLike: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  onOpenPhoto: (url: string) => void;
}) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const photoUrl = useCommentPhoto(checkinId, comment);
  const liked = comment.liked_by_me;

  return (
    <div className={styles.row}>
      <Avatar
        name={comment.author.first_name}
        seed={comment.author.id}
        hasAvatar={comment.author.has_avatar}
        size={32}
      />
      <div className={styles.bubble}>
        <span className={styles.name}>{comment.author.first_name}</span>
        {comment.body && <p className={styles.body}>{comment.body}</p>}
        {comment.has_photo && (
          <button
            type="button"
            className={styles.photoButton}
            disabled={!photoUrl}
            onClick={() => photoUrl && onOpenPhoto(photoUrl)}
          >
            {photoUrl ? (
              <motion.img
                src={photoUrl}
                alt=""
                className={styles.photo}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring.soft}
              />
            ) : (
              <span className={styles.photoSkeleton} />
            )}
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <motion.button
          type="button"
          className={cx(styles.like, liked && styles.liked)}
          aria-pressed={liked}
          aria-label={t.comments.like}
          whileTap={{ scale: 0.85 }}
          transition={spring.snappy}
          onClick={() => {
            hapticTap();
            onLike(comment);
          }}
        >
          <span className={styles.heart}>
            <AnimatePresence initial={false} mode="wait">
              {liked ? (
                <motion.span
                  key="on"
                  className={styles.heartInner}
                  initial={reduced ? false : { scale: 0.2 }}
                  animate={{ scale: 1 }}
                  transition={spring.bouncy}
                >
                  <IconHeartFilled size={16} />
                </motion.span>
              ) : (
                <motion.span
                  key="off"
                  className={styles.heartInner}
                  initial={reduced ? false : { scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.12 }}
                >
                  <IconHeart size={16} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          {comment.likes > 0 && <span className={styles.likes}>{comment.likes}</span>}
        </motion.button>

        {canDelete && (
          <button
            type="button"
            className={styles.delete}
            aria-label={t.comments.delete}
            onClick={() => onDelete(comment)}
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
