import { Link, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useRoom } from "@/entities/room";
import { useMe } from "@/entities/user";
import type { Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconFire, IconTrophy } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { riseItem, stagger } from "@/shared/lib/motion";
import {
  AppHeader,
  Avatar,
  Badge,
  GlassCard,
  Page,
  SegmentedControl,
  Skeleton,
  StreakFlame,
} from "@/shared/ui";
import styles from "./BoardPage.module.css";
import { Podium, taunt } from "./Podium";

type BoardKey = "honor" | "shame";

/* Ranked best first. Ties are broken by the streak, then by seniority, so the order is
   stable across renders instead of wobbling with whatever the API happened to return. */
function rank(members: Member[]): Member[] {
  return [...members].sort(
    (a, b) =>
      b.workouts_count - a.workouts_count ||
      b.streak - a.streak ||
      a.joined_at.localeCompare(b.joined_at),
  );
}

export function BoardPage() {
  const { roomId } = useParams({ strict: false }) as { roomId: string };
  const id = Number(roomId);
  const { t } = useI18n();
  const room = useRoom(id);
  const me = useMe();
  const [board, setBoard] = useState<BoardKey>("honor");

  const goal = room.data?.room.goal_per_period ?? 0;
  const ranked = useMemo(() => rank(room.data?.members ?? []), [room.data]);
  const slackers = useMemo(
    () => ranked.filter((m) => m.workouts_count < goal).reverse(),
    [ranked, goal],
  );

  return (
    <>
      <AppHeader variant="nested" title={t.board.title} />
      <Page>
        <SegmentedControl
          className={styles.switch}
          value={board}
          onChange={setBoard}
          options={[
            { key: "honor", label: t.board.honor },
            { key: "shame", label: t.board.shame },
          ]}
        />

        {room.isPending && <Skeleton width="100%" height={220} radius={20} />}

        {room.isSuccess && board === "honor" && (
          <Honor members={ranked} goal={goal} myId={me.data?.user.id} />
        )}
        {room.isSuccess && board === "shame" && (
          <Shame members={slackers} goal={goal} myId={me.data?.user.id} />
        )}
      </Page>
    </>
  );
}

function Honor({ members, goal, myId }: { members: Member[]; goal: number; myId?: number }) {
  const { t } = useI18n();
  const rest = members.slice(3);

  if (members.every((m) => m.workouts_count === 0)) {
    return (
      <EmptyBoard
        icon={<IconTrophy size={40} />}
        title={t.board.honorEmpty}
        text={t.board.honorEmptyHint}
      />
    );
  }

  return (
    <>
      <p className={styles.lede}>{t.board.honorLede}</p>
      <Podium
        members={members}
        goal={goal}
        tone="honor"
        renderLink={(member, children) => (
          <MemberLink member={member} isMe={member.id === myId}>
            {children}
          </MemberLink>
        )}
      />

      {rest.length > 0 && (
        <motion.div
          className={styles.list}
          variants={stagger(0.05)}
          initial="hidden"
          animate="visible"
        >
          {rest.map((member, i) => (
            <motion.div key={member.id} variants={riseItem}>
              <Row member={member} place={i + 4} goal={goal} isMe={member.id === myId} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}

function Shame({ members, goal, myId }: { members: Member[]; goal: number; myId?: number }) {
  const { t } = useI18n();
  const rest = members.slice(3);

  if (members.length === 0) {
    return (
      <EmptyBoard
        icon={<IconFire size={40} />}
        title={t.board.shameEmpty}
        text={t.board.shameEmptyHint}
      />
    );
  }

  return (
    <>
      <p className={cx(styles.lede, styles.shameLede)}>{t.board.shameLede}</p>
      <Podium
        members={members}
        goal={goal}
        tone="shame"
        renderLink={(member, children) => (
          <MemberLink member={member} isMe={member.id === myId}>
            {children}
          </MemberLink>
        )}
      />

      {rest.length > 0 && (
        <motion.div
          className={styles.list}
          data-testid="shame-list"
          variants={stagger(0.05)}
          initial="hidden"
          animate="visible"
        >
          {rest.map((member, i) => (
            <motion.div key={member.id} variants={riseItem}>
              <GlassCard className={cx(styles.row, styles.shameRow)}>
                <MemberLink member={member} isMe={member.id === myId} className={styles.rowLink} />
                <span className={styles.rank}>{i + 4}</span>
                <Avatar
                  name={member.first_name}
                  seed={member.id}
                  hasAvatar={member.has_avatar}
                  status={member}
                  size={40}
                  className={styles.shameAvatar}
                />
                <div className={styles.info}>
                  <span className={styles.nameRow}>
                    <span className={styles.name} data-testid="shame-name">
                      {member.first_name}
                    </span>
                    {member.id === myId && <Badge tone="neutral">{t.members.you}</Badge>}
                  </span>
                  <span className={styles.taunt} data-testid="taunt">
                    {taunt(t.board.taunts, member)}
                  </span>
                </div>
                <span className={styles.shameCount}>
                  {t.board.workouts(member.workouts_count, goal)}
                </span>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}

function Row({
  member,
  place,
  goal,
  isMe,
}: {
  member: Member;
  place: number;
  goal: number;
  isMe: boolean;
}) {
  const { t } = useI18n();
  return (
    <GlassCard className={styles.row}>
      <MemberLink member={member} isMe={isMe} className={styles.rowLink} />
      <span className={styles.rank}>{place}</span>
      <Avatar
        name={member.first_name}
        seed={member.id}
        hasAvatar={member.has_avatar}
        status={member}
        size={40}
      />
      <div className={styles.info}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{member.first_name}</span>
          {isMe && <Badge tone="neutral">{t.members.you}</Badge>}
        </span>
        <StreakFlame streak={member.streak} />
      </div>
      <span className={styles.count}>{t.board.workouts(member.workouts_count, goal)}</span>
    </GlassCard>
  );
}

function MemberLink({
  member,
  isMe,
  className,
  children,
}: {
  member: Member;
  isMe: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  if (isMe) {
    return (
      <Link to="/profile" className={className} aria-label={member.first_name}>
        {children}
      </Link>
    );
  }
  return (
    <Link
      to="/users/$userId"
      params={{ userId: String(member.id) }}
      className={className}
      aria-label={member.first_name}
    >
      {children}
    </Link>
  );
}

function EmptyBoard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <motion.div
      className={styles.empty}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className={styles.emptyIcon}>{icon}</span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{text}</p>
    </motion.div>
  );
}
