import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app/App";
import { resetDb } from "@/mocks/handlers";
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

function openProfile() {
  window.history.replaceState(null, "", "/profile");
  render(<App />);
}

test("a member with no status is offered to write one, and a preset saves it", async () => {
  openProfile();

  await userEvent.click(await screen.findByText("Add a status", {}, { timeout: 4000 }));
  await userEvent.click(await screen.findByRole("button", { name: /Bulking/ }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Bulking")).toBeInTheDocument();
  expect(screen.queryByText("Add a status")).not.toBeInTheDocument();
});

/* The rank is derived from workouts: the profile must not offer it as something to pick. */
test("the derived rank still shows next to the name", async () => {
  openProfile();
  expect(await screen.findByText("Athlete", {}, { timeout: 4000 })).toBeInTheDocument();
});
