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

  /**
   * Creates a new index in OpenSearch
   * @param {string} indexName name of the index to be created
   * @param {object} indexSettings index settings object containing settings, mappings and aliases
   */
  async addIndex(indexName, indexSettings) {
    if (this.#dbClient == null) {
      throw new Error("Database client not connected");
    }

    await this.#dbClient.indices.create({
      index: indexName,
      body: indexSettings,
    });

    console.log(`Index "${indexName}" created successfully!`);
  }

  /**
   * Bulk ingests documents into an index
   * @param {string} indexName
   * @param {Array<T>} documents
   * @param {string} uniqueIdFieldName
   * @param {string} createdAtFieldName
   */
  async bulkIngestDocuments(indexName, documents, uniqueIdFieldName, createdAtFieldName) {
    if (this.#dbClient == null) {
      throw new Error("Database client not connected");
    }

    const response = await this.#dbClient.helpers.bulk({
      datasource: documents,
      onDocument(document) {
        let tempDoc = structuredClone(document);

        // if createdAtFieldName is provided, include in the document with the current time
        if (createdAtFieldName) {
          tempDoc = { ...tempDoc, [createdAtFieldName]: new Date().toISOString() };
        }

        // document ID provided in the JSON. Ingest as _id and pop it out before ingestion
        if (uniqueIdFieldName) {
          const _id = tempDoc[uniqueIdFieldName];
          delete tempDoc[uniqueIdFieldName];
          return [
            {
              index: { _index: indexName, _id },
            },
            tempDoc,
          ];
        }

        // document ID not provided, using opensearch internal ID generation
        return [
          {
            index: { _index: indexName },
          },
          tempDoc,
        ];
      },
    });

    const { total, failed, successful } = response;

    console.log(`Ingested ${successful}/${total} documents into "${indexName}"! (Failed: ${failed})`);
  }
}

export const databaseInstance = new DatabaseClient({ useExternalClient: USE_EXTERNAL_OPENSEARCH });
