import { promises as fs, default as fsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import DatabaseService from "../../classes/DatabaseService";
import FileManager from "../../classes/FileManager";
import { databaseClient } from "../../singletons";
import { getOutputFolderPath, removeDir, zipFolder } from "../../utils/folderUtils";
import ExportMappingFromIndicesOptions from "./interfaces";

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
    const response = await databaseService.fetchIndexMapping(index);
    const indexMapping = response.mappings[index].mappings;
    const indexSettings = response.settings[index].settings;
    const output = { mappings: indexMapping, settings: indexSettings };
    await FileManager.saveAsJson(output, path.join(outputFullPath, `${index}.json`));
  }

  await zipFolder(outputFullPath, outputFullPath);
  removeDir(outputFullPath);

  console.log(`Successfully exported mappings! File stored at: ${outputFullPath}.zip`);
}
