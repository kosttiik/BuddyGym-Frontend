import { render, screen } from "@testing-library/react";
import { resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";
import { App } from "./App";

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
