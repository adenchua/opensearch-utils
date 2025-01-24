export const APP_VERSION = "1.4.0";

export const DATABASE_URL = process.env.DATABASE_URL || "";
export const AUTHENTICATION_METHOD = process.env.AUTHENTICATION_METHOD || "BASIC_AUTH";
export const ROOT_CA_FILE_PATH = process.env.ROOT_CA_FILE_PATH;
export const BASIC_AUTH_FILE_PATH = process.env.BASIC_AUTH_FILE_PATH;
export const CERT_AUTH_CERT_FILE_PATH = process.env.CERT_AUTH_CERT_FILE_PATH;
export const CERT_AUTH_KEY_FILE_PATH = process.env.CERT_AUTH_KEY_FILE_PATH;
export const VALIDATE_SSL = process.env.VALIDATE_SSL ? !!+process.env.VALIDATE_SSL : false;

export const ALLOWED_DATE_FORMATS = ["iso8601-utc", "epoch"] as const;

export const DEFAULT_DATE_FORMAT = ALLOWED_DATE_FORMATS[0];
