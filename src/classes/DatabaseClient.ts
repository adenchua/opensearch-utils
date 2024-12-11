import { Client, opensearchtypes } from "@opensearch-project/opensearch";

import {
  DEFAULT_DATE_FORMAT,
  EXTERNAL_OPENSEARCH_URL,
  OPENSEARCH_PASSWORD,
  OPENSEARCH_PORT,
  OPENSEARCH_USERNAME,
  USE_EXTERNAL_OPENSEARCH,
} from "../constants";
import { getDateNow } from "../utils/dateUtils";
import { ALLOWED_DATE_FORMATS_TYPE } from "../types/dateUtilsTypes";

class DatabaseClient {
  private dbClient: Client | null = null;
  private databaseURL: string = "";

  constructor({ useExternalClient = false }) {
    const openSearchURL = this.#getOpenSearchURL(useExternalClient);
    const dbClient = this.#getOpenSearchClient(openSearchURL);
    this.dbClient = dbClient;
    this.#logConnectionStatus();
  }

  async #logConnectionStatus() {
    console.info(`Connecting to database URL: ${this.databaseURL}...`);
  }

  #getOpenSearchURL(useExternalClient) {
    let result;
    if (useExternalClient) {
      result = EXTERNAL_OPENSEARCH_URL;
    } else {
      result = `https://localhost:${OPENSEARCH_PORT}`;
    }

    this.databaseURL = result;
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

  // Pings OpenSearch database client. Returns true if connection is established and open, false otherwise
  async ping(): Promise<boolean> {
    if (this.dbClient == null) {
      return false;
    }

    try {
      const pingResponse = await this.dbClient.ping();
      return pingResponse.statusCode === 200;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  // Creates a new index in OpenSearch
  async addIndex(
    indexName: string,
    indexSettings: opensearchtypes.IndicesPutTemplateRequest["body"],
  ): Promise<void> {
    if (this.dbClient == null) {
      throw new Error("Database client not connected");
    }

    await this.dbClient.indices.create({
      index: indexName,
      body: indexSettings,
    });

    console.log(`Index "${indexName}" created successfully!`);
  }

  // Bulk ingests documents into an index
  async bulkIngestDocuments<T>(
    indexName: string,
    documents: Array<T>,
    uniqueIdOptions: {
      autoGenerateId: boolean;
      uniqueIdKey: string;
      removeIdFromDocs: boolean;
    },
    generatedTimestampOptions: {
      autoGenerateTimestamp: boolean;
      timestampKey: string;
      timestampFormat: ALLOWED_DATE_FORMATS_TYPE;
    },
  ) {
    const { autoGenerateId, uniqueIdKey, removeIdFromDocs = false } = uniqueIdOptions;
    const {
      autoGenerateTimestamp,
      timestampKey = "@timestamp",
      timestampFormat = DEFAULT_DATE_FORMAT,
    } = generatedTimestampOptions;

    if (this.dbClient == null) {
      throw new Error("Database client not connected");
    }

    const response = await this.dbClient.helpers.bulk({
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

  // Retrieves documents from an index. Uses scroll API internally, so adjust size and window timeout accordingly
  async bulkRetrieveDocuments(
    indexName: string,
    searchQuery: opensearchtypes.SearchRequest["body"],
    scrollSize: number = 500,
    scrollWindowTimeout: string = "1m",
  ) {
    const responseQueue = [];
    const result = [];

    if (this.dbClient == null) {
      throw new Error("Database client not connected");
    }

    const response = await this.dbClient.search({
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
        await this.dbClient.clearScroll({
          scroll_id: scrollId,
        }); // closes the scroll context, do not wait until timeout
        return result;
      }

      const nextScrollResponse = await this.dbClient.scroll({
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
