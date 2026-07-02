export type ScriptSelectionType =
  | "CREATE_INDEX"
  | "BULK_INGEST"
  | "EXPORT_FROM_INDEX"
  | "EXPORT_INDEX_MAPPING"
  | "DELETE_DOCUMENTS_FROM_INDICES"
  | "REPLACE_MAPPING";

export interface EnvironmentConfig {
  databaseUrl: string;
  authenticationMethod: "BASIC_AUTH" | "CERTIFICATE_AUTH";
  validateSsl?: boolean;
  rootCAFilePath?: string;
  basicAuthFilePath?: string;
  certAuthCertFilePath?: string;
  certAuthKeyFilePath?: string;
  allowedScripts: ScriptSelectionType[];
}

export type AppEnvironment = "local" | "development" | "staging" | "test" | "production";

export const environmentConfigs: Record<AppEnvironment, EnvironmentConfig> = {
  local: {
    databaseUrl: "https://localhost:9200",
    authenticationMethod: "BASIC_AUTH",
    validateSsl: false,
    rootCAFilePath: "./certs/local/root-ca.pem",
    basicAuthFilePath: "./certs/local/basic-auth.txt",
    certAuthCertFilePath: "./certs/local/client-cert.pem",
    certAuthKeyFilePath: "./certs/local/client-key.pem",
    allowedScripts: [
      "BULK_INGEST",
      "CREATE_INDEX",
      "EXPORT_FROM_INDEX",
      "EXPORT_INDEX_MAPPING",
      "DELETE_DOCUMENTS_FROM_INDICES",
      "REPLACE_MAPPING",
    ],
  },
  development: {
    databaseUrl: "https://localhost:9200",
    authenticationMethod: "BASIC_AUTH",
    validateSsl: false,
    rootCAFilePath: "./certs/development/root-ca.pem",
    basicAuthFilePath: "./certs/development/basic-auth.txt",
    certAuthCertFilePath: "./certs/development/client-cert.pem",
    certAuthKeyFilePath: "./certs/development/client-key.pem",
    allowedScripts: [
      "BULK_INGEST",
      "CREATE_INDEX",
      "EXPORT_FROM_INDEX",
      "EXPORT_INDEX_MAPPING",
      "DELETE_DOCUMENTS_FROM_INDICES",
      "REPLACE_MAPPING",
    ],
  },
  staging: {
    databaseUrl: "https://localhost:9200",
    authenticationMethod: "BASIC_AUTH",
    validateSsl: false,
    rootCAFilePath: "./certs/staging/root-ca.pem",
    basicAuthFilePath: "./certs/staging/basic-auth.txt",
    certAuthCertFilePath: "./certs/staging/client-cert.pem",
    certAuthKeyFilePath: "./certs/staging/client-key.pem",
    allowedScripts: [
      "BULK_INGEST",
      "CREATE_INDEX",
      "EXPORT_FROM_INDEX",
      "EXPORT_INDEX_MAPPING",
      "DELETE_DOCUMENTS_FROM_INDICES",
      "REPLACE_MAPPING",
    ],
  },
  test: {
    databaseUrl: "https://localhost:9200",
    authenticationMethod: "BASIC_AUTH",
    validateSsl: false,
    rootCAFilePath: "./certs/test/root-ca.pem",
    basicAuthFilePath: "./certs/test/basic-auth.txt",
    certAuthCertFilePath: "./certs/test/client-cert.pem",
    certAuthKeyFilePath: "./certs/test/client-key.pem",
    allowedScripts: [
      "BULK_INGEST",
      "CREATE_INDEX",
      "EXPORT_FROM_INDEX",
      "EXPORT_INDEX_MAPPING",
      "DELETE_DOCUMENTS_FROM_INDICES",
      "REPLACE_MAPPING",
    ],
  },
  production: {
    databaseUrl: "https://localhost:9200",
    authenticationMethod: "BASIC_AUTH",
    validateSsl: true,
    rootCAFilePath: "./certs/production/root-ca.pem",
    basicAuthFilePath: "./certs/production/basic-auth.txt",
    certAuthCertFilePath: "./certs/production/client-cert.pem",
    certAuthKeyFilePath: "./certs/production/client-key.pem",
    allowedScripts: ["CREATE_INDEX", "EXPORT_FROM_INDEX", "EXPORT_INDEX_MAPPING"],
  },
};
