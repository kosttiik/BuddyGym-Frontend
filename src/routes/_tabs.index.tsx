import { createFileRoute } from "@tanstack/react-router";
import { roomsQueryOptions } from "@/entities/room";
import { RoomsPage } from "@/pages/rooms/RoomsPage";

export const Route = createFileRoute("/_tabs/")({
  /* fire-and-forget prefetch: navigation stays instant, skeletons cover the rest */
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(roomsQueryOptions());
  },
  component: RoomsPage,
});
