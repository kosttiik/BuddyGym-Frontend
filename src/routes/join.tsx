import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "@/pages/rooms/JoinPage";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: JoinPage,
});
