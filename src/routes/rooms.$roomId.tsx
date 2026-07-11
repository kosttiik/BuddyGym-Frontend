import { createFileRoute } from "@tanstack/react-router";
import { RoomPage } from "@/pages/room/RoomPage";

export const Route = createFileRoute("/rooms/$roomId")({
  component: RoomPage,
});
