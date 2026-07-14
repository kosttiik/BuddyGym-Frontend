import { expect, test } from "vitest";
import { isStreakAtRisk } from "./streak";

const now = Date.parse("2026-07-14T12:00:00Z");
const hours = (n: number) => new Date(now + n * 3600_000).toISOString();

test("a streak with the goal already met this period is safe", () => {
  expect(isStreakAtRisk({ streak: 9, workouts: 3, goal: 3, periodEndsAt: hours(2), now })).toBe(
    false,
  );
});

test("nothing to lose without a streak", () => {
  expect(isStreakAtRisk({ streak: 0, workouts: 0, goal: 3, periodEndsAt: hours(2), now })).toBe(
    false,
  );
});

test("a streak burns when the period closes soon and the goal is unmet", () => {
  expect(isStreakAtRisk({ streak: 9, workouts: 1, goal: 3, periodEndsAt: hours(5), now })).toBe(
    true,
  );
});

/* Nagging on day one of a two-week period is noise, not motivation. */
test("a period that closes far away is not a risk yet", () => {
  expect(isStreakAtRisk({ streak: 9, workouts: 0, goal: 3, periodEndsAt: hours(72), now })).toBe(
    false,
  );
});
