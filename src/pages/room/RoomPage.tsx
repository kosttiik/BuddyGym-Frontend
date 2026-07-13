import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useMemo, useState } from "react";
import { useRoomCheckins } from "@/entities/checkin";
import { useLeaveRoom, useRoom } from "@/entities/room";
import { useMe } from "@/entities/user";
import { CheckinSheet } from "@/features/checkin/CheckinSheet";
import { ApiError } from "@/shared/api/client";
import type { Checkin, CheckinStatus, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import {
  IconCloudOff,
  IconDumbbell,
  IconKey,
  IconLeave,
  IconLockKeyhole,
  IconShare,
} from "@/shared/icons";
import { PulseDots } from "@/shared/icons/animated";
import { hapticNotify, hapticSelection } from "@/shared/lib/haptics";
import { ease, popItem, spring, stagger } from "@/shared/lib/motion";
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
} from "@/shared/ui";
import { CheckinCard } from "./CheckinCard";
import { PhotoViewer } from "./PhotoViewer";
import styles from "./RoomPage.module.css";
import { ShareRoomSheet } from "./ShareRoomSheet";

const TAB_ORDER: CheckinStatus[] = ["pending", "approved", "rejected", "expired"];

const listVariants = stagger(0.055, 0.08);

/* Cards fan in behind the sliding panel, so the switch reads as one motion. */
const feedItem: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.soft,
  },
};

/* The panel travels toward the tab you left: forward tabs enter from the right. */
const panelVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir * 56,
    scale: 0.94,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { ...spring.soft, opacity: { duration: 0.25 } },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -56,
    scale: 0.94,
    transition: { duration: 0.22, ease: ease.exit },
  }),
};

const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 420;

export function RoomPage() {
  const { roomId } = useParams({ from: "/rooms/$roomId" });
  const id = Number(roomId);
  const { t } = useI18n();
  const navigate = useNavigate();
  const room = useRoom(id);
  const me = useMe();
  const leaveRoom = useLeaveRoom();
  const reduceMotion = useReducedMotion();
  const [{ tab, dir }, setTabState] = useState<{ tab: CheckinStatus; dir: number }>({
    tab: "pending",
    dir: 1,
  });
  const checkins = useRoomCheckins(id, tab);
  const pendingCheckins = useRoomCheckins(id, "pending");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewer, setViewer] = useState<Checkin | null>(null);

  const selectTab = (next: CheckinStatus) => {
    if (next === tab) {
      return;
    }
    hapticSelection();
    setTabState({ tab: next, dir: TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1 });
  };

  const shiftTab = (delta: number) => {
    const next = TAB_ORDER[TAB_ORDER.indexOf(tab) + delta];
    if (next) {
      selectTab(next);
    }
  };

  const leave = () => {
    leaveRoom.mutate(id, {
      onSuccess: () => {
        hapticNotify("warning");
        void navigate({ to: "/", replace: true });
      },
    });
  };

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
        {room.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
          >
            <RoomHeaderCard
              detail={room.data}
              leaving={leaveRoom.isPending}
              onLeave={leave}
              onShare={() => setShareOpen(true)}
            />
          </motion.div>
        )}

        {checkinsDown && (
          <Banner
            icon={<IconCloudOff size={20} />}
            title={t.errors.checkinsUnavailable}
            description={t.errors.checkinsUnavailableDesc}
          />
        )}

        <div className={styles.tabs} role="tablist">
          {tabs.map((item) => (
            <TabPill
              key={item.key}
              label={item.label}
              count={item.count}
              active={tab === item.key}
              onClick={() => selectTab(item.key)}
            />
          ))}
        </div>

        <div className={styles.panelViewport}>
          <motion.div
            /* swipe the feed sideways to walk the tabs, like Telegram's own chat lists */
            drag={reduceMotion ? false : "x"}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
              const fast =
                Math.abs(info.velocity.x) > SWIPE_VELOCITY && Math.abs(info.offset.x) > 8;
              if (far || fast) {
                shiftTab(info.offset.x < 0 ? 1 : -1);
              }
            }}
          >
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={tab}
                role="tabpanel"
                custom={dir}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {checkins.isPending && !checkinsDown && <FeedSkeleton />}

                {checkins.isSuccess && checkins.data.length === 0 && (
                  <div className={styles.emptyFeed}>
                    <span className={styles.emptyFeedIcon}>
                      <PulseDots size={26} />
                    </span>
                    <p className={styles.emptyFeedTitle}>{t.room.emptyFeed}</p>
                    <p className={styles.emptyFeedHint}>{t.room.emptyFeedHint}</p>
                  </div>
                )}

                {checkins.isSuccess && checkins.data.length > 0 && (
                  <motion.div
                    className={styles.feed}
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {checkins.data.map((checkin) => (
                      <motion.div key={checkin.id} variants={feedItem}>
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
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </Page>

      <motion.div
        className={styles.ctaWrap}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.12 }}
      >
        <Button
          block
          icon={<IconDumbbell size={17} />}
          disabled={checkinsDown || !room.isSuccess}
          onClick={() => setSheetOpen(true)}
        >
          {t.room.checkinCta}
        </Button>
      </motion.div>

      {room.isSuccess && room.data.room.invite_code && (
        <ShareRoomSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          room={room.data.room}
        />
      )}

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
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      className={styles.tabPill}
      data-active={active || undefined}
      whileTap={{ scale: 0.94 }}
      transition={spring.snappy}
      onClick={onClick}
    >
      {active && (
        <>
          <motion.span
            layoutId="room-tab-glow"
            className={styles.tabPillGlow}
            transition={spring.snappy}
          />
          <motion.span
            layoutId="room-tab-pill"
            className={styles.tabPillBg}
            transition={spring.snappy}
          />
        </>
      )}
      <span className={styles.tabPillLabel}>
        <motion.span layout="position" transition={spring.snappy}>
          {label}
        </motion.span>
        <AnimatePresence mode="popLayout" initial={false}>
          {count !== undefined && count > 0 && (
            <motion.span
              key={count}
              className={styles.tabPillCount}
              variants={popItem}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.6 }}
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

function RoomHeaderCard({
  detail,
  leaving,
  onLeave,
  onShare,
}: {
  detail: { room: import("@/shared/api/types").Room; members: Member[] };
  leaving: boolean;
  onLeave: () => void;
  onShare: () => void;
}) {
  const { t } = useI18n();
  const { room, members } = detail;

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
        <div className={styles.headerActions}>
          {room.invite_code && (
            <motion.button
              type="button"
              className={styles.codePill}
              aria-label={t.share.title}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              onClick={onShare}
            >
              <span className={styles.code}>{room.invite_code}</span>
              <IconShare size={14} />
            </motion.button>
          )}
          <Button
            variant="destructive"
            size="sm"
            icon={<IconLeave size={15} />}
            disabled={leaving}
            onClick={onLeave}
          >
            {t.members.leave}
          </Button>
        </div>
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
