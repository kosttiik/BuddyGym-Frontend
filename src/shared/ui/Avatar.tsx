import type { User } from "@/shared/api/types";
import { cx } from "@/shared/lib/cx";
import { useAvatar } from "@/shared/lib/useAvatar";
import styles from "./Avatar.module.css";
import { StatusMark } from "./StatusMark";

const PALETTE = ["var(--avatar-1)", "var(--avatar-2)", "var(--avatar-3)", "var(--avatar-4)"];

export type AvatarProps = {
  name: string;
  /* the user id: drives both the mirrored avatar lookup and the placeholder color */
  seed: number;
  hasAvatar?: boolean;
  /* the status rides on the avatar itself, so it follows the person everywhere they appear */
  status?: Pick<User, "status_emoji" | "status_text">;
  size?: number;
  className?: string;
};

export function Avatar({ name, seed, hasAvatar, status, size = 38, className }: AvatarProps) {
  const photoUrl = useAvatar(seed, hasAvatar);
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.42,
    background: photoUrl ? undefined : PALETTE[Math.abs(seed) % PALETTE.length],
  };

  const face = (
    <span className={cx(styles.avatar, !status && className)} style={style}>
      {photoUrl ? (
        <img src={photoUrl} alt="" className={styles.photo} decoding="async" />
      ) : (
        (name.trim().charAt(0) || "•").toUpperCase()
      )}
    </span>
  );

  if (!status || (!status.status_emoji && !status.status_text)) {
    return face;
  }
  return (
    <span className={cx(styles.withStatus, className)}>
      {face}
      <StatusMark user={status} className={styles.statusBadge} />
    </span>
  );
}

export type AvatarStackProps = {
  people: Array<{ id: number; name: string; hasAvatar?: boolean }>;
  max?: number;
  size?: number;
  className?: string;
};

export function AvatarStack({ people, max = 4, size = 30, className }: AvatarStackProps) {
  const visible = people.slice(0, max);
  const rest = people.length - visible.length;
  return (
    <span className={cx(styles.stack, className)}>
      {visible.map((p) => (
        <Avatar
          key={p.id}
          name={p.name}
          seed={p.id}
          hasAvatar={p.hasAvatar}
          size={size}
          className={styles.stacked}
        />
      ))}
      {rest > 0 && (
        <span
          className={cx(styles.avatar, styles.stacked, styles.more)}
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
