import { render, screen } from "@testing-library/react";
import { resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";
import { App, rankOf } from "./App";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
});
afterAll(() => server.close());

test("boots, silently authenticates and shows the rooms list", async () => {
  window.history.replaceState(null, "", "/");
  render(<App />);
  expect(await screen.findByText("My rooms", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(await screen.findByText("Железные братья", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(screen.getByText("Утренние тренировки")).toBeInTheDocument();
});

/* An unlisted route falls back to a shallow rank, so the boards used to page backwards on the
   way in. Every nested room screen must sit deeper than the room itself. */
test("the boards page deeper than the room they belong to", () => {
  const room = rankOf("/rooms/2");
  expect(rankOf("/rooms/2/board")).toBeGreaterThan(room);
  expect(rankOf("/rooms/2/members")).toBeGreaterThan(room);
});
