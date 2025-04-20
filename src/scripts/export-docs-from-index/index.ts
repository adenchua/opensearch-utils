import { promises as fs, default as fsSync } from "fs";
import _ from "lodash";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import DatabaseService from "../../classes/DatabaseService";
import FileManager from "../../classes/FileManager";
import { databaseClient } from "../../singletons";
import { getOutputFolderPath, removeDir, zipFolder } from "../../utils/folderUtils";
import ExportFromIndexOptions from "./interfaces";

export default async function exportDocsFromIndex(options: ExportFromIndexOptions): Promise<void> {
  const {
    indexName,
    searchQuery = { query: { match_all: {} } },
    scrollSize = 500,
    scrollWindowTimeout = "1m",
  } = options;
  const databaseService = new DatabaseService(databaseClient);

  const foldername = `${indexName}--${uuidv4()}`;
  const outputFolderPath = getOutputFolderPath("export-from-index");
  const outputFullPath = path.join(outputFolderPath, foldername);

  console.log("Retrieving the documents, this may take awhile...");

  const documents = await databaseService.bulkRetrieveDocuments(
    indexName,
    searchQuery,
    scrollSize,
    scrollWindowTimeout,
  );

  console.log("Preparing to zip...");

  if (documents && documents.length === 0) {
    throw new Error("No documents in index!");
  }

  if (documents == undefined) {
    throw new Error("Unable to retrieve documents, please try again");
  }

  // if folder doesn't exist, create one
  if (!fsSync.existsSync(outputFullPath)) {
    await fs.mkdir(outputFullPath, { recursive: true });
  }

  // each file should contain at most 10,000 items
  const chunkedDocumentsList = _.chunk(documents, 10_000);
  let counter = 1;
  const filename = uuidv4();
  for (const chunkedDocuments of chunkedDocumentsList) {
    await FileManager.saveAsJsonLine(
      chunkedDocuments,
      path.join(outputFullPath, `${filename}-${counter}.jsonl`),
    );
    counter++;
  }

  await zipFolder(outputFullPath, outputFullPath);
  removeDir(outputFullPath); // remove the unzipped folder
  console.log(
    `Successfully exported data from index ${indexName}! File stored at: ${outputFullPath}.zip`,
  );
}
