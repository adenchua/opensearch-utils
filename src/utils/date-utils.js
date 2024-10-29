import { ALLOWED_DATE_FORMATS } from "../constants.js";

/**
 * Return the current date in various formats
 * @param {string} format - date format. Either iso8601-utc/epoch
 * @returns date
 */
export function getDateNow(format = ALLOWED_DATE_FORMATS[0]) {
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
