import { createFileRoute } from "@tanstack/react-router";
import { EditRoomPage } from "@/pages/rooms/RoomFormPage";

export const Route = createFileRoute("/rooms/$roomId_/edit")({
  component: EditRoomPage,
});
