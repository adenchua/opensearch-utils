import decompress from "decompress";
import fs from "fs";
import path from "path";

import { databaseInstance } from "../classes/DatabaseClient.js";
import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../constants.js";
import { removeDir } from "../utils/folder-utils.js";

const INPUT_FOLDER_PATH = path.join("input", "bulk-ingest");

/**
 * Ingests zip file of individual JSON records in the database
 * @property {object} options
 * @property {string} options.indexName name of the database index
 * @property {string} options.zipFileName name of the zip file to process
 * @property {boolean} options.autoGenerateId generates a document ID automatically upon ingestion
 * @property {boolean} options.autoGenerateTimestamp generates an ingestion timestamp automatically
 * @property {object} options.uniqueIdOptions options to customize document ID during ingestion
 * @property {object} options.generatedTimestampOptions options to customize ingestion timestamp
 */
export async function bulkIngestJSONs({
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
  console.log("Running bulk-ingest-documents script...");

  const tempProcessingFilePath = path.join(INPUT_FOLDER_PATH, "temp");
  const zipFilePath = path.join(INPUT_FOLDER_PATH, zipFileName);
  console.log(`Extracting documents from ${zipFilePath}...`);
  const documents = [];

  const _uniqueIdOptions = {
    autoGenerateId,
    uniqueIdKey: uniqueIdOptions.uniqueIdKey,
    removeIdFromDocs: uniqueIdOptions.removeIdFromDocs,
  };

  const _generatedTimestampOptions = {
    autoGenerateTimestamp,
    timestampKey: generatedTimestampOptions.timestampKey,
    timestampFormat: generatedTimestampOptions.timestampFormat,
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
    for (let fileName of fileNames) {
      const filepath = path.join(tempProcessingFilePath, fileName);
      const document = JSON.parse(fs.readFileSync(filepath, { encoding: "utf-8" }));
      documents.push(document);
    }

    console.log(`Extracted ${documents.length} documents. Ingesting to ${indexName}...`);

    databaseInstance.bulkIngestDocuments(
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
