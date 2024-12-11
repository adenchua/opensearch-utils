import { opensearchtypes } from "@opensearch-project/opensearch";
import decompress from "decompress";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../constants";
import {
  BulkIngestDocumentsOption,
  CreateIndexOption,
  ExportFromIndexOptions,
} from "../types/OpenSearchUtilsTypes";
import { getTodayDatePrettyFormat } from "../utils/dateUtils";
import { removeDir, writeDocumentToDir, zipFolder } from "../utils/folderUtils";
import { databaseInstance } from "./DatabaseClient";

const dateToday = getTodayDatePrettyFormat();
const OUTPUT_PATH = path.join("output", "export-from-index", dateToday);
const INPUT_FOLDER_PATH = path.join("input", "bulk-ingest");

class OpenSearchUtils {
  // Ingests zip file of individual JSON records in the database
  async bulkIngestDocuments(options: BulkIngestDocumentsOption): Promise<void> {
    const {
      indexName,
      zipFileName = "",
      autoGenerateId = true,
      autoGenerateTimestamp = false,
      uniqueIdOptions = {
        uniqueIdKey: "_id",
        removeIdFromDocs: false,
      },
      generatedTimestampOptions = {
        timestampKey: "@timestamp",
        timestampFormat: DEFAULT_DATE_FORMAT,
      },
    } = options;

    const tempProcessingFilePath = path.join(INPUT_FOLDER_PATH, "temp");
    const zipFilePath = path.join(INPUT_FOLDER_PATH, zipFileName);
    console.log(`Extracting documents from ${zipFilePath}...`);
    const documents = [];

    const _uniqueIdOptions = {
      autoGenerateId,
      uniqueIdKey: uniqueIdOptions.uniqueIdKey!,
      removeIdFromDocs: uniqueIdOptions.removeIdFromDocs!,
    };

    const _generatedTimestampOptions = {
      autoGenerateTimestamp,
      timestampKey: generatedTimestampOptions.timestampKey!,
      timestampFormat: generatedTimestampOptions.timestampFormat!,
    };

    try {
      if (!indexName) {
        throw new Error("indexName is required");
      }

      fs.access(zipFilePath, function (error) {
        if (error) {
          throw new Error(
            "Unable to locate <zipFileName>. Please ensure the folder is located in 'input/bulk-ingest/<ZIP_FILE_NAME>'",
          );
        }
      });

      if (!autoGenerateId) {
        const { uniqueIdKey } = uniqueIdOptions;
        if (uniqueIdKey == undefined) {
          throw new Error(
            "A uniqueIdOptions.uniqueIdKey is required for generation of a custom primary key",
          );
        }
      }

      if (autoGenerateTimestamp) {
        const { timestampFormat } = generatedTimestampOptions;
        if (timestampFormat && !ALLOWED_DATE_FORMATS.includes(timestampFormat)) {
          throw new Error(
            "Unsupported date format provided for generatedTimestampOptions.timestampFormat",
          );
        }
      }

      await decompress(zipFilePath, tempProcessingFilePath);

      const fileNames = fs.readdirSync(tempProcessingFilePath);
      for (const fileName of fileNames) {
        const filepath = path.join(tempProcessingFilePath, fileName);
        const document = JSON.parse(fs.readFileSync(filepath, { encoding: "utf-8" }));
        documents.push(document);
      }

      console.log(`Extracted ${documents.length} documents. Ingesting to ${indexName}...`);

      await databaseInstance.bulkIngestDocuments(
        indexName,
        documents,
        _uniqueIdOptions,
        _generatedTimestampOptions,
      );
    } catch (error) {
      console.error(error);
    } finally {
      removeDir(tempProcessingFilePath); // cleanup artifact after upload/failure
    }
  }

  // Creates an index in OpenSearch database
  async createIndex(options: CreateIndexOption): Promise<void> {
    const { indexName, shardCount = 1, replicaCount = 1, mappings = {}, aliases = {} } = options;
    const indexSettings: opensearchtypes.IndicesPutTemplateRequest["body"] = {
      settings: {
        number_of_shards: shardCount,
        number_of_replicas: replicaCount,
      },
      mappings,
      aliases,
    };

    await databaseInstance.addIndex(indexName, indexSettings);
  }

  // Exports all documents from an index as json files
  async exportFromIndex(options: ExportFromIndexOptions): Promise<void> {
    const {
      indexName,
      searchQuery = { query: { match_all: {} } },
      scrollSize = 500,
      scrollWindowTimeout = "1m",
      outputFileName,
    } = options;
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
  }
}

export default OpenSearchUtils;
