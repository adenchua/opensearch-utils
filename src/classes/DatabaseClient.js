import { Client } from "@opensearch-project/opensearch";

import {
  DEFAULT_DATE_FORMAT,
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
    return this.#getBasicAuthOpenSearchClient(
      openSearchURL,
      OPENSEARCH_USERNAME,
      OPENSEARCH_PASSWORD,
    );
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
      timestampFormat = DEFAULT_DATE_FORMAT,
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

    console.log(
      `Ingested ${successful}/${total} documents into "${indexName}"! (Failed: ${failed})`,
    );
  }

  /**
   * Retrieves documents from an index. Uses scroll API internally, so adjust size and window timeout accordingly
   * @param {string} indexName database index to retrieve documents from
   * @param {object} searchQuery OpenSearch's search query body. Defaults to match all query
   * @param {number} scrollSize OpenSearch's scroll size window. Defaults to 500.
   * @param {enum} scrollWindowTimeout OpenSearch's scroll window timeout. Defaults to '1m' (1 minute). Increase this parameter for larger scroll sizes
   * @returns {array<T>} a list of documents from the index
   */
  async bulkRetrieveDocuments(
    indexName,
    searchQuery = { query: { match_all: {} } },
    scrollSize = 500,
    scrollWindowTimeout = "1m",
  ) {
    const responseQueue = [];
    const result = [];

    if (this.#dbClient == null) {
      throw new Error("Database client not connected");
    }

    const response = await this.#dbClient.search({
      index: indexName,
      scroll: scrollWindowTimeout,
      size: scrollSize,
      body: searchQuery,
    });

    responseQueue.push(response.body);

    while (responseQueue.length) {
      const responseBody = responseQueue.shift();
      const totalDocumentCount = responseBody.hits.total.value;
      const scrollId = responseBody._scroll_id;

      responseBody.hits.hits.forEach(function (hit) {
        const document = structuredClone(hit._source);
        document["_id"] = hit._id; // push the internal document ID
        result.push(document);
      });

      // all documents obtained, return to client
      if (totalDocumentCount === result.length) {
        console.log(`Retrieved all documents from ${indexName}!`);
        await this.#dbClient.clearScroll({
          scroll_id: scrollId,
        }); // closes the scroll context, do not wait until timeout
        return result;
      }
      const nextScrollResponse = await this.#dbClient.scroll({
        scroll_id: scrollId,
        scroll: scrollWindowTimeout,
      });

      // get the next response if there are more documents to fetch
      responseQueue.push(nextScrollResponse.body);

      console.log(
        `Retrieved ${result.length}/${totalDocumentCount} documents from ${indexName}...`,
      );
    }
  }
}

export const databaseInstance = new DatabaseClient({ useExternalClient: USE_EXTERNAL_OPENSEARCH });
