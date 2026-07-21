import { locationManager } from "@telegram-apps/sdk-react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { App } from "@/app/App";
import { resetDb } from "@/mocks/handlers";
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
