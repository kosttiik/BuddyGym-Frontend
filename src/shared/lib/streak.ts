const AT_RISK_WINDOW_MS = 48 * 60 * 60 * 1000;

/* The streak burns when a period closes below the room goal. It is only worth nagging about
   when there is still something to lose (streak > 0), the goal is not met yet, and the period
   is close enough that the user has to act now. */
export function isStreakAtRisk(args: {
  streak: number;
  workouts: number;
  goal: number;
  periodEndsAt: string;
  now?: number;
}): boolean {
  const { streak, workouts, goal, periodEndsAt, now = Date.now() } = args;
  if (streak <= 0 || workouts >= goal) {
    return false;
  }
  const left = new Date(periodEndsAt).getTime() - now;
  return left > 0 && left <= AT_RISK_WINDOW_MS;
}
