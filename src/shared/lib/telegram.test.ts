import { isIos } from "./telegram";

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
