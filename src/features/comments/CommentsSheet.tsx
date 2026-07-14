import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAddComment, useComments, useDeleteComment, useLikeComment } from "@/entities/comment";
import type { Comment } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCross, IconImage, IconSend } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { spring, stagger } from "@/shared/lib/motion";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { BottomSheet, Skeleton } from "@/shared/ui";
import { CommentRow } from "./CommentRow";
import styles from "./CommentsSheet.module.css";

const MAX_BODY = 500;
const MAX_PHOTO_BYTES = 5 << 20;

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring.soft },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};

export function CommentsSheet({
  checkinId,
  roomId,
  open,
  onClose,
  myId,
  canModerate,
  onOpenPhoto,
}: {
  checkinId: string;
  roomId: number;
  open: boolean;
  onClose: () => void;
  myId?: number;
  /* the room creator can delete anyone's comment */
  canModerate: boolean;
  onOpenPhoto: (url: string) => void;
}) {
  const { t } = useI18n();
  const showApiError = useApiErrorToast();
  const comments = useComments(checkinId, open);
  const addComment = useAddComment(checkinId, roomId);
  const deleteComment = useDeleteComment(checkinId, roomId);
  const likeComment = useLikeComment(checkinId, roomId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : undefined), [photo]);
  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const list = comments.data ?? [];
  const canSend = (body.trim().length > 0 || photo !== null) && !addComment.isPending;

  const send = () => {
    if (!canSend) {
      return;
    }
    addComment.mutate(
      { body: body.trim(), photo: photo ?? undefined },
      {
        onSuccess: () => {
          hapticNotify("success");
          setBody("");
          setPhoto(null);
        },
        onError: showApiError,
      },
    );
  };

  const attach = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      hapticNotify("error");
      showApiError(new Error("photo too large"));
      return;
    }
    setPhoto(file);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t.comments.title} className={styles.sheet}>
      <div className={styles.list}>
        {comments.isPending && (
          <div className={styles.skeletons}>
            {[1, 0.7, 0.4].map((opacity) => (
              <Skeleton key={opacity} width="100%" height={54} radius={16} style={{ opacity }} />
            ))}
          </div>
        )}

        {comments.isSuccess && list.length === 0 && (
          <p className={styles.empty}>{t.comments.empty}</p>
        )}

        <motion.div variants={stagger(0.04)} initial="hidden" animate="visible">
          <AnimatePresence initial={false}>
            {list.map((comment) => (
              <motion.div
                key={comment.id}
                variants={rowVariants}
                exit="exit"
                layout
                className={styles.rowWrap}
              >
                <CommentRow
                  checkinId={checkinId}
                  comment={comment}
                  canDelete={canModerate || comment.user_id === myId}
                  onLike={(c: Comment) => likeComment.mutate({ id: c.id, liked: c.liked_by_me })}
                  onDelete={(c: Comment) => deleteComment.mutate(c.id)}
                  onOpenPhoto={onOpenPhoto}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className={styles.composer}>
        <AnimatePresence>
          {photoUrl && (
            <motion.div
              className={styles.attachment}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <img src={photoUrl} alt="" className={styles.attachmentPhoto} />
              <button
                type="button"
                className={styles.attachmentDrop}
                aria-label={t.common.close}
                onClick={() => setPhoto(null)}
              >
                <IconCross size={11} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.inputRow}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              attach(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className={styles.attachButton}
            aria-label={t.comments.attach}
            onClick={() => fileRef.current?.click()}
          >
            <IconImage size={18} />
          </button>
          <input
            className={styles.input}
            value={body}
            maxLength={MAX_BODY}
            placeholder={t.comments.placeholder}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                send();
              }
            }}
          />
          <motion.button
            type="button"
            className={styles.send}
            aria-label={t.comments.send}
            disabled={!canSend}
            whileTap={{ scale: 0.9 }}
            transition={spring.snappy}
            onClick={send}
          >
            <IconSend size={16} />
          </motion.button>
        </div>
      </div>
    </BottomSheet>
  );
}
