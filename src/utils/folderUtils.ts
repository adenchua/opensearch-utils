import fsSync from "fs";
import path from "path";
import { COMPRESSION_LEVEL, zip } from "zip-a-folder";

import { getTodayDatePrettyFormat } from "./dateUtils";

// Deletes an existing directory
export function removeDir(directory: string) {
  fsSync.rm(directory, { recursive: true, force: true }, (error) => {
    if (error) {
      throw error;
    }
  });
}

// Zips a folder from the source to destination directory
export async function zipFolder(srcDir: string, destDir: string, fileType = "zip") {
  await zip(srcDir, `${destDir}.${fileType}`, { compression: COMPRESSION_LEVEL.high });
}

export function getOutputFolderPath(foldername: string) {
  const DATE_TODAY = getTodayDatePrettyFormat();
  const OUTPUT_FOLDER = "output";

  return path.join(OUTPUT_FOLDER, foldername, DATE_TODAY);
}
