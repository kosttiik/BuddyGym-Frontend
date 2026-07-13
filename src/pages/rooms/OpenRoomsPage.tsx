import { useNavigate } from "@tanstack/react-router";
import { useJoinRoom, useOpenRooms } from "@/entities/room";
import type { Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconGlobe, IconPlus, IconUsers } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { AppHeader, Badge, Button, GlassCard, Page, PullToRefresh, Skeleton } from "@/shared/ui";
import styles from "./RoomsPage.module.css";

export function OpenRoomsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const rooms = useOpenRooms();
  const join = useJoinRoom();

  const joinRoom = (room: Room) => {
    join.mutate(room.id, {
      onSuccess: () => {
        void navigate({ to: "/rooms/$roomId", params: { roomId: String(room.id) } });
      },
    });
  };

  return (
    <PullToRefresh onRefresh={() => rooms.refetch()}>
      <AppHeader variant="nested" title={t.rooms.open} />
      <Page>
        {rooms.isPending && <OpenRoomsSkeleton />}
        {rooms.isSuccess && rooms.data.length === 0 && (
          <div className={cx(styles.empty, styles.emptyCentered)}>
            <span className={styles.emptyIcon}>
              <IconGlobe size={44} />
            </span>
            <h2 className={styles.emptyTitle}>{t.rooms.noOpen}</h2>
            <p className={styles.emptySubtitle}>{t.rooms.noOpenHint}</p>
            <Button
              className={styles.emptyCta}
              icon={<IconPlus size={15} />}
              onClick={() => navigate({ to: "/rooms/new" })}
            >
              {t.rooms.create}
            </Button>
          </div>
        )}
        {rooms.isSuccess && rooms.data.length > 0 && (
          <div className={styles.list}>
            {rooms.data.map((room) => (
              <GlassCard key={room.id}>
                <div className={styles.cardTop}>
                  <span className={styles.roomName}>{room.name}</span>
                  <Badge tone="green">{t.rooms.openBadge}</Badge>
                </div>
                <p className={styles.roomMeta}>
                  {t.rooms.goalMeta(room.goal_per_period, room.period_days)}
                </p>
                <Button
                  className={styles.openRoomJoin}
                  size="sm"
                  icon={<IconUsers size={14} />}
                  disabled={join.isPending}
                  onClick={() => joinRoom(room)}
                >
                  {t.rooms.join}
                </Button>
              </GlassCard>
            ))}
          </div>
        )}
      </Page>
    </PullToRefresh>
  );
}

function OpenRoomsSkeleton() {
  return (
    <div className={styles.list} aria-hidden="true">
      {[1, 0.7, 0.45].map((opacity) => (
        <GlassCard key={opacity} style={{ opacity }}>
          <div className={styles.cardTop}>
            <Skeleton width="55%" height={17} />
            <Skeleton width={64} height={22} radius={20} />
          </div>
          <Skeleton width="55%" height={13} style={{ marginTop: 10 }} />
          <Skeleton width={86} height={32} radius={10} style={{ marginTop: 14 }} />
        </GlassCard>
      ))}
    </div>
  );
}
