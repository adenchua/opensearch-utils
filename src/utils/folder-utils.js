import fs from "fs";
import yauzl from "yauzl";
import path from "path";

/**
 * Creates a directory if it doesn't exist
 * @param {string} dirName - name of the directory
 */
function createDir(dirName) {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
  }
}

/**
 * Unzips a .zip file and write to a destination folder
 * Executes a callback function after the files are written
 * @param {string} srcPath - source path of the zip file
 * @param {string} destPath - destination path for the unzipped file. Creates directory if doesn't exist
 * @param {Function} callbackFn - callback function to execute upon unzipping content of the zipped file
 */
export function unzip(srcPath, destPath, callbackFn) {
  createDir(destPath); // create the folder first

  yauzl.open(srcPath, { lazyEntries: true }, function (error, zipFile) {
    if (error) {
      throw error;
    }

    zipFile.readEntry();

    zipFile.on("entry", function (entry) {
      const writer = fs.createWriteStream(path.join(destPath, entry.fileName));
      zipFile.openReadStream(entry, function (error, readStream) {
        if (error) {
          throw error;
        }
        readStream.on("end", function () {
          zipFile.readEntry();
        });
        readStream.pipe(writer);
      });
    });

    zipFile.on("end", function () {
      callbackFn();
    });
  });
}

/**
 * Deletes an existing directory
 * @param {string} directory - directory path to delete
 */
export function removeDir(directory) {
  fs.rmSync(directory, { recursive: true, force: true }, (error) => {
    if (error) {
      throw error;
    }
  });
}
