import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useRoomCheckins } from "@/entities/checkin";
import { useRoom } from "@/entities/room";
import { useMe } from "@/entities/user";
import { CheckinSheet } from "@/features/checkin/CheckinSheet";
import { ApiError } from "@/shared/api/client";
import type { Checkin, CheckinStatus, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCloudOff, IconDumbbell, IconKey, IconLockKeyhole, IconShare } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import {
  AppHeader,
  AvatarStack,
  Badge,
  Banner,
  Button,
  GlassCard,
  Page,
  PullToRefresh,
  Skeleton,
  useToast,
} from "@/shared/ui";
import { CheckinCard } from "./CheckinCard";
import { PhotoViewer } from "./PhotoViewer";
import styles from "./RoomPage.module.css";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

export function RoomPage() {
  const { roomId } = useParams({ from: "/rooms/$roomId" });
  const id = Number(roomId);
  const { t } = useI18n();
  const room = useRoom(id);
  const me = useMe();
  const [tab, setTab] = useState<CheckinStatus>("pending");
  const checkins = useRoomCheckins(id, tab);
  const pendingCheckins = useRoomCheckins(id, "pending");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewer, setViewer] = useState<Checkin | null>(null);

  const members = useMemo(() => {
    const map = new Map<number, Member>();
    for (const m of room.data?.members ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [room.data]);

  const forbidden = room.isError && room.error instanceof ApiError && room.error.status === 403;
  const checkinsDown =
    checkins.isError && checkins.error instanceof ApiError && checkins.error.status === 502;

  if (forbidden) {
    return <ForbiddenScreen />;
  }

  const tabs: Array<{ key: CheckinStatus; label: string; count?: number }> = [
    { key: "pending", label: t.room.tabPending, count: pendingCheckins.data?.length },
    { key: "approved", label: t.room.tabApproved },
    { key: "rejected", label: t.room.tabRejected },
    { key: "expired", label: t.room.tabExpired },
  ];

  return (
    <PullToRefresh onRefresh={() => Promise.all([room.refetch(), checkins.refetch()])}>
      <AppHeader variant="nested" title={room.data?.room.name ?? t.common.appName} />
      <Page bottomSpace>
        {room.isPending && <RoomHeaderSkeleton />}
        {room.isSuccess && <RoomHeaderCard detail={room.data} />}

        {checkinsDown && (
          <Banner
            icon={<IconCloudOff size={20} />}
            title={t.errors.checkinsUnavailable}
            description={t.errors.checkinsUnavailableDesc}
          />
        )}

        <div className={styles.tabs}>
          {tabs.map((item) => (
            <TabPill
              key={item.key}
              label={item.label}
              count={item.count}
              active={tab === item.key}
              onClick={() => setTab(item.key)}
            />
          ))}
        </div>

        {checkins.isPending && !checkinsDown && <FeedSkeleton />}

        {checkins.isSuccess && checkins.data.length === 0 && (
          <div className={styles.emptyFeed}>
            <p className={styles.emptyFeedTitle}>{t.room.emptyFeed}</p>
            <p className={styles.emptyFeedHint}>{t.room.emptyFeedHint}</p>
          </div>
        )}

        {checkins.isSuccess && (
          <motion.div
            key={tab}
            className={styles.feed}
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {checkins.data.map((checkin) => (
              <motion.div key={checkin.id} variants={itemVariants} layout>
                <CheckinCard
                  checkin={checkin}
                  author={members.get(checkin.user_id)}
                  isMine={checkin.user_id === me.data?.user.id}
                  roomId={id}
                  disabled={checkinsDown}
                  onOpenPhoto={() => setViewer(checkin)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </Page>

      <div className={styles.ctaWrap}>
        <Button
          block
          icon={<IconDumbbell size={17} />}
          disabled={checkinsDown || !room.isSuccess}
          onClick={() => setSheetOpen(true)}
        >
          {t.room.checkinCta}
        </Button>
      </div>

      {room.isSuccess && (
        <CheckinSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          room={room.data.room}
          myProgress={me.data ? (members.get(me.data.user.id)?.workouts_count ?? 0) : 0}
        />
      )}

      <AnimatePresence>
        {viewer && (
          <PhotoViewer
            checkin={viewer}
            author={members.get(viewer.user_id)}
            isMine={viewer.user_id === me.data?.user.id}
            roomId={id}
            onClose={() => setViewer(null)}
          />
        )}
      </AnimatePresence>
    </PullToRefresh>
  );
}

function TabPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.tabPill}
      data-active={active || undefined}
      onClick={onClick}
    >
      {active && (
        <motion.span
          layoutId="room-tab-pill"
          className={styles.tabPillBg}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className={styles.tabPillLabel}>
        {label}
        {count !== undefined && count > 0 && ` · ${count}`}
      </span>
    </button>
  );
}

function RoomHeaderCard({
  detail,
}: {
  detail: { room: import("@/shared/api/types").Room; members: Member[] };
}) {
  const { t } = useI18n();
  const showToast = useToast();
  const { room, members } = detail;

  const copyCode = async () => {
    if (!room.invite_code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(room.invite_code);
      hapticNotify("success");
      showToast({ title: t.room.codeCopied, tone: "warning", icon: <IconKey size={18} /> });
    } catch {
      /* clipboard unavailable: the code is still visible on screen */
    }
  };

  return (
    <GlassCard className={styles.header}>
      <div className={styles.headerTop}>
        <h1 className={styles.roomName}>{room.name}</h1>
        <Badge tone={room.kind === "open" ? "green" : "purple"}>
          {room.kind === "open" ? t.rooms.openBadge : t.rooms.inviteBadge}
        </Badge>
      </div>
      <p className={styles.roomMeta}>
        {t.room.meta(room.goal_per_period, room.period_days, room.votes_required, members.length)}
      </p>
      <div className={styles.headerBottom}>
        <Link
          to="/rooms/$roomId/members"
          params={{ roomId: String(room.id) }}
          className={styles.membersLink}
          aria-label={t.members.title}
        >
          <AvatarStack
            people={members.map((m) => ({
              id: m.id,
              name: m.first_name,
              photoUrl: m.photo_url || undefined,
            }))}
          />
        </Link>
        {room.invite_code && (
          <button type="button" className={styles.codePill} onClick={copyCode}>
            <span className={styles.code}>{room.invite_code}</span>
            <IconShare size={14} />
          </button>
        )}
      </div>
    </GlassCard>
  );
}

function RoomHeaderSkeleton() {
  return (
    <GlassCard>
      <Skeleton width="60%" height={20} />
      <Skeleton width="85%" height={13} style={{ marginTop: 10 }} />
      <Skeleton width="50%" height={30} radius={15} style={{ marginTop: 14 }} />
    </GlassCard>
  );
}

function FeedSkeleton() {
  return (
    <div className={styles.feed} aria-hidden="true">
      {[1, 0.7].map((opacity) => (
        <GlassCard key={opacity} style={{ opacity }}>
          <div className={styles.skeletonRow}>
            <Skeleton width={38} height={38} radius={19} />
            <div className={styles.skeletonCol}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="65%" height={12} />
            </div>
            <Skeleton width={54} height={54} radius={13} />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function ForbiddenScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <>
      <AppHeader variant="nested" title={t.forbidden.title} />
      <Page className={styles.forbidden}>
        <span className={styles.forbiddenIcon}>
          <IconLockKeyhole size={42} />
        </span>
        <h1 className={styles.forbiddenTitle}>{t.forbidden.title}</h1>
        <p className={styles.forbiddenDesc}>{t.forbidden.desc}</p>
        <Button
          variant="secondary"
          icon={<IconKey size={15} />}
          onClick={() => navigate({ to: "/join", search: { code: undefined } })}
        >
          {t.forbidden.haveCode}
        </Button>
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          {t.forbidden.toRooms}
        </Button>
      </Page>
    </>
  );
}
