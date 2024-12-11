import { Client, opensearchtypes } from "@opensearch-project/opensearch";

import { ALLOWED_DATE_FORMATS_TYPE } from "../types/dateUtilsTypes";
import { getDateNow } from "../utils/dateUtils";

class DatabaseClient {
  private dbClient: Client | null = null;

  constructor(databaseURL: string, username: string, password: string) {
    const dbClient = this.#getBasicAuthOpenSearchClient(databaseURL, username, password);
    this.dbClient = dbClient;
  }

  #getBasicAuthOpenSearchClient(openSearchURL: string, username: string, password: string) {
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

  // Pings OpenSearch database client. Returns true if connection is established and open, false otherwise
  async ping(): Promise<boolean> {
    if (this.dbClient == null) {
      return false;
    }

    const pingResponse = await this.dbClient.ping();
    return pingResponse.statusCode === 200;
  }

  // Creates a new index in OpenSearch
  async addIndex(
    indexName: string,
    indexSettings: opensearchtypes.IndicesPutTemplateRequest["body"],
  ): Promise<unknown> {
    if (this.dbClient == null) {
      throw new Error("Database client not connected");
    }

    if (indexName === "") {
      throw new Error("Database index name cannot be an empty string");
    }

    const response = await this.dbClient.indices.create({
      index: indexName,
      body: indexSettings,
    });

    return response.body;
  }

  // Bulk ingests documents into an index
  async bulkIngestDocuments<T>(
    indexName: string,
    documents: Array<T>,
    documentIdOptions?: {
      idKey: string;
      removeIdFromDocs: boolean;
    },
    generatedTimestampOptions?: {
      timestampKey: string;
      timestampFormat: ALLOWED_DATE_FORMATS_TYPE;
    },
  ): Promise<{ total: number; failed: number; successful: number }> {
    if (this.dbClient == null) {
      throw new Error("Database client not connected");
    }

    const response = await this.dbClient.helpers.bulk({
      datasource: documents,
      onDocument(document) {
        let tempDoc = structuredClone(document);

        // add date timestamp field to each document
        if (generatedTimestampOptions) {
          const { timestampFormat, timestampKey } = generatedTimestampOptions;
          tempDoc = { ...tempDoc, [timestampKey]: getDateNow(timestampFormat) };
        }

        // document ID provided in the JSON. Ingest as _id
        if (documentIdOptions) {
          const { idKey, removeIdFromDocs } = documentIdOptions;
          const documentId = tempDoc[idKey];
          // delete ID key from doc
          if (removeIdFromDocs) {
            delete tempDoc[idKey];
          }

          return [
            {
              index: { _index: indexName, _id: documentId },
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

    return { total, failed, successful };
  }

  // Retrieves documents from an index. Uses scroll API internally, so adjust size and window timeout accordingly
  async bulkRetrieveDocuments(
    indexName: string,
    searchQuery: opensearchtypes.SearchRequest["body"] = { query: { match_all: {} } },
    scrollSize: number = 500,
    scrollWindowTimeout: string = "10m",
  ) {
    const responseQueue: Array<opensearchtypes.ScrollResponse> = [];
    const result: Array<object> = [];

    if (this.dbClient == null) {
      throw new Error("Database client not connected");
    }

    if (indexName === "") {
      throw new Error("Database index cannot be an empty string");
    }

    const response = await this.dbClient.search<opensearchtypes.ScrollResponse>({
      index: indexName,
      scroll: scrollWindowTimeout,
      size: scrollSize,
      body: searchQuery,
    });

    responseQueue.push(response.body);

    while (responseQueue.length > 0) {
      const responseBody = responseQueue.shift();

      if (!responseBody) {
        return;
      }

      const totalDocumentCount = responseBody.hits.total["value"];
      const scrollId = responseBody._scroll_id;

      responseBody.hits.hits.forEach(function (hit) {
        const document = structuredClone(hit._source) as object;
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

      const nextScrollResponse = await this.dbClient.scroll<opensearchtypes.ScrollResponse>({
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

export default DatabaseClient;
