import { createFileRoute } from "@tanstack/react-router";
import { openRoomsQueryOptions } from "@/entities/room";
import { OpenRoomsPage } from "@/pages/rooms/OpenRoomsPage";

export const Route = createFileRoute("/rooms/open")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(openRoomsQueryOptions());
  },
  component: OpenRoomsPage,
});
