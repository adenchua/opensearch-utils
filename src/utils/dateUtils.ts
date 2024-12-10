import { ALLOWED_DATE_FORMATS_TYPE, DEFAULT_DATE_FORMAT } from "../constants";

// Returns the current date in various formats
export function getDateNow(
  format: ALLOWED_DATE_FORMATS_TYPE = DEFAULT_DATE_FORMAT,
): string | number {
  switch (format) {
    case "iso8601-utc":
      return new Date().toISOString();
    case "epoch":
      return Date.now();
    default:
      // return iso string by default
      return new Date().toISOString();
  }
}

// Returns the date today in YYYY-MM-dd
export function getTodayDatePrettyFormat(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
