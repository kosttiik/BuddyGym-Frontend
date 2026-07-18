import "@testing-library/jest-dom/vitest";

beforeEach(() => {
  try {
    window.localStorage.setItem("bg.seenOnboarding", "1");
  } catch {}
});
