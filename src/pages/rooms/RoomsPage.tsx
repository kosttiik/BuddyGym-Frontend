import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useRooms } from "@/entities/room";
import type { RoomWithProgress } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconDumbbell, IconKey, IconPlus } from "@/shared/icons";
import { getStartParam } from "@/shared/lib/telegram";
import {
  AppHeader,
  Badge,
  Button,
  CODE_LENGTH,
  GlassCard,
  Page,
  ProgressCounter,
  SegmentedProgress,
  Skeleton,
  sanitizeCode,
} from "@/shared/ui";
import styles from "./RoomsPage.module.css";

const DEEPLINK_KEY = "bg.deeplink.handled";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export function RoomsPage() {
  const { t } = useI18n();
  const rooms = useRooms();
  const navigate = useNavigate();

  /* invite deep link: t.me/...?startapp=CODE opens the join screen prefilled */
  useEffect(() => {
    const raw = getStartParam();
    if (!raw) {
      return;
    }
    const code = sanitizeCode(raw);
    try {
      if (code.length === CODE_LENGTH && !sessionStorage.getItem(DEEPLINK_KEY)) {
        sessionStorage.setItem(DEEPLINK_KEY, "1");
        void navigate({ to: "/join", search: { code } });
      }
    } catch {
      /* without sessionStorage just skip the deep link */
    }
  }, [navigate]);

  return (
    <>
      <AppHeader />
      <Page bottomSpace>
        <h1 className={styles.title}>{t.rooms.title}</h1>

        {rooms.isPending && <RoomsSkeleton />}

        {rooms.isSuccess && rooms.data.length === 0 && <EmptyState />}

        {rooms.isSuccess && rooms.data.length > 0 && (
          <motion.div
            className={styles.list}
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {rooms.data.map((room) => (
              <motion.div key={room.id} variants={itemVariants}>
                <RoomCard room={room} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {rooms.isError && (
          <GlassCard className={styles.errorCard}>
            <p className={styles.errorText}>{t.errors.generic}</p>
            <Button variant="secondary" size="sm" onClick={() => rooms.refetch()}>
              {t.common.retry}
            </Button>
          </GlassCard>
        )}
      </Page>

      <div className={styles.ctaRow}>
        <Button
          className={styles.ctaCreate}
          icon={<IconPlus size={15} />}
          onClick={() => navigate({ to: "/rooms/new" })}
        >
          {t.rooms.create}
        </Button>
        <Button
          variant="secondary"
          className={styles.ctaJoin}
          icon={<IconKey size={15} />}
          onClick={() => navigate({ to: "/join", search: { code: undefined } })}
        >
          {t.rooms.byCode}
        </Button>
      </div>
    </>
  );
}

function RoomCard({ room }: { room: RoomWithProgress }) {
  const { t } = useI18n();
  return (
    <GlassCard className={styles.roomCard}>
      <Link
        to="/rooms/$roomId"
        params={{ roomId: String(room.id) }}
        className={styles.cardLink}
        aria-label={room.name}
      />
      <div className={styles.cardTop}>
        <span className={styles.roomName}>{room.name}</span>
        <Badge tone={room.kind === "open" ? "green" : "purple"}>
          {room.kind === "open" ? t.rooms.openBadge : t.rooms.inviteBadge}
        </Badge>
      </div>
      <p className={styles.roomMeta}>
        {t.rooms.members(room.members_count)} ·{" "}
        {t.rooms.goalMeta(room.goal_per_period, room.period_days)}
      </p>
      <div className={styles.progressRow}>
        <SegmentedProgress value={room.workouts_count} goal={room.goal_per_period} />
        <ProgressCounter value={room.workouts_count} goal={room.goal_per_period} />
      </div>
    </GlassCard>
  );
}

function RoomsSkeleton() {
  return (
    <div className={styles.list} aria-hidden="true">
      {[1, 0.75, 0.5].map((opacity) => (
        <GlassCard key={opacity} style={{ opacity }}>
          <div className={styles.cardTop}>
            <Skeleton width="55%" height={17} />
            <Skeleton width={64} height={22} radius={20} />
          </div>
          <Skeleton width="70%" height={13} style={{ marginTop: 10 }} />
          <Skeleton width="100%" height={12} radius={7} style={{ marginTop: 14 }} />
        </GlassCard>
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();
  const steps = [t.empty.step1, t.empty.step2, t.empty.step3];
  return (
    <motion.div className={styles.empty} variants={listVariants} initial="hidden" animate="visible">
      <motion.span className={styles.emptyIcon} variants={itemVariants}>
        <IconDumbbell size={44} />
      </motion.span>
      <motion.h2 className={styles.emptyTitle} variants={itemVariants}>
        {t.empty.title}
      </motion.h2>
      <motion.p className={styles.emptySubtitle} variants={itemVariants}>
        {t.empty.subtitle}
      </motion.p>
      <div className={styles.steps}>
        {steps.map((step, i) => (
          <motion.div key={step} variants={itemVariants}>
            <GlassCard className={styles.stepRow}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <span className={styles.stepText}>{step}</span>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
