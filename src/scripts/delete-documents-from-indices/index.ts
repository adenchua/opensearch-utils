import { Search_RequestBody } from "@opensearch-project/opensearch/api/index.js";
import { confirm } from "@inquirer/prompts";

import DatabaseClient from "../../classes/DatabaseClient";
import DatabaseService from "../../classes/DatabaseService";
import InvalidConfigError from "../../errors/InvalidConfigError";
import DeleteDocumentsFromIndicesOptions, { DeleteDocumentsFromIndicesSchema } from "./interfaces";

export default async function deleteDocumentsFromIndices(
  options: DeleteDocumentsFromIndicesOptions,
  databaseClient: DatabaseClient,
): Promise<void> {
  const parseResult = DeleteDocumentsFromIndicesSchema.safeParse(options);
  if (!parseResult.success) {
    throw new InvalidConfigError(parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "));
  }
  const { indices, queryBody } = parseResult.data;
  const resolvedQueryBody = (queryBody ?? { query: { match_all: {} } }) as Search_RequestBody;
  const databaseService = new DatabaseService(databaseClient);

  console.log("\nIndices to delete by query:");
  indices.forEach((index) => {
    console.log(`  - ${index}`);
  });
  console.log("\nQuery body:");
  console.log(JSON.stringify(resolvedQueryBody, null, 2));

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
    const { deleted } = await databaseService.deleteDocumentsByQuery(index, resolvedQueryBody);
    console.log(`Deleted ${String(deleted)} document(s) from ${index}.`);
  }
}
