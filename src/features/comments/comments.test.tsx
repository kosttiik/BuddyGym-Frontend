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

async function openPhoto() {
  window.history.replaceState(null, "", "/rooms/2");
  render(<App />);
  const thumbs = await screen.findAllByRole("button", { name: "Марина" }, { timeout: 4000 });
  await userEvent.click(thumbs[thumbs.length - 1] as HTMLElement);
}

test("a comment can be written from the photo and lands in the thread", async () => {
  await openPhoto();

  await userEvent.click(await screen.findByText("Leave a comment"));
  await userEvent.type(screen.getByPlaceholderText("Write something..."), "Красавчик");
  await userEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByText("Красавчик")).toBeInTheDocument();
});

/* The heart is a toggle, not a counter: tapping twice must land back on zero. */
test("the heart toggles the like and the count follows", async () => {
  const checkin = db.checkins.find((c) => c.room_id === 2);
  db.comments.set(checkin?.id ?? "", [
    {
      id: 1,
      checkin_id: checkin?.id ?? "",
      user_id: 3,
      author: db.users.get(3) ?? db.me,
      body: "мем",
      has_photo: false,
      likes: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    },
  ]);

  await openPhoto();
  // the top comment rides on the photo; tapping it opens the whole thread
  await userEvent.click(await screen.findByText("мем"));

  const like = await screen.findByRole("button", { name: "Like" });
  expect(like).toHaveAttribute("aria-pressed", "false");

  await userEvent.click(like);
  expect(await within(like).findByText("1")).toBeInTheDocument();
  expect(like).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(like);
  expect(like).toHaveAttribute("aria-pressed", "false");
});
