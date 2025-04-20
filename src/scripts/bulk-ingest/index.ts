import decompress from "decompress";
import { promises as fs } from "fs";
import _ from "lodash";
import path from "path";

import DatabaseService from "../../classes/DatabaseService";
import FileManager from "../../classes/FileManager";
import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../../constants";
import { databaseClient } from "../../singletons";
import { removeDir } from "../../utils/folderUtils";
import BulkIngestDocumentsOption from "./interfaces";

export default async function bulkIngestDocuments(
  options: BulkIngestDocumentsOption,
  srcFolderPath: string,
): Promise<void> {
  const { indexName, inputZipFilename, documentIdOptions, generatedTimestampOptions } = options;
  const databaseService = new DatabaseService(databaseClient);

  const tempProcessingFilePath = path.join(srcFolderPath, "temp");
  const zipFilePath = path.join(srcFolderPath, inputZipFilename);
  console.log(`Extracting documents from ${zipFilePath}...`);

  try {
    if (!indexName) {
      throw new Error("indexName is required");
    }

    if (inputZipFilename === "") {
      throw new Error("inputZipFilename must not be an empty string");
    }

    await fs.access(zipFilePath).catch((error) => console.error(error));

    if (documentIdOptions) {
      const { idKey } = documentIdOptions;
      if (idKey == undefined) {
        throw new Error(
          "A documentIdOptions.idKey is required for generation of a custom primary key",
        );
      }
    }

    if (generatedTimestampOptions) {
      const { timestampFormat } = generatedTimestampOptions;
      // timestamp provided but not a valid one, throw error
      if (timestampFormat && !ALLOWED_DATE_FORMATS.includes(timestampFormat)) {
        throw new Error(
          "Unsupported date format provided for generatedTimestampOptions.timestampFormat",
        );
      }
    }

    await decompress(zipFilePath, tempProcessingFilePath);

    const documents: Array<object> = [];
    const filenames = await fs.readdir(tempProcessingFilePath);
    for (const filename of filenames) {
      const filepath = path.join(tempProcessingFilePath, filename);
      const tempDocuments = await FileManager.readJsonLine(filepath);
      documents.push(...tempDocuments);
    }

    console.log(`Extracted ${documents.length} documents. Ingesting to ${indexName}...`);

    // add default values for some fields of documentIdOptions
    if (documentIdOptions) {
      const { removeIdFromDocs } = documentIdOptions;

      // if remove document id from docs not provided, set it to true
      if (removeIdFromDocs == undefined) {
        documentIdOptions.removeIdFromDocs = true;
      }
    }

    // add default values for some of generatedTimestampOptions
    if (generatedTimestampOptions) {
      const { timestampFormat, timestampKey } = generatedTimestampOptions;

      // if timestamp format not provided, set to default date
      if (timestampFormat == undefined) {
        generatedTimestampOptions.timestampFormat = DEFAULT_DATE_FORMAT;
      }

      // if timestamp key not provided, set to '@timestamp'
      if (timestampKey == undefined) {
        generatedTimestampOptions.timestampKey = "@timestamp";
      }
    }

    const CHUNK_SIZE = 10_000;
    const documentChunks = _.chunk(documents, CHUNK_SIZE);

    const totalDocuments = documents.length;
    let totalSucceeded = 0;
    let totalFailed = 0;

    for (const documentChunk of documentChunks) {
      const response = await databaseService.bulkIngestDocuments(
        indexName,
        documentChunk,
        documentIdOptions,
        generatedTimestampOptions,
      );

      const { failed, successful } = response;
      totalSucceeded += successful;
      totalFailed += failed;

      console.log(
        `Ingested ${totalSucceeded}/${totalDocuments} documents into "${indexName}"! (Failed: ${totalFailed})`,
      );
    }
  } catch (error) {
    console.error(error);
  } finally {
    removeDir(tempProcessingFilePath); // cleanup artifact after upload/failure
  }
}
