import { opensearchtypes } from "@opensearch-project/opensearch";
import decompress from "decompress";
import { promises as fs, default as fsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../constants";
import { ALLOWED_DATE_FORMATS_TYPE } from "../types/dateUtilsTypes";
import {
  getOutputFolderPath,
  removeDir,
  writeDocumentToDir,
  zipFolder,
} from "../utils/folderUtils";
import DatabaseClient from "./DatabaseClient";

const INPUT_FOLDER_PATH = path.join("input", "bulk-ingest");

interface BulkIngestDocumentsOption {
  indexName: string;
  inputZipFilename: string;
  documentIdOptions?: {
    idKey: string;
    removeIdFromDocs: boolean;
  };
  generatedTimestampOptions?: {
    timestampKey: string;
    timestampFormat: ALLOWED_DATE_FORMATS_TYPE;
  };
}

interface CreateIndexOption {
  indexName: string;
  shardCount?: number;
  replicaCount?: number;
  mappings?: opensearchtypes.MappingTypeMapping;
  aliases?: { [key: string]: object };
}

interface ExportFromIndexOptions {
  indexName: string;
  searchQuery?: opensearchtypes.SearchRequest["body"];
  scrollSize?: number;
  scrollWindowTimeout?: string;
  outputFilename?: string;
}

interface ExportMappingFromIndicesOptions {
  indices: string[];
  outputFilename?: string;
}

class ScriptRunner {
  private databaseInstance: DatabaseClient;

  constructor(databaseInstance: DatabaseClient) {
    this.databaseInstance = databaseInstance;
  }

  // Ingests zip file of individual JSON records in the database
  async bulkIngestDocuments(options: BulkIngestDocumentsOption): Promise<void> {
    const { indexName, inputZipFilename, documentIdOptions, generatedTimestampOptions } = options;

    const tempProcessingFilePath = path.join(INPUT_FOLDER_PATH, "temp");
    const zipFilePath = path.join(INPUT_FOLDER_PATH, inputZipFilename);
    console.log(`Extracting documents from ${zipFilePath}...`);
    const documents: Array<object> = [];

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

      const filenames = await fs.readdir(tempProcessingFilePath);
      for (const filename of filenames) {
        const filepath = path.join(tempProcessingFilePath, filename);
        const document = JSON.parse(await fs.readFile(filepath, { encoding: "utf-8" }));
        documents.push(document);
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

      const response = await this.databaseInstance.bulkIngestDocuments(
        indexName,
        documents,
        documentIdOptions,
        generatedTimestampOptions,
      );

      const { failed, successful, total } = response;
      console.log(
        `Ingested ${successful}/${total} documents into "${indexName}"! (Failed: ${failed})`,
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

    await this.databaseInstance.addIndex(indexName, indexSettings);
    console.log(`Created a new index ${indexName} successfully!`);
  }

  // Exports all documents from an index as json files
  async exportFromIndex(options: ExportFromIndexOptions): Promise<void> {
    const {
      indexName,
      searchQuery = { query: { match_all: {} } },
      scrollSize = 500,
      scrollWindowTimeout = "1m",
      outputFilename,
    } = options;

    const filename = outputFilename || `${indexName}-${uuidv4()}`;
    const outputFolderPath = getOutputFolderPath("export-from-index");
    const outputFullPath = path.join(outputFolderPath, filename);

    if (fsSync.existsSync(`${outputFullPath}.zip`)) {
      throw new Error("output file exists, please change the outputFilename");
    }

    console.log("Retrieving the documents, this may take awhile...");

    const documents = await this.databaseInstance.bulkRetrieveDocuments(
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

    for (const document of documents) {
      await writeDocumentToDir(outputFullPath, document);
    }

    await zipFolder(outputFullPath, outputFullPath);
    removeDir(outputFullPath); // remove the unzipped folder
    console.log(
      `Successfully exported data from index ${indexName}! File stored at: ${outputFullPath}.zip`,
    );
  }

  async exportMappingFromIndices(options: ExportMappingFromIndicesOptions): Promise<void> {
    const { indices, outputFilename } = options;

    const filename = outputFilename || uuidv4();
    const outputFolderPath = getOutputFolderPath("export-index-mapping");
    const outputFullPath = path.join(outputFolderPath, filename);

    if (fsSync.existsSync(`${outputFullPath}.zip`)) {
      throw new Error("output file exists, please change the outputFilename");
    }

    for (const index of indices) {
      const response = await this.databaseInstance.fetchIndexMapping(index);
      const mapping = response[index].mappings;
      await writeDocumentToDir(outputFullPath, mapping, index);
    }

    await zipFolder(outputFullPath, outputFullPath);
    removeDir(outputFullPath);

    console.log(`Successfully exported mappings! File stored at: ${outputFullPath}.zip`);
  }
}

export default ScriptRunner;