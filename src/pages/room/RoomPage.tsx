import { useParams } from "@tanstack/react-router";
import { useRoom } from "@/entities/room";
import { useI18n } from "@/shared/i18n";
import { AppHeader, Page, Skeleton } from "@/shared/ui";

export function RoomPage() {
  const { roomId } = useParams({ from: "/rooms/$roomId" });
  const room = useRoom(Number(roomId));
  const { t } = useI18n();

  return (
    <>
      <AppHeader variant="nested" title={room.data?.room.name ?? t.common.appName} />
      <Page>{room.isPending && <Skeleton width="100%" height={120} radius={20} />}</Page>
    </>
  );
}
