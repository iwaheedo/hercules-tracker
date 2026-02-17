/**
 * Engagement-relative quarter utilities.
 *
 * Quarters are 90-day periods starting from the client's engagement date.
 * Q1 = day 0–89, Q2 = day 90–179, etc. Up to Q12 (3 years).
 */

export interface QuarterOption {
  /** e.g. "Q1 (Feb 16 – May 16, 2026)" */
  label: string;
  /** Quarter number (1-based) */
  quarterNum: number;
  /** ISO date string YYYY-MM-DD */
  startDate: string;
  /** ISO date string YYYY-MM-DD */
  endDate: string;
  /** Whether today falls within this quarter */
  isCurrent: boolean;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatLabel(quarterNum: number, start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Q${quarterNum} (${startStr} – ${endStr})`;
}

/**
 * Generate engagement-relative quarters.
 * Each quarter is exactly 90 days, starting from engagementStart.
 */
export function getEngagementQuarters(
  engagementStart: string,
  count = 12
): QuarterOption[] {
  const start = new Date(engagementStart + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const quarters: QuarterOption[] = [];

  for (let i = 0; i < count; i++) {
    const qStart = addDays(start, i * 90);
    const qEnd = addDays(start, (i + 1) * 90 - 1);
    const isCurrent = today >= qStart && today <= qEnd;

    quarters.push({
      label: formatLabel(i + 1, qStart, qEnd),
      quarterNum: i + 1,
      startDate: formatDate(qStart),
      endDate: formatDate(qEnd),
      isCurrent,
    });
  }

  return quarters;
}

/**
 * Get the current quarter for a given engagement start date.
 * Returns null if today is before the engagement or past Q12.
 */
export function getCurrentQuarter(
  engagementStart: string
): QuarterOption | null {
  const quarters = getEngagementQuarters(engagementStart);
  return quarters.find((q) => q.isCurrent) || null;
}

/**
 * Find which quarter a given date falls into.
 */
export function getQuarterForDate(
  engagementStart: string,
  date: string
): QuarterOption | null {
  const target = new Date(date + "T00:00:00");
  const quarters = getEngagementQuarters(engagementStart);
  return (
    quarters.find((q) => {
      const s = new Date(q.startDate + "T00:00:00");
      const e = new Date(q.endDate + "T00:00:00");
      return target >= s && target <= e;
    }) || null
  );
}
