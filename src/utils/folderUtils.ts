import { promises as fs, default as fsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { COMPRESSION_LEVEL, zip } from "zip-a-folder";

// Deletes an existing directory
export function removeDir(directory: string) {
  fsSync.rm(directory, { recursive: true, force: true }, (error) => {
    if (error) {
      throw error;
    }
  });
}

// Writes a JSON object to a .json file
export async function writeDocumentToDir(outputDir: string, jsonDocument: object) {
  // if folder doesn't exist, create one
  if (!fsSync.existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  const uniqueFileId = uuidv4();
  const outputPath = path.join(outputDir, `${Date.now()}-${uniqueFileId}.json`);

  const stringifiedDocument = JSON.stringify(jsonDocument);
  await fs.writeFile(outputPath, stringifiedDocument, "utf8");
}

// Zips a folder from the source to destination directory
export async function zipFolder(srcDir: string, destDir: string, fileType = "zip") {
  await zip(srcDir, `${destDir}.${fileType}`, { compression: COMPRESSION_LEVEL.high });
}
