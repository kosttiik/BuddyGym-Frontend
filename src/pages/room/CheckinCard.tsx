import { useVote } from "@/entities/checkin";
import type { Checkin, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCheck, IconClock, IconCross, IconGeoPinFilled } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticNotify } from "@/shared/lib/haptics";
import { getMyVote } from "@/shared/lib/myVotes";
import { Avatar, Badge, Button, GlassCard } from "@/shared/ui";
import styles from "./CheckinCard.module.css";
import { formatCheckinTime, hoursLeft } from "./time";

export type CheckinCardProps = {
  checkin: Checkin;
  author?: Member;
  isMine: boolean;
  roomId: number;
  disabled?: boolean;
  onOpenPhoto: () => void;
};

export function CheckinCard({
  checkin,
  author,
  isMine,
  roomId,
  disabled = false,
  onOpenPhoto,
}: CheckinCardProps) {
  const { t, locale } = useI18n();
  const vote = useVote(roomId);
  const myVote = getMyVote(checkin.id);
  const expired = checkin.status === "expired";
  const name = author?.first_name ?? "—";

  const castVote = (approve: boolean) => {
    vote.mutate(
      { checkinId: checkin.id, approve },
      {
        onSuccess: () => hapticNotify("success"),
        onError: () => hapticNotify("error"),
      },
    );
  };

  const meta = [formatCheckinTime(checkin.created_at, t, locale)];
  if (checkin.status === "pending") {
    meta.push(t.room.timeLeft(hoursLeft(checkin.expires_at)));
  }

  return (
    <GlassCard className={cx(styles.card, expired && styles.expired)}>
      <div className={styles.top}>
        <Avatar
          name={name}
          photoUrl={author?.photo_url || undefined}
          seed={checkin.user_id}
          size={38}
        />
        <div className={styles.who}>
          <span className={styles.name}>{name}</span>
          <span className={styles.meta}>{meta.join(" · ")}</span>
        </div>
        {checkin.photo_url && (
          <button
            type="button"
            className={styles.thumbButton}
            onClick={onOpenPhoto}
            aria-label={name}
          >
            <img
              src={checkin.photo_url}
              alt=""
              className={styles.thumb}
              loading="lazy"
              decoding="async"
            />
          </button>
        )}
        {checkin.geo && (
          <Badge tone="green" icon={<IconGeoPinFilled size={11} />}>
            {t.room.geoApproved}
          </Badge>
        )}
        {expired && (
          <Badge tone="neutral" icon={<IconClock size={11} />}>
            {t.room.expiredBadge}
          </Badge>
        )}
      </div>

      {checkin.status === "pending" && checkin.photo_url && (
        <>
          <div className={styles.votes}>
            <span className={styles.votesBar}>
              <span
                className={styles.votesFill}
                style={{
                  width: `${Math.min(checkin.votes_approve / checkin.votes_required, 1) * 100}%`,
                }}
              />
            </span>
            <span className={styles.votesLabel}>
              {t.room.votesFor(checkin.votes_approve, checkin.votes_required)}
            </span>
          </div>

          {!isMine && (
            <div className={styles.actions}>
              {myVote === undefined ? (
                <>
                  <Button
                    variant="tint"
                    size="sm"
                    icon={<IconCheck size={14} />}
                    className={styles.action}
                    disabled={disabled || vote.isPending}
                    onClick={() => castVote(true)}
                  >
                    {t.room.confirm}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    icon={<IconCross size={13} />}
                    className={styles.action}
                    disabled={disabled || vote.isPending}
                    onClick={() => castVote(false)}
                  >
                    {t.room.reject}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={myVote ? "primary" : "destructive"}
                    size="sm"
                    icon={myVote ? <IconCheck size={14} /> : <IconCross size={13} />}
                    className={styles.action}
                    disabled
                  >
                    {myVote ? t.room.youConfirmed : t.room.youRejected}
                  </Button>
                  <Button
                    variant={myVote ? "destructive" : "tint"}
                    size="sm"
                    className={cx(styles.action, styles.mutedAction)}
                    disabled
                  >
                    {myVote ? t.room.reject : t.room.confirm}
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
