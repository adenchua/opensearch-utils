import { bulkIngestJSONs } from "./bulkIngestDocuments.js";
import { createIndex } from "./createIndex.js";
import { exportFromIndex } from "./exportFromIndex.js";
import {
  buildBulkIngestDocumentsConfig,
  buildCreateIndexConfig,
  buildExportFromIndexConfig,
} from "../utils/configUtils.js";

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
