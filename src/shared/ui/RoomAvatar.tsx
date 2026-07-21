import { cx } from "@/shared/lib/cx";
import { useRoomAvatar } from "@/shared/lib/useAvatar";
import styles from "./RoomAvatar.module.css";

const PALETTE = ["var(--avatar-1)", "var(--avatar-2)", "var(--avatar-3)", "var(--avatar-4)"];

export type RoomAvatarProps = {
  roomId: number;
  name: string;
  hasAvatar?: boolean;
  size?: number;
  className?: string;
  onClick?: () => void;
  label?: string;
};

/* Rooms wear a rounded square, people wear a circle: the shape alone says which is which. */
export function RoomAvatar({
  roomId,
  name,
  hasAvatar,
  size = 44,
  className,
  onClick,
  label,
}: RoomAvatarProps) {
  const photoUrl = useRoomAvatar(roomId, hasAvatar);
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.4,
    borderRadius: Math.max(10, size * 0.28),
    background: photoUrl ? undefined : PALETTE[Math.abs(roomId) % PALETTE.length],
  };
  const content = photoUrl ? (
    <img src={photoUrl} alt="" className={styles.photo} decoding="async" />
  ) : (
    (name.trim().charAt(0) || "•").toUpperCase()
  );

  if (!onClick) {
    return (
      <span className={cx(styles.tile, className)} style={style}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cx(styles.tile, styles.button, className)}
      style={style}
      onClick={onClick}
      aria-label={label}
    >
      {content}
    </button>
  );
}
