import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { Member } from "@/shared/api/types";
import { I18nProvider } from "@/shared/i18n";
import { BuddyPicker } from "./BuddyPicker";

function member(id: number, name: string): Member {
  return {
    id,
    username: "",
    first_name: name,
    photo_url: "",
    has_avatar: false,
    theme: "default",
    rank: "novice",
    status_emoji: "",
    status_text: "",
    created_at: new Date().toISOString(),
    workouts_count: 0,
    joined_at: new Date().toISOString(),
    streak: 0,
    period_ends_at: new Date().toISOString(),
    sport_name: "",
    sport_emoji: "",
    goal_per_period: null,
    effective_goal: 3,
    has_closed_period: false,
    last_closed_period_failed: false,
  };
}

test("tapping a member toggles them on and off", async () => {
  const onToggle = vi.fn();
  render(
    <I18nProvider>
      <BuddyPicker
        members={[member(2, "Ann"), member(3, "Bob")]}
        selected={[3]}
        onToggle={onToggle}
      />
    </I18nProvider>,
  );

  const ann = screen.getByRole("button", { name: "Ann" });
  const bob = screen.getByRole("button", { name: "Bob" });
  expect(ann).toHaveAttribute("aria-pressed", "false");
  expect(bob).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(ann);
  expect(onToggle).toHaveBeenCalledWith(2);
});

/* With nobody else in the room there is nobody to tag, and an empty row would be noise. */
test("an empty room renders no picker at all", () => {
  const { container } = render(
    <I18nProvider>
      <BuddyPicker members={[]} selected={[]} onToggle={() => {}} />
    </I18nProvider>,
  );
  expect(container).toBeEmptyDOMElement();
});
