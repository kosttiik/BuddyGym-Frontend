import { locationManager } from "@telegram-apps/sdk-react";
import { getTelegramLocation, isIos } from "./telegram";

vi.mock("@telegram-apps/sdk-react", () => ({
  locationManager: {
    mount: Object.assign(vi.fn(), { isAvailable: vi.fn(() => true) }),
    isMounted: vi.fn(() => true),
    isAvailable: vi.fn(() => true),
    requestLocation: Object.assign(vi.fn(), { isAvailable: vi.fn(() => true) }),
    openSettings: Object.assign(vi.fn(), { isAvailable: vi.fn(() => true) }),
  },
}));

const manager = vi.mocked(locationManager, { deep: true });

function withUserAgent(userAgent: string, maxTouchPoints = 0) {
  vi.stubGlobal("navigator", { ...navigator, userAgent, maxTouchPoints });
}

afterEach(() => vi.unstubAllGlobals());

test("iphone and ipad use the system camera", () => {
  withUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15");
  expect(isIos()).toBe(true);

  /* iPadOS reports itself as a Mac; only the touch points give it away */
  withUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5);
  expect(isIos()).toBe(true);
});

test("android and desktop keep the in-app camera", () => {
  withUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36");
  expect(isIos()).toBe(false);

  withUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
  expect(isIos()).toBe(false);
});

test("gets location through the Telegram location manager", async () => {
  manager.requestLocation.mockResolvedValue({
    latitude: 55.75,
    longitude: 37.61,
    horizontal_accuracy: 12,
  });

  await expect(getTelegramLocation()).resolves.toEqual({
    ok: true,
    geo: { lat: 55.75, lon: 37.61, horizontal_accuracy: 12 },
  });
});

test("tells apart the reasons a location cannot be used", async () => {
  manager.requestLocation.mockRejectedValue(new Error("denied"));
  await expect(getTelegramLocation()).resolves.toEqual({ ok: false, reason: "denied" });

  /* a fix this coarse would be rejected by checkin-service anyway */
  manager.requestLocation.mockResolvedValue({
    latitude: 55.75,
    longitude: 37.61,
    horizontal_accuracy: 120,
  });
  await expect(getTelegramLocation()).resolves.toEqual({ ok: false, reason: "accuracy" });

  manager.requestLocation.mockResolvedValue({ latitude: 55.75, longitude: 37.61 });
  await expect(getTelegramLocation()).resolves.toEqual({ ok: false, reason: "accuracy" });

  manager.isAvailable.mockReturnValueOnce(false);
  await expect(getTelegramLocation()).resolves.toEqual({ ok: false, reason: "unavailable" });

  manager.mount.isAvailable.mockReturnValueOnce(false);
  await expect(getTelegramLocation()).resolves.toEqual({ ok: false, reason: "unsupported" });
});
