/**
 * Shared utilities for daily goal tracking.
 *
 * daily_status is stored as JSONB: { "mon": true, "tue": false, ... }
 * - true  = completed that day
 * - false = missed/skipped
 * - undefined/null = not yet tracked
 */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export type DailyStatus = Partial<Record<DayKey, boolean | null>>;

/**
 * Get the DayKey for a given day-of-week index (0=Monday, 6=Sunday).
 */
export function getDayKey(dayIndex: number): DayKey {
  return DAY_KEYS[dayIndex];
}

/**
 * Get the day index (0=Mon, 6=Sun) for today relative to a week start.
 * Returns -1 if today is not in the given week.
 */
export function getTodayIndex(weekStart: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(weekStart + "T00:00:00");
  const diff = Math.floor((today.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff > 6) return -1;
  return diff;
}

/**
 * Check if a given week is the current week.
 */
export function isCurrentWeek(weekStart: string): boolean {
  return getTodayIndex(weekStart) >= 0;
}

/**
 * Cycle the value: null → true → false → null
 */
export function cycleDay(current: boolean | null | undefined): boolean | null {
  if (current === null || current === undefined) return true;
  if (current === true) return false;
  return null;
}

/**
 * Compute the overall weekly status from daily_status.
 *
 * Only considers days up to and including today (for current week)
 * or all 7 days (for past weeks).
 *
 * - All tracked days are true → "completed"
 * - Mix of true and false → "partial"
 * - All tracked days are false → "missed"
 * - No days tracked → "pending"
 */
export function computeStatusFromDaily(
  dailyStatus: DailyStatus,
  weekStart: string
): string {
  const todayIdx = getTodayIndex(weekStart);
  // For past weeks, consider all 7 days; for current week, only up to today
  const maxDay = todayIdx >= 0 ? todayIdx : 6;

  let tracked = 0;
  let doneCount = 0;
  let missedCount = 0;

  for (let i = 0; i <= maxDay; i++) {
    const key = DAY_KEYS[i];
    const val = dailyStatus[key];
    if (val === true) {
      tracked++;
      doneCount++;
    } else if (val === false) {
      tracked++;
      missedCount++;
    }
  }

  if (tracked === 0) return "pending";
  if (doneCount === tracked) return "completed";
  if (missedCount === tracked) return "missed";
  return "partial";
}
