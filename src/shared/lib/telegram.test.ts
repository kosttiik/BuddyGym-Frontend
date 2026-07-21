import { getTelegramLocation, isIos } from "./telegram";

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

test("gets location only through Telegram LocationManager", async () => {
  const manager = {
    isInited: false,
    isLocationAvailable: true,
    init: vi.fn((callback?: () => void) => {
      callback?.();
      return manager;
    }),
    getLocation: vi.fn((callback: (location: object) => void) => {
      callback({ latitude: 55.75, longitude: 37.61, horizontal_accuracy: 12 });
      return manager;
    }),
  };
  vi.stubGlobal("Telegram", { WebApp: { LocationManager: manager } });

  await expect(getTelegramLocation()).resolves.toEqual({
    lat: 55.75,
    lon: 37.61,
    horizontal_accuracy: 12,
  });
  expect(manager.init).toHaveBeenCalledOnce();
  expect(manager.getLocation).toHaveBeenCalledOnce();
});

test("rejects Telegram locations without horizontal accuracy", async () => {
  const manager = {
    isInited: true,
    isLocationAvailable: true,
    init: vi.fn(),
    getLocation: vi.fn((callback: (location: object) => void) => {
      callback({ latitude: 55.75, longitude: 37.61 });
      return manager;
    }),
  };
  vi.stubGlobal("Telegram", { WebApp: { LocationManager: manager } });

  await expect(getTelegramLocation()).rejects.toThrow("accuracy is unavailable");
});
