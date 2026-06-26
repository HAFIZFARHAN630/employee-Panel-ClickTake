import { format, isValid, parseISO } from "date-fns";

/**
 * Safely format a date string/value. Returns fallback if the date is invalid.
 * Handles ISO strings, timestamps, and date-only strings.
 */
export function safeFormat(
  value: string | Date | number | null | undefined,
  fmt: string,
  fallback = "—",
): string {
  if (value == null) return fallback;
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else {
    // Try parseISO first (handles "2025-01-15" and full ISO), fallback to Date constructor
    date = parseISO(value);
    if (!isValid(date)) {
      date = new Date(value);
    }
  }
  return isValid(date) ? format(date, fmt) : fallback;
}