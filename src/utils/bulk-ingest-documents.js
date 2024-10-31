import fs from "fs";
import path from "path";

import { databaseInstance } from "../classes/DatabaseClient.js";
import { ALLOWED_DATE_FORMATS } from "../constants.js";
import { removeDir, unzip } from "./folder-utils.js";

const INPUT_FOLDER_PATH = path.join("input", "bulk-ingest");

export async function bulkIngestJSONs({
  indexName,
  documentFileName,
  autoGenerateId = true,
  autoGenerateTimestamp = false,
  uniqueIdOptions = {},
  generatedTimestampOptions = {},
}) {
  console.log("Running bulk-ingest-documents script...");

  const tempProcessingFilePath = path.join(INPUT_FOLDER_PATH, "temp");
  const documentFilePath = path.join(INPUT_FOLDER_PATH, documentFileName);
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
    fs.access(documentFilePath, function (error) {
      if (error) {
        throw new Error(
          "Unable to locate <documentFolderName>. Please ensure the folder is located in 'input/bulk-ingest/<DOCUMENT_FOLDER_NAME>'",
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

    unzip(documentFilePath, tempProcessingFilePath, async () => {
      try {
        fs.readdirSync(tempProcessingFilePath).map((filename) => {
          const filepath = path.join(tempProcessingFilePath, filename);
          const file = JSON.parse(fs.readFileSync(filepath));
          documents.push(file);
        });
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
    });
  } catch (error) {
    console.error(error);
  }
}
