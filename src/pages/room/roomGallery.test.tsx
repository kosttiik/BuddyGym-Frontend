import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app/App";
import { db, resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";

/* jsdom cannot decode an image, and the resize step is not what these tests are about */
vi.mock("@/shared/lib/photo", () => ({
  compressPhoto: async (file: File) => ({ file, originalBytes: file.size, bytes: file.size }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
});
afterAll(() => server.close());

function open(path: string) {
  window.history.replaceState(null, "", path);
  render(<App />);
}

test("the room picture opens a gallery that walks through the older ones", async () => {
  open("/rooms/3");
  await userEvent.click(
    await screen.findByRole("button", { name: "Room pictures" }, { timeout: 4000 }),
  );

  /* room 3 carries two pictures in the mock, newest first */
  expect(await screen.findByText("Photo 1 of 2", {}, { timeout: 4000 })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Next picture" }));
  expect(await screen.findByText("Photo 2 of 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next picture" })).toBeDisabled();

  await userEvent.click(screen.getByRole("button", { name: "Previous picture" }));
  expect(await screen.findByText("Photo 1 of 2")).toBeInTheDocument();
});

test("any member can add a picture, and it becomes the one the room wears", async () => {
  open("/rooms/2");
  const room = db.rooms.find((r) => r.id === 2);
  expect(room?.creator_id).not.toBe(db.me.id);

  /* wait for the feed so the click cannot race the room query settling */
  await screen.findByText("Марина", {}, { timeout: 4000 });
  await userEvent.click(screen.getByRole("button", { name: "Room pictures" }));
  expect(
    await screen.findByText("This room has no pictures yet", {}, { timeout: 4000 }),
  ).toBeInTheDocument();

  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "room.png", {
    type: "image/png",
  });
  /* the picker input is hidden behind the toolbar button, so it is fed directly */
  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  fireEvent.change(inputs[inputs.length - 1] as HTMLInputElement, { target: { files: [file] } });

  await waitFor(() => expect(screen.getByText("Photo 1 of 1")).toBeInTheDocument(), {
    timeout: 4000,
  });
  expect(db.rooms.find((r) => r.id === 2)?.has_avatar).toBe(true);
});

test("the creator deletes the room for everyone, with a confirmation first", async () => {
  open("/rooms/1/edit");
  await userEvent.click(await screen.findByRole("button", { name: /Delete room/ }));

  const sheet = await screen.findByText("Delete the room?");
  const actions = sheet.closest("div")?.parentElement as HTMLElement;
  await userEvent.click(within(actions).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(db.rooms.some((r) => r.id === 1)).toBe(false), { timeout: 4000 });
});
