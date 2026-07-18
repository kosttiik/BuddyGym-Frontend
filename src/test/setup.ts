import "@testing-library/jest-dom/vitest";

if (typeof ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
}

beforeEach(() => {
  try {
    window.localStorage.setItem("bg.seenOnboarding", "1");
  } catch {}
});
