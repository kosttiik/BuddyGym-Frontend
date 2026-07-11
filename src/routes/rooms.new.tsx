import { createFileRoute } from "@tanstack/react-router";
import { CreateRoomPage } from "@/pages/rooms/CreateRoomPage";

export const Route = createFileRoute("/rooms/new")({
  component: CreateRoomPage,
});
