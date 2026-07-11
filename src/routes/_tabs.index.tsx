import { createFileRoute } from "@tanstack/react-router";
import { RoomsPage } from "@/pages/rooms/RoomsPage";

export const Route = createFileRoute("/_tabs/")({
  component: RoomsPage,
});
