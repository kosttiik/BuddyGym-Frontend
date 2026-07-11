import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/shared/ui";

export const Route = createFileRoute("/_tabs")({
  component: TabsLayout,
});

function TabsLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
