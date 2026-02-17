import {
  Indices_GetMapping_ResponseBody,
  Indices_GetSettings_ResponseBody,
} from "@opensearch-project/opensearch/api/index.js";
import { promises as fs, default as fsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import DatabaseService from "../../classes/DatabaseService";
import FileManager from "../../classes/FileManager";
import { databaseClient } from "../../singletons";
import { getOutputFolderPath, removeDir, zipFolder } from "../../utils/folderUtils";
import ExportMappingFromIndicesOptions from "./interfaces";

/**
 * Opensearch settings/mappings response body's first key is the index name
 * This function extracts that index name to be used to obtain the actual settings/mappings
 */
function getIndexName(obj: Indices_GetSettings_ResponseBody | Indices_GetMapping_ResponseBody) {
  return obj && Object.keys(obj).length > 0 ? Object.keys(obj)[0] : null;
}

export default async function exportMappingFromIndices(
  options: ExportMappingFromIndicesOptions,
): Promise<void> {
  const { indices } = options;
  const databaseService = new DatabaseService(databaseClient);

  const filename = uuidv4();
  const outputFolderPath = getOutputFolderPath("export-index-mapping");
  const outputFullPath = path.join(outputFolderPath, filename);

  // if folder doesn't exist, create one
  if (!fsSync.existsSync(outputFullPath)) {
    await fs.mkdir(outputFullPath, { recursive: true });
  }

  for (const index of indices) {
    const response = await databaseService.fetchIndexInfo(index);
    const indexName = getIndexName(response);

    if (indexName == null) {
      throw new Error(`Index '${index}' doesn't exist`);
    }

    const output = {
      indexName,
      shardCount: response[indexName].settings?.index?.number_of_shards,
      replicaCount: response[indexName].settings?.index?.number_of_replicas,
      mappings: response[indexName].mappings,
      analysis: response[indexName].settings?.index?.analysis,
      aliases: response[indexName].aliases,
    };

    await FileManager.saveAsJson(output, path.join(outputFullPath, `${index}.json`));
  }

  await zipFolder(outputFullPath, outputFullPath);
  removeDir(outputFullPath);

  console.log(`Successfully exported mappings! File stored at: ${outputFullPath}.zip`);
}
