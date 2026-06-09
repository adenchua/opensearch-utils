import { confirm } from "@inquirer/prompts";

import DatabaseClient from "../../classes/DatabaseClient";
import DatabaseService from "../../classes/DatabaseService";
import InvalidConfigError from "../../errors/InvalidConfigError";
import DeleteDocumentsFromIndicesOptions from "./interfaces";

export default async function deleteDocumentsFromIndices(
  options: DeleteDocumentsFromIndicesOptions,
  databaseClient: DatabaseClient,
): Promise<void> {
  const { indices, queryBody = { query: { match_all: {} } } } = options;
  const databaseService = new DatabaseService(databaseClient);

  if (!indices || !Array.isArray(indices) || indices.length === 0) {
    throw new InvalidConfigError("Config field 'indices' must be a non-empty array");
  }
  if (indices.some((i) => !i)) {
    throw new InvalidConfigError("Config field 'indices' must not contain empty strings");
  }

  console.log("\nIndices to delete by query:");
  indices.forEach((index) => console.log(`  - ${index}`));
  console.log("\nQuery body:");
  console.log(JSON.stringify(queryBody, null, 2));

  const confirmed = await confirm({
    message: "Are you sure you want to delete these documents? This cannot be undone.",
    default: false,
  });

  if (!confirmed) {
    console.log("Deletion cancelled.");
    return;
  }

  for (const index of indices) {
    console.log(`\nDeleting documents from index: ${index}...`);
    const { deleted } = await databaseService.deleteDocumentsByQuery(index, queryBody);
    console.log(`Deleted ${deleted} document(s) from ${index}.`);
  }
}
