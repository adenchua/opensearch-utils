import { Client } from "@opensearch-project/opensearch";
import fs from "fs";

export interface Settings {
  authenticationMethod: "CERTIFICATE_AUTH" | "BASIC_AUTH";
  databaseUrl: string;
  basicAuthFilepath?: string;
  rootCAFilepath?: string;
  certFilepath?: string;
  keyFilepath?: string;
  rejectUnauthorized?: boolean;
}

export default class DatabaseAdapter {
  private databaseClient: Client;
  private databaseUrl: string;

  constructor(settings: Settings) {
    const {
      authenticationMethod,
      databaseUrl,
      basicAuthFilepath,
      certFilepath,
      keyFilepath,
      rootCAFilepath,
      rejectUnauthorized,
    } = settings;

    this.databaseUrl = databaseUrl;

    if (authenticationMethod === "BASIC_AUTH" && !basicAuthFilepath) {
      throw new Error(
        "Authentication method is set to BASIC_AUTH, but BASIC_AUTH_FILE_PATH is not provided",
      );
    }

    if (authenticationMethod === "BASIC_AUTH" && basicAuthFilepath) {
      this.databaseClient = this.getBasicAuthClient(
        basicAuthFilepath,
        rootCAFilepath,
        rejectUnauthorized,
      );
      return;
    }

    // authentication method set to TLS Cert and Key
    if (!certFilepath || !keyFilepath) {
      throw new Error(
        "Authentication method is set to CERTIFICATE_AUTH, but CERT_AUTH_FILE_PATH/KEY_FILE_PATH is not provided",
      );
    }

    this.databaseClient = this.getCertificationAuthClient(
      certFilepath,
      keyFilepath,
      rootCAFilepath,
      rejectUnauthorized,
    );
  }

  private getBasicAuthClient(
    basicAuthFilepath: string,
    rootCAFilepath?: string,
    rejectUnauthorized = true,
  ): Client {
    const credentials = fs.readFileSync(basicAuthFilepath, { encoding: "utf8" });
    const [username, password] = credentials.split(":");
    return new Client({
      node: this.databaseUrl,
      auth: {
        username,
        password,
      },
      ssl: {
        ca: rootCAFilepath ? [fs.readFileSync(rootCAFilepath)] : undefined,
        rejectUnauthorized,
      },
    });
  }

  private getCertificationAuthClient(
    certFilepath: string,
    keyFilepath: string,
    rootCAFilepath?: string,
    rejectUnauthorized = true,
  ): Client {
    return new Client({
      node: this.databaseUrl,
      ssl: {
        cert: fs.readFileSync(certFilepath),
        key: fs.readFileSync(keyFilepath),
        ca: rootCAFilepath ? [fs.readFileSync(rootCAFilepath)] : undefined,
        rejectUnauthorized,
      },
    });
  }

  getDatabaseClient(): Client {
    return this.databaseClient;
  }

  async ping(): Promise<boolean> {
    return (await this.databaseClient.ping()).statusCode === 200;
  }
}
