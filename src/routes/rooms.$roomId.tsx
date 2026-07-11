import { createFileRoute } from "@tanstack/react-router";
import { checkinsQueryOptions } from "@/entities/checkin";
import { roomQueryOptions } from "@/entities/room";
import { RoomPage } from "@/pages/room/RoomPage";

export const Route = createFileRoute("/rooms/$roomId")({
  loader: ({ context, params }) => {
    const id = Number(params.roomId);
    void context.queryClient.prefetchQuery(roomQueryOptions(id));
    void context.queryClient.prefetchQuery(checkinsQueryOptions(id, "pending"));
  },
  component: RoomPage,
});
