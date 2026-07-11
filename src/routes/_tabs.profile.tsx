import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/pages/profile/ProfilePage";

export const Route = createFileRoute("/_tabs/profile")({
  component: ProfilePage,
});
