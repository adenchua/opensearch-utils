export const APP_VERSION = "1.1.0";
export const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME || "";
export const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || "";
export const OPENSEARCH_PORT = process.env.OPENSEARCH_DATABASE_PORT || "9200";

export const USE_EXTERNAL_OPENSEARCH = Boolean(+process.env.USE_EXTERNAL_OPENSEARCH);
export const EXTERNAL_OPENSEARCH_URL = process.env.EXTERNAL_OPENSEARCH_URL || "";

export const ALLOWED_DATE_FORMATS = ["iso8601-utc", "epoch"];
export const DEFAULT_DATE_FORMAT = ALLOWED_DATE_FORMATS[0];
