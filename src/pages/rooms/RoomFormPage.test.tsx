import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { App, queryClient } from "@/app/App";
import { resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
  queryClient.clear();
});
afterAll(() => server.close());

function open(path: string) {
  window.history.replaceState(null, "", path);
  render(<App />);
}

test("open rooms list hides the rooms I am already in", async () => {
  open("/rooms/open");
  expect(await screen.findByText("Клуб новичков", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(screen.queryByText("Утренние тренировки")).not.toBeInTheDocument();
  expect(screen.queryByText("Большая цель")).not.toBeInTheDocument();
});

test("with no joinable rooms the open list shows the empty state", async () => {
  server.use(http.get("/api/v1/rooms/open", () => HttpResponse.json([])));
  open("/rooms/open");
  expect(await screen.findByText("No open rooms yet", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Create room/ })).toBeInTheDocument();
});

test("the creator edits the room settings and the room reflects them", async () => {
  open("/rooms/1/edit");

  const name = await screen.findByDisplayValue("Утренние тренировки", {}, { timeout: 4000 });
  expect(name).toBeInTheDocument();

  const [goalPlus] = screen.getAllByRole("button", { name: "+" });
  await userEvent.click(goalPlus as HTMLElement);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Settings saved", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(await screen.findByText(/Goal 4 \/ 7 days/, {}, { timeout: 4000 })).toBeInTheDocument();
});

test("a non-creator cannot edit the room settings", async () => {
  open("/rooms/2/edit");
  expect(
    await screen.findByText(
      "Only the room creator can change these settings",
      {},
      { timeout: 4000 },
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
});
