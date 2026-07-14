import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useLeaveRoom, useRoom } from "@/entities/room";
import { useMe } from "@/entities/user";
import type { Member, UserStatus } from "@/shared/api/types";
import { formatDay, useI18n } from "@/shared/i18n";
import { IconLeave, IconLightning, IconStar } from "@/shared/icons";
import { hapticNotify, hapticTap } from "@/shared/lib/haptics";
import { isStreakAtRisk } from "@/shared/lib/streak";
import {
  AppHeader,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  GlassCard,
  Page,
  ProgressCounter,
  Skeleton,
  StreakFlame,
  sheetItemVariants,
} from "@/shared/ui";
import styles from "./MembersPage.module.css";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export function MembersPage() {
  const { roomId } = useParams({ strict: false }) as { roomId: string };
  const id = Number(roomId);
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const room = useRoom(id);
  const me = useMe();
  const leaveRoom = useLeaveRoom();

  const sorted = useMemo(() => {
    const members = [...(room.data?.members ?? [])];
    return members.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  }, [room.data]);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const leave = () => {
    leaveRoom.mutate(id, {
      onSuccess: () => {
        hapticNotify("warning");
        void navigate({ to: "/", replace: true });
      },
    });
  };

  return (
    <>
      <AppHeader variant="nested" title={t.members.title} />
      <Page>
        {room.isPending && (
          <GlassCard>
            <Skeleton width="100%" height={40} />
          </GlassCard>
        )}

        {room.isSuccess && (
          <motion.div
            className={styles.list}
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {sorted.map((member) => (
              <motion.div key={member.id} variants={itemVariants}>
                <MemberRow
                  member={member}
                  isMe={member.id === me.data?.user.id}
                  goal={room.data.room.goal_per_period}
                  locale={locale}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className={styles.leaveBlock}>
          <Button
            variant="ghost"
            block
            className={styles.leaveButton}
            icon={<IconLeave size={15} />}
            disabled={leaveRoom.isPending}
            onClick={() => {
              hapticTap();
              setConfirmOpen(true);
            }}
          >
            {t.members.leave}
          </Button>
          <span className={styles.leaveNote}>{t.members.leaveNote}</span>
        </div>
      </Page>

      {/* leaving is not undoable: the progress is dropped and the last member out kills the room */}
      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t.members.leaveConfirmTitle}
      >
        <motion.p className={styles.confirmText} variants={sheetItemVariants}>
          {t.members.leaveConfirmText}
        </motion.p>
        <motion.div className={styles.confirmActions} variants={sheetItemVariants}>
          <Button variant="secondary" block onClick={() => setConfirmOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="ghost"
            block
            className={styles.leaveButton}
            disabled={leaveRoom.isPending}
            onClick={leave}
          >
            {t.members.leaveConfirm}
          </Button>
        </motion.div>
      </BottomSheet>
    </>
  );
}

function MemberRow({
  member,
  isMe,
  goal,
  locale,
}: {
  member: Member;
  isMe: boolean;
  goal: number;
  locale: "ru" | "en";
}) {
  const { t } = useI18n();
  return (
    <GlassCard className={styles.row}>
      {isMe ? (
        <Link to="/profile" className={styles.rowLink} aria-label={member.first_name} />
      ) : (
        <Link
          to="/users/$userId"
          params={{ userId: String(member.id) }}
          className={styles.rowLink}
          aria-label={member.first_name}
        />
      )}
      <Avatar name={member.first_name} hasAvatar={member.has_avatar} seed={member.id} size={40} />
      <div className={styles.info}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{member.first_name}</span>
          <MemberStatusBadge status={member.status} />
          {isMe && <Badge tone="neutral">{t.members.you}</Badge>}
        </span>
        <span className={styles.meta}>{t.members.since(formatDay(member.joined_at, locale))}</span>
      </div>
      <StreakFlame
        streak={member.streak}
        atRisk={isStreakAtRisk({
          streak: member.streak,
          workouts: member.workouts_count,
          goal,
          periodEndsAt: member.period_ends_at,
        })}
      />
      <ProgressCounter value={member.workouts_count} goal={goal} trackId={`member:${member.id}`} />
    </GlassCard>
  );
}

function MemberStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useI18n();
  if (status === "beast") {
    return (
      <Badge tone="orange" icon={<IconStar size={10} />}>
        {t.members.statusBeast}
      </Badge>
    );
  }
  if (status === "regular") {
    return (
      <Badge tone="green" icon={<IconLightning size={10} />}>
        {t.members.statusRegular}
      </Badge>
    );
  }
  return <Badge tone="neutral">{t.members.statusNovice}</Badge>;
}
