import { Analyzer } from "@opensearch-project/opensearch/api/_types/_common.analysis.js";
import { Indices_Create_RequestBody } from "@opensearch-project/opensearch/api/index.js";

import DatabaseClient from "../../classes/DatabaseClient";
import DatabaseService from "../../classes/DatabaseService";
import InvalidConfigError from "../../errors/InvalidConfigError";
import CreateIndexOption, { CreateIndexSchema } from "./interfaces";

export default async function createIndex(options: CreateIndexOption, databaseClient: DatabaseClient): Promise<void> {
  const parseResult = CreateIndexSchema.safeParse(options);
  if (!parseResult.success) {
    throw new InvalidConfigError(
      parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    );
  }
  const {
    indexName,
    indexKnn = false,
    maxResultWindow,
    refreshInterval,
    search,
    analysis,
    shardCount = 1,
    replicaCount = 1,
    mappings,
    aliases,
  } = parseResult.data;
  const databaseService = new DatabaseService(databaseClient);

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
    aliases: (aliases ?? {}) as Record<string, object>,
  };

  await databaseService.addIndex(indexName, indexSettings);
  console.log(`Created a new index ${indexName} successfully!`);
}
