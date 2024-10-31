import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { COMPRESSION_LEVEL, zip } from "zip-a-folder";

/**
 * Deletes an existing directory
 * @param {Promise<void>} directory - directory path to delete
 */
export function removeDir(directory) {
  fs.rmSync(directory, { recursive: true, force: true }, (error) => {
    if (error) {
      throw error;
    }
  });
}

/**
 * Writes a JSON object to a .json file
 * @param {string} outputDir directory to save the .json file
 * @param {object} jsonDocument JSON object
 */
export function writeDocumentToDir(outputDir, jsonDocument) {
  // if folder doesn't exist, create one
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const uniqueFileId = uuidv4();
  const outputPath = path.join(outputDir, `${Date.now()}-${uniqueFileId}.json`);

  const stringifiedDocument = JSON.stringify(jsonDocument);
  fs.writeFileSync(outputPath, stringifiedDocument, "utf8");
}

/**
 * Zips a folder from the source to destination directory
 * @param {string} srcDir source directory
 * @param {string} destDir destination directory
 * @param {string} fileType zip file type. Defaults to "zip"
 */
export async function zipFolder(srcDir, destDir, fileType = "zip") {
  await zip(srcDir, `${destDir}.${fileType}`, { compression: COMPRESSION_LEVEL.high });
}
