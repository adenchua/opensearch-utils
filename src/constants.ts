export const APP_VERSION = "1.2.0";

export const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME || "";
export const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || "";
export const OPENSEARCH_PORT = process.env.OPENSEARCH_DATABASE_PORT || "9200";
export const OPENSEARCH_URL = process.env.PRIMARY_OPENSEARCH_URL || "";

export const ALLOWED_DATE_FORMATS = ["iso8601-utc", "epoch"] as const;

export const DEFAULT_DATE_FORMAT = ALLOWED_DATE_FORMATS[0];
