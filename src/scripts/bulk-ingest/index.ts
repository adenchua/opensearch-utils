import decompress from "decompress";
import { promises as fs } from "fs";
import _ from "lodash";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import DatabaseClient from "../../classes/DatabaseClient";
import DatabaseService from "../../classes/DatabaseService";
import { readJsonLine } from "../../classes/FileManager";
import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../../constants";
import InvalidConfigError from "../../errors/InvalidConfigError";
import { ALLOWED_DATE_FORMATS_TYPE } from "../../types/dateUtilsTypes";
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
    throw new InvalidConfigError("indexName is required");
  }

  if (!inputZipPaths || inputZipPaths.length === 0) {
    throw new InvalidConfigError("inputZipPaths must not be an empty array");
  }

  if (inputZipPaths.some((p) => !p)) {
    throw new InvalidConfigError("inputZipPaths must not contain empty strings");
  }

  let resolvedDocIdOptions: { idKey: string; removeIdFromDocs: boolean } | undefined;
  if (documentIdOptions) {
    if (!documentIdOptions.idKey) {
      throw new InvalidConfigError(
        "A documentIdOptions.idKey is required for generation of a custom primary key",
      );
    }
    resolvedDocIdOptions = {
      idKey: documentIdOptions.idKey,
      removeIdFromDocs: documentIdOptions.removeIdFromDocs ?? true,
    };
  }

  let resolvedTimestampOptions:
    | { timestampKey: string; timestampFormat: ALLOWED_DATE_FORMATS_TYPE }
    | undefined;
  if (generatedTimestampOptions) {
    const { timestampFormat, timestampKey } = generatedTimestampOptions;
    if (timestampFormat && !(ALLOWED_DATE_FORMATS as readonly string[]).includes(timestampFormat)) {
      throw new InvalidConfigError(
        "Unsupported date format provided for generatedTimestampOptions.timestampFormat",
      );
    }
    resolvedTimestampOptions = {
      timestampFormat: (timestampFormat ?? DEFAULT_DATE_FORMAT) as ALLOWED_DATE_FORMATS_TYPE,
      timestampKey: timestampKey ?? "@timestamp",
    };
  }

  const cleanupPromises: Promise<void>[] = [];

  for (const [i, zipPath] of inputZipPaths.entries()) {
    const zipFilePath = path.join(srcFolderPath, zipPath);
    const tempProcessingFilePath = path.join(srcFolderPath, `temp-${uuidv4()}`);
    try {
      console.log(
        `[${String(i + 1)}/${String(inputZipPaths.length)}] Extracting from ${zipFilePath}...`,
      );

      await fs.access(zipFilePath).catch((error: unknown) => {
        console.error(error);
      });
      await decompress(zipFilePath, tempProcessingFilePath);

      const documents: object[] = [];
      const filenames = await fs.readdir(tempProcessingFilePath);
      for (const filename of filenames) {
        const filepath = path.join(tempProcessingFilePath, filename);
        const tempDocuments = await readJsonLine(filepath);
        documents.push(...tempDocuments);
      }

      console.log(`Extracted ${String(documents.length)} documents. Ingesting to ${indexName}...`);

      const CHUNK_SIZE = 10_000;
      const documentChunks = _.chunk(documents, CHUNK_SIZE);

      const totalDocuments = documents.length;
      let totalSucceeded = 0;
      let totalFailed = 0;

      for (const documentChunk of documentChunks) {
        const response = await databaseService.bulkIngestDocuments(
          indexName,
          documentChunk,
          resolvedDocIdOptions,
          resolvedTimestampOptions,
          (document, error) => {
            const doc = document as Record<string, unknown>;
            const docId = resolvedDocIdOptions ? doc[resolvedDocIdOptions.idKey] : undefined;
            const idPart =
              typeof docId === "string" || typeof docId === "number"
                ? `_id: ${String(docId)}`
                : "no _id";
            console.error(`[bulk ingest] Document failed (${idPart}): ${error.reason}`);
          },
        );

        const { failed, successful } = response;
        totalSucceeded += successful;
        totalFailed += failed;

        console.log(
          `Ingested ${String(totalSucceeded)}/${String(totalDocuments)} documents into "${indexName}"! (Failed: ${String(totalFailed)})`,
        );
      }
    } catch (error) {
      console.error(
        `[${String(i + 1)}/${String(inputZipPaths.length)}] Failed to process ${zipFilePath}:`,
        error,
      );
    } finally {
      cleanupPromises.push(
        removeDir(tempProcessingFilePath).catch((error: unknown) => {
          console.error(`Failed to clean up ${tempProcessingFilePath}:`, error);
        }),
      );
    }
  }

  await Promise.all(cleanupPromises);
}
