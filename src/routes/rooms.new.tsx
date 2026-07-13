import { createFileRoute } from "@tanstack/react-router";
import { CreateRoomPage } from "@/pages/rooms/RoomFormPage";

export const Route = createFileRoute("/rooms/new")({
  component: CreateRoomPage,
});
