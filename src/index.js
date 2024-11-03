import { BULK_INGEST_DOCUMENTS_CONFIGS } from "./configs/bulkIngestDocumentsConfig.js";
import { CREATE_INDEX_CONFIGS } from "./configs/createIndexConfig.js";
import { EXPORT_FROM_INDEX_CONFIGS } from "./configs/exportFromIndexConfig.js";
import { bulkIngestJSONs } from "./scripts/bulk-ingest-documents.js";
import { createIndex } from "./scripts/create-index.js";
import { exportFromIndex } from "./scripts/export-from-index.js";

const VERSION = "1.0.0";

// update the configuration used for each function
const options = {
  createIndex: () => createIndex(CREATE_INDEX_CONFIGS.sampleConfig1),
  bulkIngestJSONs: () => bulkIngestJSONs(BULK_INGEST_DOCUMENTS_CONFIGS.sampleConfig1),
  exportFromIndex: () => exportFromIndex(EXPORT_FROM_INDEX_CONFIGS.sampleConfig2),
};

async function main(callbackFn) {
  console.log(`Running OpenSearch-Utils version ${VERSION}...`);
  callbackFn();
}

// select option
main(options.createIndex);
