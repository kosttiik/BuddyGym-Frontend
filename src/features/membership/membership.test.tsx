import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app/App";
import { db, resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
  try {
    window.localStorage.clear();
  } catch {
    /* localStorage may be missing in the test environment */
  }
});
afterAll(() => server.close());

async function openMySettings() {
  window.history.replaceState(null, "", "/rooms/1");
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: /My settings/ }, { timeout: 4000 }),
  );
}

test("a member sets their own sport, badge and goal", async () => {
  await openMySettings();

  await userEvent.type(await screen.findByLabelText("Sport"), "climbing");
  await userEvent.click(screen.getByRole("button", { name: "🧗" }));

  const goal = screen.getByRole("textbox", { name: "My goal" });
  await userEvent.clear(goal);
  await userEvent.type(goal, "2");
  await userEvent.tab();

  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  const me = db.members.get(1)?.find((m) => m.id === db.me.id);
  expect(me?.sport_name).toBe("climbing");
  expect(me?.sport_emoji).toBe("🧗");
  expect(me?.goal_per_period).toBe(2);
  expect(me?.effective_goal).toBe(2);
});

test("a freeze can be scheduled and lifted again", async () => {
  await openMySettings();

  /* the freeze lives in its own sheet now: the settings row opens it */
  await userEvent.click(await screen.findByRole("button", { name: /Freeze/ }));
  await userEvent.click(await screen.findByRole("button", { name: "Freeze" }));
  expect(await screen.findByText("Freeze is on")).toBeInTheDocument();
  expect(db.members.get(1)?.find((m) => m.id === db.me.id)?.freeze).toBeDefined();

  await userEvent.click(await screen.findByRole("button", { name: /Freeze/ }));
  await userEvent.click(await screen.findByRole("button", { name: "Unfreeze" }));
  expect(await screen.findByText("Freeze removed")).toBeInTheDocument();
  expect(db.members.get(1)?.find((m) => m.id === db.me.id)?.freeze).toBeUndefined();
});
