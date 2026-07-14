import { render, screen, waitFor } from "@testing-library/react";
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

function openRoom(path: string) {
  window.history.replaceState(null, "", path);
  render(<App />);
}

test("shows the room header, meta and pending checkins", async () => {
  openRoom("/rooms/2");
  expect(
    await screen.findByRole("heading", { name: "Железные братья" }, { timeout: 4000 }),
  ).toBeInTheDocument();
  expect(await screen.findByText(/Goal 5 \/ 7 days/)).toBeInTheDocument();
  expect(await screen.findByText("K7WM2Q9F")).toBeInTheDocument();
  expect(await screen.findByText("Марина", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(screen.getByText("1 of 2 approvals")).toBeInTheDocument();
});

test("voting approve flips the buttons into the voted state", async () => {
  openRoom("/rooms/2");
  await screen.findByText("Марина", {}, { timeout: 4000 });
  const approveButtons = await screen.findAllByRole("button", { name: "Approve" });
  await userEvent.click(approveButtons[0] as HTMLElement);
  expect(await screen.findByText("You approved", {}, { timeout: 4000 })).toBeInTheDocument();
});

test("invite room for a non-member shows the members-only screen", async () => {
  openRoom("/rooms/99");
  expect(
    await screen.findByRole("heading", { name: "Members only" }, { timeout: 4000 }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /I have a code/ })).toBeInTheDocument();
});

test("switching to another tab swaps the feed panel", async () => {
  openRoom("/rooms/2");
  await screen.findByText("1 of 2 approvals", {}, { timeout: 4000 });

  await userEvent.click(screen.getByRole("tab", { name: /Expired/ }));

  expect(await screen.findByText("expired", {}, { timeout: 4000 })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("1 of 2 approvals")).not.toBeInTheDocument());
  expect(screen.getByRole("tab", { name: /Expired/ })).toHaveAttribute("aria-selected", "true");
});

test("the room code opens the share sheet and copies an invite link", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });

  openRoom("/rooms/2");
  await userEvent.click(
    await screen.findByRole("button", { name: "Invite to the room" }, { timeout: 4000 }),
  );

  await userEvent.click(await screen.findByRole("button", { name: /Copy link/ }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("code=K7WM2Q9F"));

  expect(await screen.findByText("Link copied")).toBeInTheDocument();
});

/* Leaving drops the progress, burns the streak and can delete the room, so it takes a
   confirmation: the button alone must not walk the user out. */
test("leaving from the members screen asks for confirmation, then returns to my rooms", async () => {
  openRoom("/rooms/2/members");
  await userEvent.click(
    await screen.findByRole("button", { name: /Leave room/ }, { timeout: 4000 }),
  );

  expect(await screen.findByRole("dialog", { name: "Leave the room?" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "My rooms" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Leave" }));

  expect(await screen.findByRole("heading", { name: "My rooms" })).toBeInTheDocument();
});

test("members screen lists members with statuses", async () => {
  openRoom("/rooms/2/members");
  expect(await screen.findByText("Members", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(await screen.findByText("Марина", {}, { timeout: 4000 })).toBeInTheDocument();
  expect(screen.getByText("Legend")).toBeInTheDocument();
  expect(screen.getByText("YOU")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Leave room/ })).toBeInTheDocument();
});
