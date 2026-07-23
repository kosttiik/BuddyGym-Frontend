import { locationManager } from "@telegram-apps/sdk-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { App } from "@/app/App";
import { db, resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";

/* Only the location manager is stubbed; the rest of the SDK keeps its plain-browser behaviour,
   which is what the other components in the tree rely on. */
vi.mock("@telegram-apps/sdk-react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@telegram-apps/sdk-react")>()),
  locationManager: {
    mount: Object.assign(vi.fn(), { isAvailable: vi.fn(() => true) }),
    isMounted: vi.fn(() => true),
    isAvailable: vi.fn(() => true),
    requestLocation: Object.assign(
      vi.fn(async () => ({ latitude: 55.8, longitude: 37.57, horizontal_accuracy: 18 })),
      { isAvailable: vi.fn(() => true) },
    ),
    openSettings: Object.assign(vi.fn(), { isAvailable: vi.fn(() => true) }),
  },
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
});
afterAll(() => server.close());

async function openGeoCheckin() {
  window.history.replaceState(null, "", "/rooms/2");
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: /Log a workout/ }));
  await userEvent.click(await screen.findByRole("button", { name: /Geo tag/ }));
}

test("shows what the geo checkin is doing while the gym lookup runs", async () => {
  server.use(
    http.post(
      "/api/v1/checkins",
      async () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(HttpResponse.json([], { status: 200 })), 300);
        }),
    ),
  );
  await openGeoCheckin();

  /* the accuracy is echoed back so a bad fix is visible before the request fails */
  expect(await screen.findByText(/Looking for a gym nearby · 18 m accuracy/)).toBeInTheDocument();
});

test("a rejected geo checkin says no gym was found, not a generic error", async () => {
  server.use(
    http.post("/api/v1/checkins", () =>
      HttpResponse.json({ error: "no gym found within 50 meters" }, { status: 400 }),
    ),
  );
  await openGeoCheckin();

  expect(await screen.findByText("No gym found nearby")).toBeInTheDocument();
});

test("denied access opens the Telegram location settings instead of a dead toast", async () => {
  vi.mocked(locationManager.requestLocation).mockRejectedValueOnce(new Error("denied"));
  await openGeoCheckin();

  expect(vi.mocked(locationManager.openSettings)).toHaveBeenCalled();
});

/* A wrong photo is the usual reason for a second checkin the same day, so the app offers to
   replace the earlier one instead of silently stacking two entries. */
test("a second checkin on the same day offers to replace the first", async () => {
  db.checkins.unshift({
    id: "c-today",
    room_id: 2,
    user_id: db.me.id,
    status: "pending",
    has_photo: true,
    photo_purged: false,
    votes_approve: 0,
    votes_reject: 0,
    votes_required: 2,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });

  await openGeoCheckin();

  expect(
    await screen.findByText("Today is already logged", {}, { timeout: 4000 }),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Replace" }));

  await waitFor(() => expect(db.checkins.find((c) => c.id === "c-today")?.status).toBe("expired"), {
    timeout: 4000,
  });
});
