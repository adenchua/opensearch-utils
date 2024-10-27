import { Client } from "@opensearch-project/opensearch";

import {
  EXTERNAL_OPENSEARCH_URL,
  OPENSEARCH_PASSWORD,
  OPENSEARCH_PORT,
  OPENSEARCH_USERNAME,
  USE_EXTERNAL_OPENSEARCH,
} from "../constants.js";

class DatabaseClient {
  #dbClient = null;
  #databaseURL = "";

  constructor({ useExternalClient = false }) {
    const openSearchURL = this.#getOpenSearchURL(useExternalClient);
    const dbClient = this.#getOpenSearchClient(openSearchURL);
    this.#dbClient = dbClient;
    this.#logConnectionStatus();
  }

  async #logConnectionStatus() {
    console.info(`Connecting to database URL: ${this.#databaseURL}...`);
    const isDatabaseConnected = await this.ping();
    const successMessage = "Connected to database successfully!";
    const failedMessage = "Failed to connect to database...";
    console.info(isDatabaseConnected ? successMessage : failedMessage);
  }

  #getOpenSearchURL(useExternalClient) {
    let result;
    if (useExternalClient) {
      result = EXTERNAL_OPENSEARCH_URL;
    } else {
      result = `https://localhost:${OPENSEARCH_PORT}`;
    }

    this.#databaseURL = result;
    return result;
  }

  #getBasicAuthOpenSearchClient(openSearchURL, username, password) {
    return new Client({
      node: openSearchURL,
      auth: {
        username,
        password,
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  #getOpenSearchClient(openSearchURL) {
    return this.#getBasicAuthOpenSearchClient(openSearchURL, OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD);
  }

  /**
   * Pings OpenSearch database client. Returns true if connection is established and open, false otherwise
   * @returns {Promise<boolean>} connection to the database
   */
  async ping() {
    if (this.#dbClient == null) {
      return false;
    }

    try {
      const pingResponse = await this.#dbClient.ping();
      return pingResponse.statusCode === 200;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

export const databaseInstance = new DatabaseClient({ useExternalClient: USE_EXTERNAL_OPENSEARCH });
