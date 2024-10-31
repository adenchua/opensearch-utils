import fs from "fs";

/**
 * Deletes an existing directory
 * @param {Promise<void>} directory - directory path to delete
 */
export function removeDir(directory) {
  fs.rm(directory, { recursive: true, force: true }, (error) => {
    if (error) {
      throw error;
    }
  });
}
