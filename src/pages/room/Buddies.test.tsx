import { render, screen, within } from "@testing-library/react";
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

function tagBuddiesOnFirstCheckin(names: string[]) {
  const members = db.members.get(2) ?? [];
  const first = db.checkins.find((c) => c.room_id === 2);
  if (first) {
    first.buddies = members.filter((m) => names.includes(m.first_name));
  }
}

test("the checkin card shows who trained with the author", async () => {
  tagBuddiesOnFirstCheckin(["Дима"]);
  window.history.replaceState(null, "", "/rooms/2");
  render(<App />);

  expect(await screen.findByText("with Дима", {}, { timeout: 4000 })).toBeInTheDocument();
});

test("the full screen photo shows them too", async () => {
  tagBuddiesOnFirstCheckin(["Дима", "Лера"]);
  window.history.replaceState(null, "", "/rooms/2");
  render(<App />);

  const thumbs = await screen.findAllByRole("button", { name: "Марина" }, { timeout: 4000 });
  await userEvent.click(thumbs[thumbs.length - 1] as HTMLElement);

  expect(await screen.findByText("with Дима and 1 more")).toBeInTheDocument();
});

test("tapping the buddies opens who trained together, with their statuses", async () => {
  tagBuddiesOnFirstCheckin(["Дима"]);
  window.history.replaceState(null, "", "/rooms/2");
  render(<App />);

  await userEvent.click(await screen.findByText("with Дима", {}, { timeout: 4000 }));

  const sheet = await screen.findByRole("dialog", { name: "Trained together" });
  expect(within(sheet).getByText("Дима")).toBeInTheDocument();
  // the status rides along, that is the point of opening it
  expect(within(sheet).getByText("Травма")).toBeInTheDocument();
});
