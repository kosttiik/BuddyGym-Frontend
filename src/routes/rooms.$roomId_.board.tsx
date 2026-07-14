import { createFileRoute } from "@tanstack/react-router";
import { BoardPage } from "@/pages/room/BoardPage";

export const Route = createFileRoute("/rooms/$roomId_/board")({
  component: BoardPage,
});
