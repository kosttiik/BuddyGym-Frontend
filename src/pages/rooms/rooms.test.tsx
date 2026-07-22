import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";
import { db, resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
});
afterAll(() => server.close());

/* Progress must follow approvals, not submissions: a pending photo is not a workout yet,
   and the bar counts against the member's own goal once they set one. */
test("the room card counts approved workouts against the personal goal", async () => {
  const before = db.progress.get(1) ?? 0;
  const me = db.members.get(1)?.find((m) => m.id === db.me.id);
  if (me) {
    me.goal_per_period = 1;
    me.effective_goal = 1;
  }

  db.checkins.unshift({
    id: "chk-pending-progress",
    room_id: 1,
    user_id: db.me.id,
    status: "pending",
    has_photo: true,
    photo_purged: false,
    votes_approve: 0,
    votes_reject: 0,
    votes_required: 2,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });

  window.history.replaceState(null, "", "/");
  render(<App />);

  await screen.findByText("Утренние тренировки", {}, { timeout: 4000 });
  expect(db.progress.get(1) ?? 0).toBe(before);

  const goals = screen.getAllByText(/goal/).map((el) => el.textContent ?? "");
  expect(goals.some((text) => text.includes("goal 1"))).toBe(true);
});
