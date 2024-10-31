import "dotenv/config";

export const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME || "";
export const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || "";
export const OPENSEARCH_PORT = process.env.OPENSEARCH_DATABASE_PORT || "9200";

export const USE_EXTERNAL_OPENSEARCH = Boolean(+process.env.USE_EXTERNAL_OPENSEARCH);
export const EXTERNAL_OPENSEARCH_URL = process.env.EXTERNAL_OPENSEARCH_URL || "";

// first item in the array will be the default date format used
export const ALLOWED_DATE_FORMATS = ["iso8601-utc", "epoch"];