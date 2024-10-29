import { Client } from "@opensearch-project/opensearch";

import {
  ALLOWED_DATE_FORMATS,
  EXTERNAL_OPENSEARCH_URL,
  OPENSEARCH_PASSWORD,
  OPENSEARCH_PORT,
  OPENSEARCH_USERNAME,
  USE_EXTERNAL_OPENSEARCH,
} from "../constants.js";
import { getDateNow } from "../utils/date-utils.js";

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
   * @param {string} indexName name of the index to ingest documents
   * @param {Array<T>} documents list of objects to be ingested
   * @param {string} uniqueIdOptions options for document unique ID
   * @param {string} generatedTimestampOptions options for generated ingestion timestamp
   */
  async bulkIngestDocuments(indexName, documents, uniqueIdOptions, generatedTimestampOptions) {
    const { autoGenerateId, uniqueIdKey, removeIdFromDocs = false } = uniqueIdOptions;
    const {
      autoGenerateTimestamp,
      timestampKey = "@timestamp",
      timestampFormat = ALLOWED_DATE_FORMATS[0],
    } = generatedTimestampOptions;

    if (this.#dbClient == null) {
      throw new Error("Database client not connected");
    }

    const response = await this.#dbClient.helpers.bulk({
      datasource: documents,
      onDocument(document) {
        let tempDoc = structuredClone(document);

        if (autoGenerateTimestamp) {
          tempDoc = { ...tempDoc, [timestampKey]: getDateNow(timestampFormat) };
        }

        // document ID provided in the JSON. Ingest as _id
        if (!autoGenerateId) {
          const _id = tempDoc[uniqueIdKey];
          // delete ID key from doc
          if (removeIdFromDocs) {
            delete tempDoc[uniqueIdKey];
          }

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
