import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Achievements } from "@/pages/profile/Achievements";
import { RankBadge } from "@/pages/profile/ProfileBody";
import type { Achievement } from "@/shared/api/types";
import { type Dictionary, useI18n } from "@/shared/i18n";
import {
  IconCamera,
  IconCheck,
  IconComment,
  IconCross,
  IconDumbbell,
  IconGeoPinFilled,
  IconKey,
  IconLock,
  IconPerson,
  IconPlus,
  IconRooms,
  IconUsers,
} from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import {
  Avatar,
  Badge,
  Button,
  GlassCard,
  ProgressCounter,
  SegmentedProgress,
  StreakFlame,
} from "@/shared/ui";
import styles from "./mocks.module.css";

const NATURAL_W = 360;
const NATURAL_H = 590;

export function DeviceFrame({ width = 240, children }: { width?: number; children: ReactNode }) {
  const scale = width / NATURAL_W;
  return (
    <div className={styles.frame} style={{ width, height: NATURAL_H * scale }} aria-hidden="true">
      <div className={styles.screen} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

export function Spotlight({
  pill,
  arrow,
  className,
  children,
}: {
  pill?: boolean;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={cx(styles.spotlight, className)}>
      {children}
      <motion.span
        className={styles.ring}
        style={pill ? { borderRadius: 999 } : undefined}
        animate={reduce ? undefined : { scale: [1, 1.04, 1], opacity: [1, 0.55, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {arrow && <Arrow />}
    </span>
  );
}

function Arrow() {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      className={styles.spotArrow}
      viewBox="0 0 48 48"
      width={48}
      height={48}
      fill="none"
      animate={reduce ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M41 7C29 10.5 16.5 21 12.5 37"
        stroke="var(--red-text)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M6 30.5L12.5 37.5L21 33.5"
        stroke="var(--red-text)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

function person(t: Dictionary, index: number) {
  return { id: index + 1, name: t.onboarding.mockPeople[index] ?? "" };
}

function MockRoomCard({
  name,
  streak,
  open,
  members,
  workouts,
  goal,
}: {
  name: string;
  streak: number;
  open?: boolean;
  members: number;
  workouts: number;
  goal: number;
}) {
  const { t } = useI18n();
  return (
    <GlassCard>
      <div className={styles.cardTop}>
        <span className={styles.roomName}>{name}</span>
        <span className={styles.cardTags}>
          <StreakFlame streak={streak} />
          <Badge tone={open ? "green" : "purple"}>
            {open ? t.rooms.openBadge : t.rooms.inviteBadge}
          </Badge>
        </span>
      </div>
      <p className={styles.roomMeta}>
        {t.rooms.members(members)} · {t.rooms.goalMeta(goal, 7)}
      </p>
      <div className={styles.progressRow}>
        <SegmentedProgress value={workouts} goal={goal} />
        <ProgressCounter value={workouts} goal={goal} />
      </div>
    </GlassCard>
  );
}

export function MockRooms() {
  const { t } = useI18n();
  return (
    <DeviceFrame>
      <div className={styles.header}>
        <span className={styles.mark}>
          <IconDumbbell size={19} />
        </span>
        <span className={styles.wordmark}>{t.common.appName}</span>
      </div>
      <div className={styles.pageTitle}>{t.rooms.title}</div>
      <MockRoomCard
        name={t.onboarding.mockRoomA}
        streak={12}
        open
        members={4}
        workouts={4}
        goal={5}
      />
      <MockRoomCard name={t.onboarding.mockRoomB} streak={5} members={3} workouts={2} goal={6} />
      <div className={styles.ctaRow}>
        <Spotlight pill arrow className={styles.ctaSpan}>
          <Button block icon={<IconPlus size={15} />}>
            {t.rooms.create}
          </Button>
        </Spotlight>
        <Button variant="secondary" icon={<IconUsers size={15} />}>
          {t.rooms.browseOpen}
        </Button>
        <Button variant="secondary" icon={<IconKey size={15} />}>
          {t.rooms.byCode}
        </Button>
      </div>
      <MockNav />
    </DeviceFrame>
  );
}

function MockNav() {
  const { t } = useI18n();
  return (
    <div className={styles.nav}>
      <div className={styles.navPill}>
        <span className={cx(styles.navTab, styles.navTabActive)}>
          <IconRooms size={18} />
          {t.tabs.rooms}
        </span>
        <span className={styles.navTab}>
          <IconPerson size={18} />
          {t.tabs.profile}
        </span>
      </div>
    </div>
  );
}

export function MockCheckin() {
  const { t } = useI18n();
  const author = person(t, 1);
  const geoAuthor = person(t, 2);
  return (
    <DeviceFrame>
      <div className={styles.nestedTitle}>{t.onboarding.mockRoomA}</div>
      <GlassCard className={styles.checkinCard}>
        <div className={styles.checkinTop}>
          <Avatar name={author.name} seed={author.id} size={38} />
          <div className={styles.who}>
            <span className={styles.checkinName}>{author.name}</span>
            <span className={styles.checkinMeta}>
              {t.room.today} · {t.room.timeLeft(20)}
            </span>
          </div>
          <span className={styles.thumb}>
            <IconCamera size={20} />
          </span>
          <span className={styles.commentsPill}>
            <IconComment size={13} />
            <span>2</span>
          </span>
        </div>
        <div className={styles.votes}>
          <span className={styles.votesBar}>
            <span className={styles.votesFill} style={{ width: "66%" }} />
          </span>
          <span className={styles.votesLabel}>{t.room.votesFor(2, 3)}</span>
        </div>
        <div className={styles.voteActions}>
          <Button
            variant="tint"
            size="sm"
            icon={<IconCheck size={14} />}
            className={styles.voteAction}
          >
            {t.room.confirm}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            icon={<IconCross size={13} />}
            className={styles.voteAction}
          >
            {t.room.reject}
          </Button>
        </div>
      </GlassCard>
      <GlassCard className={styles.checkinCard}>
        <div className={styles.checkinTop}>
          <Avatar name={geoAuthor.name} seed={geoAuthor.id} size={38} />
          <div className={styles.who}>
            <span className={styles.checkinName}>{geoAuthor.name}</span>
            <span className={styles.checkinMeta}>{t.room.yesterday}</span>
          </div>
          <Badge tone="green" icon={<IconGeoPinFilled size={11} />}>
            {t.room.geoApproved}
          </Badge>
        </div>
      </GlassCard>
      <div className={styles.ctaRow}>
        <Spotlight pill arrow className={styles.ctaSpan}>
          <Button block icon={<IconDumbbell size={17} />}>
            {t.room.checkinCta}
          </Button>
        </Spotlight>
      </div>
    </DeviceFrame>
  );
}

const FAKE_ACHIEVEMENTS: Achievement[] = [
  { key: "first_checkin", current: 1, target: 1, granted_at: "2026-07-01T10:00:00Z" },
  { key: "streak_7", current: 7, target: 7, granted_at: "2026-07-10T10:00:00Z" },
  { key: "workouts_50", current: 23, target: 50 },
];

export function MockProfile() {
  const { t } = useI18n();
  const me = person(t, 0);
  return (
    <DeviceFrame>
      <div className={styles.profileHead}>
        <Avatar name={me.name} seed={me.id} size={84} />
        <span className={styles.profileName}>{me.name}</span>
        <span className={styles.headTags}>
          <RankBadge rank="regular" label={t.members.statusRegular} />
          <StreakFlame streak={9} />
        </span>
      </div>
      <Spotlight arrow className={styles.achSpot}>
        <Achievements achievements={FAKE_ACHIEVEMENTS} />
      </Spotlight>
      <div className={styles.themeTitle}>{t.profile.theme}</div>
      <div className={styles.themes}>
        <MockSwatch kind="light" label={t.profile.themeLight} selected />
        <MockSwatch kind="dark" label={t.profile.themeDark} />
        <MockSwatch kind="neon" label={t.profile.themeSoon} locked />
      </div>
    </DeviceFrame>
  );
}

function MockSwatch({
  kind,
  label,
  selected,
  locked,
}: {
  kind: "light" | "dark" | "neon";
  label: string;
  selected?: boolean;
  locked?: boolean;
}) {
  const preview = {
    light: styles.previewLight,
    dark: styles.previewDark,
    neon: styles.previewNeon,
  }[kind];
  return (
    <span className={cx(styles.swatch, locked && styles.lockedSwatch)}>
      <span className={cx(styles.swatchPreview, preview, selected && styles.swatchSelected)}>
        <span className={styles.previewStripe} />
        <span className={styles.previewButton} />
        {locked && (
          <span className={styles.swatchLock}>
            <IconLock size={14} />
          </span>
        )}
      </span>
      <span className={styles.swatchLabel}>{label}</span>
    </span>
  );
}
