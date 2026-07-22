import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useRoomCheckins } from "@/entities/checkin";
import { useRoom } from "@/entities/room";
import { useMe } from "@/entities/user";
import { CheckinSheet } from "@/features/checkin/CheckinSheet";
import { MembershipSheet } from "@/features/membership/MembershipSheet";
import { ApiError } from "@/shared/api/client";
import type { Checkin, CheckinStatus, Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import {
  IconChevronRight,
  IconCloudOff,
  IconDumbbell,
  IconKey,
  IconLockKeyhole,
  IconPerson,
  IconShare,
  IconSliders,
  IconTrophy,
} from "@/shared/icons";
import { PulseDots } from "@/shared/icons/animated";
import { hapticSelection } from "@/shared/lib/haptics";
import { spring, stagger } from "@/shared/lib/motion";
import { markSeen, unreadCount } from "@/shared/lib/seenTabs";
import {
  AppHeader,
  AvatarStack,
  Badge,
  Banner,
  Button,
  GlassCard,
  Page,
  PullToRefresh,
  RoomAvatar,
  Skeleton,
} from "@/shared/ui";
import { CheckinCard } from "./CheckinCard";
import { PhotoViewer } from "./PhotoViewer";
import { RoomGallery } from "./RoomGallery";
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
  enter: (dir: number) => ({ opacity: 0, x: dir * 18 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
  },
};

const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 420;

export function RoomPage() {
  const { roomId } = useParams({ from: "/rooms/$roomId" });
  const id = Number(roomId);
  const { t } = useI18n();
  const room = useRoom(id);
  const me = useMe();
  const reduceMotion = useReducedMotion();
  const [{ tab, dir }, setTabState] = useState<{ tab: CheckinStatus; dir: number }>({
    tab: "pending",
    dir: 1,
  });
  const allCheckins = useRoomCheckins(id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [viewer, setViewer] = useState<{ checkin: Checkin; comments: boolean } | null>(null);
  const [edgeSwipe, setEdgeSwipe] = useState(false);

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

  const members = useMemo(() => {
    const map = new Map<number, Member>();
    for (const m of room.data?.members ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [room.data]);

  const myMembership = me.data ? members.get(me.data.user.id) : undefined;

  const byStatus = useMemo(() => {
    const groups: Record<CheckinStatus, Checkin[]> = {
      pending: [],
      approved: [],
      rejected: [],
      expired: [],
    };
    for (const checkin of allCheckins.data ?? []) {
      groups[checkin.status]?.push(checkin);
    }
    return groups;
  }, [allCheckins.data]);

  const visible = allCheckins.isSuccess ? byStatus[tab] : [];

  useEffect(() => {
    if (allCheckins.isSuccess) {
      markSeen(id, tab, byStatus[tab].length);
    }
  }, [id, tab, byStatus, allCheckins.isSuccess]);

  const forbidden = room.isError && room.error instanceof ApiError && room.error.status === 403;
  const checkinsDown =
    allCheckins.isError &&
    allCheckins.error instanceof ApiError &&
    allCheckins.error.status === 502;

  if (forbidden) {
    return <ForbiddenScreen />;
  }

  const tabs = TAB_ORDER.map((key) => {
    const total = allCheckins.isSuccess ? byStatus[key].length : undefined;
    return {
      key,
      label: {
        pending: t.room.tabPending,
        approved: t.room.tabApproved,
        rejected: t.room.tabRejected,
        expired: t.room.tabExpired,
      }[key],
      count: total,
      unread: total === undefined ? 0 : unreadCount(id, key, total),
    };
  });

  return (
    <PullToRefresh onRefresh={() => Promise.all([room.refetch(), allCheckins.refetch()])}>
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
              isCreator={room.data.room.creator_id === me.data?.user.id}
              onShare={() => setShareOpen(true)}
              onOpenGallery={() => setGalleryOpen(true)}
              onOpenMySettings={myMembership ? () => setMembershipOpen(true) : undefined}
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
              unread={item.unread}
              active={tab === item.key}
              onClick={() => selectTab(item.key)}
            />
          ))}
        </div>

        <div
          className={styles.panelViewport}
          onTouchStartCapture={(event) => {
            /* a drag that starts at the edge is the back gesture, not a tab swipe */
            setEdgeSwipe((event.touches[0]?.clientX ?? 99) <= 28);
          }}
        >
          <motion.div
            /* swipe the feed sideways to walk the tabs, like Telegram's own chat lists */
            drag={reduceMotion || edgeSwipe ? false : "x"}
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
            <motion.div
              key={tab}
              role="tabpanel"
              custom={dir}
              variants={panelVariants}
              initial="enter"
              animate="center"
            >
              {allCheckins.isPending && !checkinsDown && <FeedSkeleton />}

              {allCheckins.isSuccess && visible.length === 0 && (
                <div className={styles.emptyFeed}>
                  <span className={styles.emptyFeedIcon}>
                    <PulseDots size={26} />
                  </span>
                  <p className={styles.emptyFeedTitle}>{t.room.emptyFeed}</p>
                  <p className={styles.emptyFeedHint}>{t.room.emptyFeedHint}</p>
                </div>
              )}

              {allCheckins.isSuccess && visible.length > 0 && (
                <motion.div
                  className={styles.feed}
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {visible.map((checkin) => (
                    <motion.div key={checkin.id} variants={feedItem}>
                      <CheckinCard
                        checkin={checkin}
                        author={members.get(checkin.user_id)}
                        isMine={checkin.user_id === me.data?.user.id}
                        roomId={id}
                        disabled={checkinsDown}
                        onOpenPhoto={(options) =>
                          setViewer({ checkin, comments: options?.comments ?? false })
                        }
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
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
          members={[...members.values()].filter((m) => m.id !== me.data?.user.id)}
          myProgress={me.data ? (members.get(me.data.user.id)?.workouts_count ?? 0) : 0}
        />
      )}

      {room.isSuccess && myMembership && (
        <MembershipSheet
          room={room.data.room}
          member={myMembership}
          open={membershipOpen}
          onClose={() => setMembershipOpen(false)}
        />
      )}

      <AnimatePresence>
        {galleryOpen && room.isSuccess && (
          <RoomGallery
            roomId={id}
            roomName={room.data.room.name}
            members={[...members.values()]}
            myId={me.data?.user.id}
            isCreator={room.data.room.creator_id === me.data?.user.id}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewer && (
          <PhotoViewer
            checkin={viewer.checkin}
            author={members.get(viewer.checkin.user_id)}
            isMine={viewer.checkin.user_id === me.data?.user.id}
            roomId={id}
            myId={me.data?.user.id}
            canModerate={room.data?.room.creator_id === me.data?.user.id}
            withComments={viewer.comments}
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
  unread,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  unread: number;
  active: boolean;
  onClick: () => void;
}) {
  const hasUnread = !active && unread > 0;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={styles.tabPill}
      data-active={active || undefined}
      onClick={onClick}
    >
      {active && (
        <motion.span
          layoutId="room-tab-pill"
          className={styles.tabPillBg}
          style={{ borderRadius: 999 }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
        />
      )}
      <span className={styles.tabPillLabel}>
        {label}
        {count !== undefined && count > 0 && (
          <span className={styles.tabPillCount} data-unread={hasUnread || undefined}>
            {formatCount(hasUnread ? unread : count)}
          </span>
        )}
      </span>
    </button>
  );
}

function formatCount(value: number): string {
  return value > 99 ? "99+" : String(value);
}

function RoomHeaderCard({
  detail,
  isCreator,
  onShare,
  onOpenGallery,
  onOpenMySettings,
}: {
  detail: { room: import("@/shared/api/types").Room; members: Member[] };
  isCreator: boolean;
  onShare: () => void;
  onOpenGallery: () => void;
  onOpenMySettings?: () => void;
}) {
  const { t } = useI18n();
  const { room, members } = detail;

  return (
    <GlassCard className={styles.header}>
      <div className={styles.headerTop}>
        <RoomAvatar
          roomId={room.id}
          name={room.name}
          hasAvatar={room.has_avatar}
          size={46}
          onClick={onOpenGallery}
          label={t.gallery.open}
        />
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
              hasAvatar: m.has_avatar,
            }))}
          />
        </Link>
        <div className={styles.headerActions}>
          {onOpenMySettings && (
            <motion.button
              type="button"
              className={styles.settingsPill}
              aria-label={t.room.mySettings}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              onClick={onOpenMySettings}
            >
              <IconPerson size={16} />
            </motion.button>
          )}
          {isCreator && (
            <Link
              to="/rooms/$roomId/edit"
              params={{ roomId: String(room.id) }}
              className={styles.settingsPill}
              aria-label={t.room.settings}
            >
              <IconSliders size={16} />
            </Link>
          )}
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
              <IconShare size={17} />
            </motion.button>
          )}
        </div>
      </div>

      <Link
        to="/rooms/$roomId/board"
        params={{ roomId: String(room.id) }}
        className={styles.boardsLink}
      >
        <IconTrophy size={16} />
        {t.board.open}
        <IconChevronRight size={15} className={styles.boardsChevron} />
      </Link>
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
