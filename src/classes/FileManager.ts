import fs from "fs";
import fsPromises from "fs/promises";
import readline from "readline";

export default class FileManager {
  static async saveAsJsonLine(documents: object[], destFilepath: string) {
    for (const document of documents) {
      await fsPromises.appendFile(destFilepath, JSON.stringify(document) + "\n", "utf8");
    }
  }

  static async saveAsJson(document: object, destFilepath: string) {
    const stringifiedDocument = JSON.stringify(document);
    await fsPromises.writeFile(destFilepath, stringifiedDocument, "utf8");
  }

  static async readJsonLine(filepath: string) {
    const result: object[] = [];

    const rl = readline.createInterface({
      input: fs.createReadStream(filepath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      result.push(JSON.parse(line));
    }

    return result;
  }
}
