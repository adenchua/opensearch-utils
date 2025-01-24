import fsPromises from "fs/promises";

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
}
