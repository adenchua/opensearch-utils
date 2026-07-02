import { Hit, TotalHits } from "@opensearch-project/opensearch/api/_types/_core.search.js";
import { Action as UpdateAliasesAction } from "@opensearch-project/opensearch/api/_types/indices.update_aliases.js";
import {
  Indices_Create_RequestBody,
  Indices_Get_ResponseBody,
  Search_RequestBody,
  Search_ResponseBody,
  Tasks_Get_ResponseBody,
} from "@opensearch-project/opensearch/api/index.js";

import InvalidDatabaseIndexError from "../errors/InvalidDatabaseIndexError";
import { ALLOWED_DATE_FORMATS_TYPE } from "../types/dateUtilsTypes";
import { getDateNow } from "../utils/dateUtils";
import DatabaseClient from "./DatabaseClient";

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
    documents: T[],
    documentIdOptions?: {
      idKey: string;
      removeIdFromDocs: boolean;
    },
    generatedTimestampOptions?: {
      timestampKey: string;
      timestampFormat: ALLOWED_DATE_FORMATS_TYPE;
    },
    onDropDocument?: (document: T, error: { type: string; reason: string }) => void,
  ): Promise<{ total: number; failed: number; successful: number }> {
    const response = await this.databaseClient.getDatabaseClient().helpers.bulk({
      datasource: documents,
      onDrop({ document, error }) {
        onDropDocument?.(document, error);
      },
      onDocument(document: T) {
        let tempDoc: Record<string, unknown> = structuredClone(document) as Record<string, unknown>;

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
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
    scrollSize = 500,
    scrollWindowTimeout = "10m",
  ) {
    const responseQueue: Search_ResponseBody[] = [];
    const result: object[] = [];

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

      responseBody.hits.hits.forEach(function (hit: Hit) {
        const document = structuredClone(hit._source) as Record<string, unknown>;
        document._id = hit._id; // push the internal document ID
        result.push(document);
      });

      // all documents obtained, return to client
      if (totalDocumentCount === result.length) {
        console.log(`Retrieved all documents from ${index}!`);
        await this.databaseClient.getDatabaseClient().clearScroll({
          body: { scroll_id: scrollId },
        }); // closes the scroll context, do not wait until timeout
        return result;
      }

      const nextScrollResponse = await this.databaseClient.getDatabaseClient().scroll({
        body: {
          scroll_id: scrollId,
          scroll: scrollWindowTimeout,
        },
      });

      // get the next response if there are more documents to fetch
      responseQueue.push(nextScrollResponse.body);

      console.log(`Retrieved ${String(result.length)}/${String(totalDocumentCount)} documents from ${index}...`);
    }
  }

  async fetchIndexInfo(index: string): Promise<Indices_Get_ResponseBody> {
    const indexResponse = await this.databaseClient.getDatabaseClient().indices.get({ index });
    return indexResponse.body;
  }

  async deleteDocumentsByQuery(
    index: string,
    queryBody: Search_RequestBody = { query: { match_all: {} } },
  ): Promise<{ deleted: number }> {
    if (index === "") {
      throw new InvalidDatabaseIndexError();
    }

    const response = await this.databaseClient.getDatabaseClient().deleteByQuery({
      index,
      body: queryBody,
    });

    const responseBody = response.body as { deleted?: number };
    return { deleted: responseBody.deleted ?? 0 };
  }

  // Checks whether a concrete index exists
  async indexExists(indexName: string): Promise<boolean> {
    if (indexName === "") {
      throw new InvalidDatabaseIndexError();
    }

    const response = await this.databaseClient.getDatabaseClient().indices.exists({
      index: indexName,
    });
    return response.body;
  }

  // Deletes an index
  async deleteIndex(indexName: string): Promise<unknown> {
    if (indexName === "") {
      throw new InvalidDatabaseIndexError();
    }

    const response = await this.databaseClient.getDatabaseClient().indices.delete({
      index: indexName,
    });
    return response.body;
  }

  // Resolves a name to the concrete index it points to if it's an alias, otherwise returns null
  async resolveAlias(name: string): Promise<string | null> {
    if (name === "") {
      throw new InvalidDatabaseIndexError();
    }

    const existsResponse = await this.databaseClient.getDatabaseClient().indices.existsAlias({
      name,
    });

    if (!existsResponse.body) {
      return null;
    }

    const getAliasResponse = await this.databaseClient.getDatabaseClient().indices.getAlias({
      name,
    });
    return Object.keys(getAliasResponse.body)[0] ?? null;
  }

  // Retrieves the names of all aliases currently pointing at an index
  async getAliasesForIndex(indexName: string): Promise<string[]> {
    const response = await this.fetchIndexInfo(indexName);
    return Object.keys(response[indexName].aliases ?? {});
  }

  // Atomically adds and/or removes aliases in a single call
  async updateAliases(actions: UpdateAliasesAction[]): Promise<unknown> {
    const response = await this.databaseClient.getDatabaseClient().indices.updateAliases({
      body: { actions },
    });
    return response.body;
  }

  // Starts an asynchronous reindex from source into dest, optionally applying a Painless transform script
  async reindex(source: string, dest: string, script?: string): Promise<string> {
    if (source === "" || dest === "") {
      throw new InvalidDatabaseIndexError();
    }

    const response = await this.databaseClient.getDatabaseClient().reindex({
      wait_for_completion: false,
      body: {
        source: { index: source },
        dest: { index: dest },
        ...(script ? { script: { source: script } } : {}),
      },
    });

    const responseBody = response.body as { task: string };
    return responseBody.task;
  }

  // Fetches the status of an asynchronous task (e.g. a reindex started via reindex())
  async getTaskStatus(taskId: string): Promise<Tasks_Get_ResponseBody> {
    const response = await this.databaseClient.getDatabaseClient().tasks.get({
      task_id: taskId,
    });
    return response.body;
  }

  // Refreshes and counts the documents currently visible in an index
  async countDocuments(indexName: string): Promise<number> {
    if (indexName === "") {
      throw new InvalidDatabaseIndexError();
    }

    await this.databaseClient.getDatabaseClient().indices.refresh({ index: indexName });
    const response = await this.databaseClient.getDatabaseClient().count({ index: indexName });
    return response.body.count;
  }
}
