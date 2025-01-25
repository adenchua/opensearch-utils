import DatabaseClient from "./classes/DatabaseClient";

import {
  DATABASE_URL,
  AUTHENTICATION_METHOD,
  BASIC_AUTH_FILE_PATH,
  CERT_AUTH_CERT_FILE_PATH,
  CERT_AUTH_KEY_FILE_PATH,
  ROOT_CA_FILE_PATH,
  VALIDATE_SSL,
} from "./constants";

export const databaseClient = new DatabaseClient({
  databaseUrl: DATABASE_URL,
  authenticationMethod: AUTHENTICATION_METHOD as "BASIC_AUTH" | "CERTIFICATE_AUTH",
  basicAuthFilepath: BASIC_AUTH_FILE_PATH,
  certFilepath: CERT_AUTH_CERT_FILE_PATH,
  keyFilepath: CERT_AUTH_KEY_FILE_PATH,
  rootCAFilepath: ROOT_CA_FILE_PATH,
  rejectUnauthorized: VALIDATE_SSL,
});
