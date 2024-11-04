import { DEFAULT_DATE_FORMAT } from "../constants.js";

export function buildBulkIngestDocumentsConfig({
  indexName,
  zipFileName = "",
  autoGenerateId = true,
  autoGenerateTimestamp = false,
  uniqueIdOptions = {
    uniqueIdKey: undefined,
    removeIdFromDocs: false,
  },
  generatedTimestampOptions = {
    timestampKey: "@timestamp",
    timestampFormat: DEFAULT_DATE_FORMAT,
  },
}) {
  return {
    indexName,
    zipFileName,
    autoGenerateId,
    autoGenerateTimestamp,
    uniqueIdOptions,
    generatedTimestampOptions,
  };
}

export function buildCreateIndexConfig({
  indexName,
  shardCount = 1,
  replicaCount = 1,
  mappings = {},
  aliases = {},
}) {
  return {
    indexName,
    shardCount,
    replicaCount,
    mappings,
    aliases,
  };
}

export function buildExportFromIndexConfig({
  indexName,
  searchQuery = { query: { match_all: {} } },
  scrollSize = 500,
  scrollWindowTimeout = "1m",
  outputFileName,
}) {
  return {
    indexName,
    searchQuery,
    scrollSize,
    scrollWindowTimeout,
    outputFileName,
  };
}
