import decompress from "decompress";
import { promises as fs } from "fs";
import _ from "lodash";
import path from "path";

import DatabaseClient from "../../classes/DatabaseClient";
import DatabaseService from "../../classes/DatabaseService";
import FileManager from "../../classes/FileManager";
import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../../constants";
import { removeDir } from "../../utils/folderUtils";
import BulkIngestDocumentsOption from "./interfaces";

export default async function bulkIngestDocuments(
  options: BulkIngestDocumentsOption,
  srcFolderPath: string,
  databaseClient: DatabaseClient,
): Promise<void> {
  const { indexName, inputZipPaths, documentIdOptions, generatedTimestampOptions } = options;
  const databaseService = new DatabaseService(databaseClient);

  if (!indexName) {
    throw new Error("indexName is required");
  }

  if (!inputZipPaths || inputZipPaths.length === 0) {
    throw new Error("inputZipPaths must not be an empty array");
  }

  if (inputZipPaths.some((p) => p === "")) {
    throw new Error("inputZipPaths must not contain empty strings");
  }

  if (documentIdOptions) {
    const { idKey } = documentIdOptions;
    if (idKey == undefined) {
      throw new Error("A documentIdOptions.idKey is required for generation of a custom primary key");
    }
  }

  if (generatedTimestampOptions) {
    const { timestampFormat } = generatedTimestampOptions;
    if (timestampFormat && !ALLOWED_DATE_FORMATS.includes(timestampFormat)) {
      throw new Error("Unsupported date format provided for generatedTimestampOptions.timestampFormat");
    }
  }

  if (documentIdOptions && documentIdOptions.removeIdFromDocs == undefined) {
    documentIdOptions.removeIdFromDocs = true;
  }

  if (generatedTimestampOptions) {
    if (generatedTimestampOptions.timestampFormat == undefined) {
      generatedTimestampOptions.timestampFormat = DEFAULT_DATE_FORMAT;
    }
    if (generatedTimestampOptions.timestampKey == undefined) {
      generatedTimestampOptions.timestampKey = "@timestamp";
    }
  }

  const tempProcessingFilePath = path.join(srcFolderPath, "temp");

  for (const [i, zipPath] of inputZipPaths.entries()) {
    const zipFilePath = path.join(srcFolderPath, zipPath);
    try {
      console.log(`[${i + 1}/${inputZipPaths.length}] Extracting from ${zipFilePath}...`);

      await fs.access(zipFilePath).catch((error) => console.error(error));
      await decompress(zipFilePath, tempProcessingFilePath);

      const documents: Array<object> = [];
      const filenames = await fs.readdir(tempProcessingFilePath);
      for (const filename of filenames) {
        const filepath = path.join(tempProcessingFilePath, filename);
        const tempDocuments = await FileManager.readJsonLine(filepath);
        documents.push(...tempDocuments);
      }

      console.log(`Extracted ${documents.length} documents. Ingesting to ${indexName}...`);

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
          (document, error) => {
            const doc = document as Record<string, unknown>;
            const docId = documentIdOptions ? doc[documentIdOptions.idKey] : undefined;
            const idPart = docId != null ? `_id: ${String(docId)}` : "no _id";
            console.error(`[bulk ingest] Document failed (${idPart}): ${error.reason}`);
          },
        );

        const { failed, successful } = response;
        totalSucceeded += successful;
        totalFailed += failed;

        console.log(
          `Ingested ${totalSucceeded}/${totalDocuments} documents into "${indexName}"! (Failed: ${totalFailed})`,
        );
      }
    } catch (error) {
      console.error(`[${i + 1}/${inputZipPaths.length}] Failed to process ${zipFilePath}:`, error);
    } finally {
      removeDir(tempProcessingFilePath);
    }
  }
}
