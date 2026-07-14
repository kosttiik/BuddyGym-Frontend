import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { User } from "@/shared/api/types";
import { cx } from "@/shared/lib/cx";
import { hapticTap } from "@/shared/lib/haptics";
import { spring } from "@/shared/lib/motion";
import styles from "./StatusMark.module.css";

/* The emoji is user content, like the avatar. Where the row is tight only the mark fits, so a
   tap unfurls the text instead of losing it. */
export function StatusMark({
  user,
  withText = false,
  className,
}: {
  user: Pick<User, "status_emoji" | "status_text">;
  withText?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!user.status_emoji && !user.status_text) {
    return null;
  }

  if (withText) {
    return (
      <span className={cx(styles.chip, className)}>
        {user.status_emoji && <span className={styles.chipEmoji}>{user.status_emoji}</span>}
        {user.status_text && <span className={styles.chipText}>{user.status_text}</span>}
      </span>
    );
  }

  if (!user.status_emoji) {
    return null;
  }

  return (
    <span className={cx(styles.wrap, className)}>
      <button
        type="button"
        className={styles.mark}
        aria-label={user.status_text || user.status_emoji}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!user.status_text) {
            return;
          }
          hapticTap();
          setOpen((current) => !current);
        }}
      >
        {user.status_emoji}
      </button>

      <AnimatePresence>
        {open && user.status_text && (
          <motion.span
            className={styles.bubble}
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring.snappy}
          >
            {user.status_text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
