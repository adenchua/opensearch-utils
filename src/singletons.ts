import DatabaseClient from "./classes/DatabaseClient";
import { EnvironmentConfig } from "./configs/environments";

export function createDatabaseClient(config: EnvironmentConfig): DatabaseClient {
  return new DatabaseClient({
    databaseUrl: config.databaseUrl,
    authenticationMethod: config.authenticationMethod,
    basicAuthFilepath: config.basicAuthFilePath,
    certFilepath: config.certAuthCertFilePath,
    keyFilepath: config.certAuthKeyFilePath,
    rootCAFilepath: config.rootCAFilePath,
    rejectUnauthorized: config.validateSsl,
  });
}
