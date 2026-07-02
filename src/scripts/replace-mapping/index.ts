import { Analyzer } from "@opensearch-project/opensearch/api/_types/_common.analysis.js";
import { Indices_Create_RequestBody } from "@opensearch-project/opensearch/api/index.js";
import { confirm, input } from "@inquirer/prompts";

import DatabaseClient from "../../classes/DatabaseClient";
import DatabaseService from "../../classes/DatabaseService";
import AliasUpdateError from "../../errors/AliasUpdateError";
import IndexAlreadyExistsError from "../../errors/IndexAlreadyExistsError";
import IndexNotFoundError from "../../errors/IndexNotFoundError";
import InvalidConfigError from "../../errors/InvalidConfigError";
import ReindexVerificationError from "../../errors/ReindexVerificationError";
import ReplaceMappingOption, { ReplaceMappingSchema } from "./interfaces";

const TASK_POLL_INTERVAL_MS = 5000;
const ALIAS_CREATION_RETRIES = 3;
const ALIAS_CREATION_RETRY_DELAY_MS = 2000;

const VERSION_SUFFIX_PATTERN = /^(.*)([-_])v(\d+)$/;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Splits an index name into its version-stripped base name, separator, and next version number */
function computeNextVersion(indexName: string): { baseName: string; separator: string; nextVersion: number } {
  const match = VERSION_SUFFIX_PATTERN.exec(indexName);
  if (!match) {
    return { baseName: indexName, separator: "-", nextVersion: 1 };
  }
  const [, baseName, separator, version] = match;
  return { baseName, separator, nextVersion: Number(version) + 1 };
}

async function waitForReindexCompletion(databaseService: DatabaseService, taskId: string): Promise<void> {
  for (;;) {
    const status = await databaseService.getTaskStatus(taskId);
    const taskStatus = status.task.status as { created?: number; total?: number } | undefined;
    console.log(
      `Reindex progress: ${String(taskStatus?.created ?? 0)}/${String(taskStatus?.total ?? "?")} documents...`,
    );

    if (status.completed) {
      if (status.error) {
        throw new ReindexVerificationError(`Reindex task failed: ${JSON.stringify(status.error)}`);
      }
      return;
    }

    await sleep(TASK_POLL_INTERVAL_MS);
  }
}

async function createAliasWithRetry(
  databaseService: DatabaseService,
  aliasName: string,
  tempIndexName: string,
): Promise<void> {
  for (let attempt = 1; attempt <= ALIAS_CREATION_RETRIES; attempt++) {
    try {
      await databaseService.updateAliases([{ add: { index: tempIndexName, alias: aliasName } }]);
      return;
    } catch (error) {
      if (attempt === ALIAS_CREATION_RETRIES) {
        throw new AliasUpdateError(
          `Original index was deleted, but creating alias '${aliasName}' -> '${tempIndexName}' failed after ${String(ALIAS_CREATION_RETRIES)} attempts: ${String(error)}. ` +
            `Recover manually by creating the alias, e.g.: POST /_aliases { "actions": [{ "add": { "index": "${tempIndexName}", "alias": "${aliasName}" } }] }`,
        );
      }
      await sleep(ALIAS_CREATION_RETRY_DELAY_MS);
    }
  }
}

export default async function replaceMapping(
  options: ReplaceMappingOption,
  databaseClient: DatabaseClient,
): Promise<void> {
  const parseResult = ReplaceMappingSchema.safeParse(options);
  if (!parseResult.success) {
    throw new InvalidConfigError(parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "));
  }
  const {
    targetIndex,
    mappings,
    indexKnn = false,
    shardCount = 1,
    replicaCount = 1,
    maxResultWindow,
    refreshInterval,
    search,
    analysis,
    reindexScript,
  } = parseResult.data;
  const databaseService = new DatabaseService(databaseClient);

  // Resolve targetIndex to the underlying concrete index, whether it's an alias or a plain index
  const resolvedAliasTarget = await databaseService.resolveAlias(targetIndex);
  const sourceIndexExists = resolvedAliasTarget ? true : await databaseService.indexExists(targetIndex);
  if (!resolvedAliasTarget && !sourceIndexExists) {
    throw new IndexNotFoundError(`'${targetIndex}' does not exist as an index or alias`);
  }
  const sourceIndex = resolvedAliasTarget ?? targetIndex;
  const existingAliases = await databaseService.getAliasesForIndex(sourceIndex);

  const { baseName, separator, nextVersion } = computeNextVersion(sourceIndex);
  const tempIndexName = `${baseName}${separator}v${String(nextVersion)}`;

  let aliasName = baseName;
  if (existingAliases.length === 0) {
    aliasName = await input({
      message: "Alias name to create for this index:",
      default: baseName,
    });
  }
  const collision = existingAliases.length === 0 && aliasName === sourceIndex;

  console.log("\nReplace mapping summary:");
  console.log(`  Source index: ${sourceIndex}`);
  console.log(`  New index: ${tempIndexName}`);
  if (existingAliases.length > 0) {
    console.log(`  Alias(es) to repoint: ${existingAliases.join(", ")}`);
  } else {
    console.log(`  Alias to create: ${aliasName}`);
  }
  if (collision) {
    console.log(
      `  NOTE: '${sourceIndex}' will be deleted automatically once reindexing completes, since the new alias shares its name.`,
    );
  }
  console.log("\nNew mapping:");
  console.log(JSON.stringify(mappings, null, 2));

  const confirmed = await confirm({
    message: "Proceed with this mapping replacement?",
    default: false,
  });
  if (!confirmed) {
    console.log("Replace mapping cancelled.");
    return;
  }

  if (await databaseService.indexExists(tempIndexName)) {
    throw new IndexAlreadyExistsError(`Index '${tempIndexName}' already exists`);
  }

  const indexSettings: Indices_Create_RequestBody = {
    settings: {
      number_of_shards: shardCount,
      number_of_replicas: replicaCount,
      max_result_window: maxResultWindow,
      refresh_interval: refreshInterval,
      knn: indexKnn,
      search: {
        default_pipeline: search?.defaultPipeline,
      },
      analysis: analysis as { analyzer?: Record<string, Analyzer> } | undefined,
    },
    mappings: mappings ?? {},
  };

  console.log(`\nCreating index ${tempIndexName}...`);
  await databaseService.addIndex(tempIndexName, indexSettings);

  console.log(`Reindexing ${sourceIndex} -> ${tempIndexName}...`);
  const taskId = await databaseService.reindex(sourceIndex, tempIndexName, reindexScript);
  await waitForReindexCompletion(databaseService, taskId);

  const sourceCount = await databaseService.countDocuments(sourceIndex);
  const tempCount = await databaseService.countDocuments(tempIndexName);
  if (sourceCount !== tempCount) {
    throw new ReindexVerificationError(
      `Document count mismatch after reindex: ${sourceIndex} has ${String(sourceCount)} documents, ${tempIndexName} has ${String(tempCount)}. Both indices have been left in place for inspection.`,
    );
  }

  let sourceIndexDeleted = false;
  if (collision) {
    console.log(`Deleting original index ${sourceIndex} (alias name matches)...`);
    await databaseService.deleteIndex(sourceIndex);
    sourceIndexDeleted = true;
    await createAliasWithRetry(databaseService, aliasName, tempIndexName);
  } else if (existingAliases.length > 0) {
    await databaseService.updateAliases(
      existingAliases.flatMap((alias) => [
        { remove: { index: sourceIndex, alias } },
        { add: { index: tempIndexName, alias } },
      ]),
    );
  } else {
    await databaseService.updateAliases([{ add: { index: tempIndexName, alias: aliasName } }]);
  }

  if (!sourceIndexDeleted) {
    const deleteOriginal = await confirm({
      message: `Delete the original index '${sourceIndex}'? It is no longer referenced by any alias.`,
      default: false,
    });
    if (deleteOriginal) {
      await databaseService.deleteIndex(sourceIndex);
      sourceIndexDeleted = true;
    } else {
      console.log(`Leaving '${sourceIndex}' in place for manual cleanup.`);
    }
  }

  console.log(
    `\nDone! Alias '${existingAliases.length > 0 ? existingAliases.join(", ") : aliasName}' now points to '${tempIndexName}' (${String(tempCount)} documents). ` +
      `Original index '${sourceIndex}' was ${sourceIndexDeleted ? "deleted" : "kept"}.`,
  );
}
