import fs from "fs";
import fsPromises from "fs/promises";
import readline from "readline";

export async function saveAsJsonLine(documents: object[], destFilepath: string) {
  for (const document of documents) {
    await fsPromises.appendFile(destFilepath, JSON.stringify(document) + "\n", "utf8");
  }
}

export async function saveAsJson(document: object, destFilepath: string) {
  const stringifiedDocument = JSON.stringify(document);
  await fsPromises.writeFile(destFilepath, stringifiedDocument, "utf8");
}

export async function readJsonLine(filepath: string) {
  const result: object[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filepath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    result.push(JSON.parse(line) as object);
  }

  return result;
}
