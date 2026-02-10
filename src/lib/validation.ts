/**
 * Lightweight input validation helpers for server actions.
 * Prevents oversized payloads, invalid formats, and schema leakage.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_RE.test(value) && value.length <= 254;
}

export function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !isNaN(Date.parse(value));
}

export function isNonEmptyString(value: unknown, maxLength = 200): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export function isOptionalString(value: unknown, maxLength = 2000): boolean {
  return value === undefined || value === null || value === "" || (typeof value === "string" && value.length <= maxLength);
}

const VALID_GOAL_CATEGORIES = ["fitness", "professional", "relationships", "spirituality"];
const VALID_GOAL_STATUSES = ["active", "completed", "paused", "cancelled"];
const VALID_WEEKLY_STATUSES = ["pending", "in_progress", "completed", "missed"];
const VALID_CHECKIN_STATUSES = ["scheduled", "completed", "cancelled"];

export function isValidCategory(value: unknown): value is string {
  return typeof value === "string" && VALID_GOAL_CATEGORIES.includes(value);
}

export function isValidGoalStatus(value: unknown): value is string {
  return typeof value === "string" && VALID_GOAL_STATUSES.includes(value);
}

export function isValidWeeklyStatus(value: unknown): value is string {
  return typeof value === "string" && VALID_WEEKLY_STATUSES.includes(value);
}

export function isValidCheckinStatus(value: unknown): value is string {
  return typeof value === "string" && VALID_CHECKIN_STATUSES.includes(value);
}

export function isValidProgress(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 100 && Number.isInteger(value);
}
