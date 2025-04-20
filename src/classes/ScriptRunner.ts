import { Indices_Create_RequestBody } from "@opensearch-project/opensearch/api/index.js";
import decompress from "decompress";
import { promises as fs, default as fsSync } from "fs";
import _ from "lodash";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { ALLOWED_DATE_FORMATS, DEFAULT_DATE_FORMAT } from "../constants";
import {
  BulkIngestDocumentsOption,
  CreateIndexOption,
  ExportFromIndexOptions,
  ExportMappingFromIndicesOptions,
} from "../interfaces/ScriptRunnerInterfaces";
import { getOutputFolderPath, removeDir, zipFolder } from "../utils/folderUtils";
import DatabaseService from "./DatabaseService";
import FileManager from "./FileManager";

const INPUT_FOLDER_PATH = path.join("input", "bulk-ingest");

export default class ScriptRunner {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  // Ingests zip file of individual JSON records in the database
  async bulkIngestDocuments(options: BulkIngestDocumentsOption): Promise<void> {
    const { indexName, inputZipFilename, documentIdOptions, generatedTimestampOptions } = options;

    const tempProcessingFilePath = path.join(INPUT_FOLDER_PATH, "temp");
    const zipFilePath = path.join(INPUT_FOLDER_PATH, inputZipFilename);
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
        const response = await this.databaseService.bulkIngestDocuments(
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

  // Creates an index in OpenSearch database
  async createIndex(options: CreateIndexOption): Promise<void> {
    const {
      indexName,
      indexKnn = false,
      maxResultWindow,
      refreshInterval,
      search,
      analysis,
      shardCount = 1,
      replicaCount = 1,
      mappings = {},
      aliases = {},
    } = options;
    const indexSettings: Indices_Create_RequestBody = {
      settings: {
        number_of_shards: shardCount,
        number_of_replicas: replicaCount,
        max_result_window: maxResultWindow,
        refresh_interval: refreshInterval,
        knn: indexKnn,
        search: {
          default_pipeline: search?.defaultPipeline,
        },
        analysis: {
          analyzer: analysis?.analyzer,
        },
      },
      mappings,
      aliases,
    };

    await this.databaseService.addIndex(indexName, indexSettings);
    console.log(`Created a new index ${indexName} successfully!`);
  }

  // Exports all documents from an index as json files
  async exportFromIndex(options: ExportFromIndexOptions): Promise<void> {
    const {
      indexName,
      searchQuery = { query: { match_all: {} } },
      scrollSize = 500,
      scrollWindowTimeout = "1m",
    } = options;

    const foldername = `${indexName}--${uuidv4()}`;
    const outputFolderPath = getOutputFolderPath("export-from-index");
    const outputFullPath = path.join(outputFolderPath, foldername);

    console.log("Retrieving the documents, this may take awhile...");

    const documents = await this.databaseService.bulkRetrieveDocuments(
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

  async exportMappingFromIndices(options: ExportMappingFromIndicesOptions): Promise<void> {
    const { indices } = options;

    const filename = uuidv4();
    const outputFolderPath = getOutputFolderPath("export-index-mapping");
    const outputFullPath = path.join(outputFolderPath, filename);

    // if folder doesn't exist, create one
    if (!fsSync.existsSync(outputFullPath)) {
      await fs.mkdir(outputFullPath, { recursive: true });
    }

    for (const index of indices) {
      const response = await this.databaseService.fetchIndexMapping(index);
      const indexMapping = response.mappings[index].mappings;
      const indexSettings = response.settings[index].settings;
      const output = { mappings: indexMapping, settings: indexSettings };
      await FileManager.saveAsJson(output, path.join(outputFullPath, `${index}.json`));
    }

    await zipFolder(outputFullPath, outputFullPath);
    removeDir(outputFullPath);

    console.log(`Successfully exported mappings! File stored at: ${outputFullPath}.zip`);
  }
}
