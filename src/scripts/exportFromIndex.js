import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { databaseInstance } from "../classes/DatabaseClient.js";
import { getTodayDatePrettyFormat } from "../utils/dateUtils.js";
import { removeDir, writeDocumentToDir, zipFolder } from "../utils/folderUtils.js";

const dateToday = getTodayDatePrettyFormat();
const OUTPUT_PATH = path.join("output", "export-from-index", dateToday);

/**
 * Exports all documents from an index as json files
 * @property {object} options
 * @property {string} options.indexName database index to retrieve documents from
 * @property {object} options.searchQuery OpenSearch's search query body. Defaults to match all query
 * @property {number} options.scrollSize OpenSearch's scroll size window. Defaults to 500.
 * @property {enum} options.scrolLWindowTimeout OpenSearch's scroll window timeout. Defaults to '1m' (1 minute). Increase this parameter for larger scroll sizes
 * @property {string} options.outputFileName Overrides the default output file name. e.g. "test-12345". Defaults to <INDEX>-<UUID>
 */
export async function exportFromIndex({
  indexName,
  searchQuery = { query: { match_all: {} } },
  scrollSize = 500,
  scrollWindowTimeout = "1m",
  outputFileName,
}) {
  try {
    const fileName = outputFileName || `${indexName}-${uuidv4()}`;
    const outputFullPath = path.join(OUTPUT_PATH, fileName);
    if (fs.existsSync(`${outputFullPath}.zip`)) {
      throw new Error("output file exists, please change the outputFileName");
    }

    const documents = await databaseInstance.bulkRetrieveDocuments(
      indexName,
      searchQuery,
      scrollSize,
      scrollWindowTimeout,
    );

    console.log("Preparing to zip...");

    if (documents.length === 0) {
      throw new Error("No documents in index!");
    }

    for (const document of documents) {
      writeDocumentToDir(outputFullPath, document);
    }

    await zipFolder(outputFullPath, outputFullPath);
    removeDir(outputFullPath);
    console.log(
      `Successfully exported data from index ${indexName}! File stored at: ${outputFullPath}.zip`,
    );
  } catch (error) {
    console.error(error);
  }
}
