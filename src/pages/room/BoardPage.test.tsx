import { render, screen, within } from "@testing-library/react";
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

/* Room 1 is goal 3 per period: Лера 3 (met it), Костя 2, Дима 1, Паша 0. */
function openBoard() {
  window.history.replaceState(null, "", "/rooms/1/board");
  render(<App />);
}

test("the hall of fame puts the leader on the middle step of the podium", async () => {
  openBoard();

  const podium = await screen.findByTestId("podium", {}, { timeout: 4000 });
  const names = within(podium).getAllByTestId("podium-name");
  // laid out 2-1-3, so the winner stands in the middle
  expect(names).toHaveLength(3);
  expect(names[1]).toHaveTextContent("Лера");
  expect(names[0]).toHaveTextContent("Костя");
  expect(names[2]).toHaveTextContent("Дима");
});

/* The worst now take the podium, so the shame board reads like the honour one, inverted. */
test("the hall of shame puts the worst on the podium and keeps the goal-hitter off it", async () => {
  openBoard();

  await userEvent.click(
    await screen.findByRole("radio", { name: "Hall of shame" }, { timeout: 4000 }),
  );

  const podium = await screen.findByTestId("podium");
  const names = within(podium).getAllByTestId("podium-name");

  // Лера hit the goal of 3, so the board has nothing on her
  expect(podium).not.toHaveTextContent("Лера");
  // laid out 2-1-3, so the worst stands in the middle
  expect(names[1]).toHaveTextContent("Паша");
  expect(within(podium).getAllByText(/0\/3|1\/3|2\/3/).length).toBeGreaterThan(0);
  // the status rides the avatar here too, so the medal must not sit on the same corner
  expect(within(podium).getByRole("button", { name: "Отдыхаю" })).toBeInTheDocument();
});
