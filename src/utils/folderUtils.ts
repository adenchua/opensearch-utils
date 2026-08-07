import AdmZip from "adm-zip";
import { promises as fs } from "fs";
import path from "path";

import { getTodayDatePrettyFormat } from "./dateUtils";

// Deletes an existing directory
export async function removeDir(directory: string): Promise<void> {
  await fs.rm(directory, { recursive: true, force: true });
}

// Zips a folder from the source to destination directory
export async function zipFolder(srcDir: string, destDir: string, fileType = "zip") {
  const zip = new AdmZip();
  await zip.addLocalFolderPromise(srcDir, {});
  await zip.writeZipPromise(`${destDir}.${fileType}`);
}

export function getOutputFolderPath(foldername: string) {
  const DATE_TODAY = getTodayDatePrettyFormat();
  const OUTPUT_FOLDER = "output";

  return path.join(OUTPUT_FOLDER, foldername, DATE_TODAY);
}
