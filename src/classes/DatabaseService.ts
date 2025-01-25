import { TotalHits } from "@opensearch-project/opensearch/api/_types/_core.search.js";
import {
  Indices_Create_RequestBody,
  Indices_GetMapping_ResponseBody,
  Indices_GetSettings_ResponseBody,
  Search_RequestBody,
  Search_ResponseBody,
} from "@opensearch-project/opensearch/api/index.js";

import { ALLOWED_DATE_FORMATS_TYPE } from "../types/dateUtilsTypes";
import { getDateNow } from "../utils/dateUtils";
import DatabaseClient from "./DatabaseClient";
import InvalidDatabaseIndexError from "../errors/InvalidDatabaseIndexError";

export default class DatabaseService {
  private databaseClient: DatabaseClient;

  constructor(databaseClient: DatabaseClient) {
    this.databaseClient = databaseClient;
  }

  // Creates a new index in OpenSearch
  async addIndex(indexName: string, indexSettings: Indices_Create_RequestBody): Promise<unknown> {
    if (indexName === "") {
      throw new InvalidDatabaseIndexError();
    }

    const response = await this.databaseClient.getDatabaseClient().indices.create({
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
    const response = await this.databaseClient.getDatabaseClient().helpers.bulk({
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
    index: string,
    searchQuery: Search_RequestBody = { query: { match_all: {} } },
    scrollSize: number = 500,
    scrollWindowTimeout: string = "10m",
  ) {
    const responseQueue: Array<Search_ResponseBody> = [];
    const result: Array<object> = [];

    if (index === "") {
      throw new InvalidDatabaseIndexError();
    }

    const response = await this.databaseClient.getDatabaseClient().search({
      index,
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

      const totalDocumentHits = responseBody.hits.total as TotalHits;
      const totalDocumentCount = totalDocumentHits.value;
      const scrollId = responseBody._scroll_id;

      responseBody.hits.hits.forEach(function (hit) {
        const document = structuredClone(hit._source) as object;
        document["_id"] = hit._id; // push the internal document ID
        result.push(document);
      });

      // all documents obtained, return to client
      if (totalDocumentCount === result.length) {
        console.log(`Retrieved all documents from ${index}!`);
        await this.databaseClient.getDatabaseClient().clearScroll({
          scroll_id: scrollId,
        }); // closes the scroll context, do not wait until timeout
        return result;
      }

      const nextScrollResponse = await this.databaseClient.getDatabaseClient().scroll({
        scroll_id: scrollId,
        scroll: scrollWindowTimeout,
      });

      // get the next response if there are more documents to fetch
      responseQueue.push(nextScrollResponse.body);

      console.log(`Retrieved ${result.length}/${totalDocumentCount} documents from ${index}...`);
    }
  }

  async fetchIndexMapping(index: string): Promise<{
    mappings: Indices_GetMapping_ResponseBody;
    settings: Indices_GetSettings_ResponseBody;
  }> {
    if (index === "") {
      throw new InvalidDatabaseIndexError();
    }

    // settings contain useful information such as custom analyzers
    // custom analyzers may be present in the mapping
    const settingsResponse = await this.databaseClient
      .getDatabaseClient()
      .indices.getSettings({ index });

    const mappingsResponse = await this.databaseClient.getDatabaseClient().indices.getMapping({
      index,
    });

    return { mappings: mappingsResponse.body, settings: settingsResponse.body };
  }
}
