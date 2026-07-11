import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "@/pages/room/MembersPage";

export const Route = createFileRoute("/rooms/$roomId_/members")({
  component: MembersPage,
});
