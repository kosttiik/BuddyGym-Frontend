import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useVote } from "@/entities/checkin";
import { BuddiesSheet } from "@/features/checkin/BuddiesSheet";
import { CheckinPhoto } from "@/features/checkin/CheckinPhoto";
import type { Checkin, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCheck, IconClock, IconComment, IconCross, IconGeoPinFilled } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticNotify } from "@/shared/lib/haptics";
import { getMyVote } from "@/shared/lib/myVotes";
import { Avatar, AvatarStack, Badge, Button, GlassCard } from "@/shared/ui";
import styles from "./CheckinCard.module.css";
import { formatCheckinTime, hoursLeft } from "./time";

export type CheckinCardProps = {
  checkin: Checkin;
  author?: Member;
  isMine: boolean;
  roomId: number;
  disabled?: boolean;
  onOpenPhoto: (options?: { comments?: boolean }) => void;
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
  const buddies = checkin.buddies ?? [];
  const comments = checkin.comments_count ?? 0;
  const [buddiesOpen, setBuddiesOpen] = useState(false);

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
        <Link
          to="/users/$userId"
          params={{ userId: String(checkin.user_id) }}
          className={styles.author}
        >
          <Avatar
            name={name}
            hasAvatar={author?.has_avatar}
            seed={checkin.user_id}
            status={author}
            size={38}
          />
          <div className={styles.who}>
            <span className={styles.nameRow}>
              <span className={styles.name}>{name}</span>
              {buddies.length > 0 && (
                <button
                  type="button"
                  className={styles.buddiesButton}
                  onClick={(event) => {
                    event.preventDefault();
                    setBuddiesOpen(true);
                  }}
                >
                  <AvatarStack
                    size={20}
                    max={3}
                    people={buddies.map((b) => ({
                      id: b.id,
                      name: b.first_name,
                      hasAvatar: b.has_avatar,
                    }))}
                  />
                  <span className={styles.withBuddies}>
                    {buddies.length === 1
                      ? t.buddies.withOne(buddies[0]?.first_name ?? "")
                      : t.buddies.withMany(buddies[0]?.first_name ?? "", buddies.length - 1)}
                  </span>
                </button>
              )}
            </span>
            <span className={styles.meta}>{meta.join(" · ")}</span>
          </div>
        </Link>
        {checkin.has_photo && (
          <button
            type="button"
            className={styles.thumbButton}
            onClick={() => onOpenPhoto()}
            aria-label={name}
          >
            <CheckinPhoto checkin={checkin} className={styles.thumb} />
          </button>
        )}
        {checkin.photo_purged && (
          <span className={styles.thumbButton}>
            <CheckinPhoto checkin={checkin} className={styles.thumb} />
          </span>
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
        {checkin.has_photo && (
          <button
            type="button"
            className={styles.commentsPill}
            aria-label={t.comments.title}
            onClick={() => onOpenPhoto({ comments: true })}
          >
            <IconComment size={13} />
            {comments > 0 && <span>{comments}</span>}
          </button>
        )}
      </div>

      {checkin.status === "pending" && checkin.has_photo && (
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
              {checkin.votes_reject > 0 && (
                <span className={styles.votesAgainst}>
                  {t.room.votesAgainst(checkin.votes_reject, checkin.votes_required)}
                </span>
              )}
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
      <BuddiesSheet
        buddies={buddies}
        author={author}
        open={buddiesOpen}
        onClose={() => setBuddiesOpen(false)}
      />
    </GlassCard>
  );
}
