import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";
import { resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
});
afterAll(() => server.close());

test("opens another member's public profile", async () => {
  window.history.replaceState(null, "", "/users/2");
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Марина" }, { timeout: 4000 }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Achievements", {}, { timeout: 4000 })).toBeInTheDocument();
});

test("shows an error state for an unknown user", async () => {
  window.history.replaceState(null, "", "/users/999999");
  render(<App />);
  expect(
    await screen.findByText("Something went wrong", {}, { timeout: 4000 }),
  ).toBeInTheDocument();
});
