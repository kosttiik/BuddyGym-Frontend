import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/shared/i18n";
import { hasSeenOnboarding, markOnboardingSeen } from "@/shared/lib/seenOnboarding";
import { Onboarding } from "./Onboarding";

const store = new Map<string, string>();
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
});

beforeEach(() => {
  store.clear();
});

function renderTour(open = true) {
  const onClose = vi.fn();
  render(
    <I18nProvider>
      <Onboarding open={open} onClose={onClose} />
    </I18nProvider>,
  );
  return onClose;
}

test("the seen flag flips only after it is marked", () => {
  expect(hasSeenOnboarding()).toBe(false);
  markOnboardingSeen();
  expect(hasSeenOnboarding()).toBe(true);
});

test("closed tour renders nothing", () => {
  renderTour(false);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("pages through all slides, finishing closes and sets the flag", async () => {
  const onClose = renderTour();

  expect(screen.getByRole("heading", { name: "Welcome to BuddyGym" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Rooms" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Let's go" }));

  expect(onClose).toHaveBeenCalledOnce();
  expect(hasSeenOnboarding()).toBe(true);
});

test("skip closes right away and sets the flag", async () => {
  const onClose = renderTour();

  await userEvent.click(screen.getByRole("button", { name: "Skip" }));

  expect(onClose).toHaveBeenCalledOnce();
  expect(hasSeenOnboarding()).toBe(true);
});
