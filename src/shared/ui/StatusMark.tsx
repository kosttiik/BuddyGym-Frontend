import type { User } from "@/shared/api/types";
import { cx } from "@/shared/lib/cx";
import styles from "./StatusMark.module.css";

/* The emoji is user content, like the avatar. The text is dropped where the row is tight and
   only the mark fits. */
export function StatusMark({
  user,
  withText = false,
  className,
}: {
  user: Pick<User, "status_emoji" | "status_text">;
  withText?: boolean;
  className?: string;
}) {
  if (!user.status_emoji && !user.status_text) {
    return null;
  }
  if (!withText) {
    if (!user.status_emoji) {
      return null;
    }
    return (
      <span className={cx(styles.mark, className)} title={user.status_text}>
        {user.status_emoji}
      </span>
    );
  }
  return (
    <span className={cx(styles.chip, className)}>
      {user.status_emoji && <span className={styles.chipEmoji}>{user.status_emoji}</span>}
      {user.status_text && <span className={styles.chipText}>{user.status_text}</span>}
    </span>
  );
}
