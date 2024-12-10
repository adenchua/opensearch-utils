import { bulkIngestJSONs } from "./bulkIngestDocuments.ts";
import { createIndex } from "./createIndex.ts";
import { exportFromIndex } from "./exportFromIndex.ts";
import {
  buildBulkIngestDocumentsConfig,
  buildCreateIndexConfig,
  buildExportFromIndexConfig,
} from "../utils/configUtils.ts";

export const SCRIPTS = Object.freeze({
  CREATE_INDEX: { invokeScript: createIndex, parser: buildCreateIndexConfig, name: "CREATE INDEX" },
  BULK_INGEST_DOCUMENTS: {
    invokeScript: bulkIngestJSONs,
    parser: buildBulkIngestDocumentsConfig,
    name: "BULK INGEST DOCUMENTS",
  },
  EXPORT_FROM_INDEX: {
    invokeScript: exportFromIndex,
    parser: buildExportFromIndexConfig,
    name: "EXPORT FROM INDEX",
  },
});
