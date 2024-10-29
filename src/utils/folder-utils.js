import fs from "fs";
import yauzl from "yauzl";
import path from "path";

function createDir(dirName) {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
  }
}

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

export function removeDir(directory) {
  fs.rmSync(directory, { recursive: true, force: true }, (error) => {
    if (error) {
      throw error;
    }
  });
}
