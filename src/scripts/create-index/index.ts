import { Indices_Create_RequestBody } from "@opensearch-project/opensearch/api/index.js";

import DatabaseService from "../../classes/DatabaseService";
import { databaseClient } from "../../singletons";
import CreateIndexOption from "./interfaces";

export default async function createIndex(options: CreateIndexOption): Promise<void> {
  const {
    indexName,
    indexKnn = false,
    maxResultWindow,
    refreshInterval,
    search,
    analysis,
    shardCount = 1,
    replicaCount = 1,
    mappings = {},
    aliases = {},
  } = options;
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
      analysis: {
        analyzer: analysis?.analyzer,
      },
    },
    mappings,
    aliases,
  };

  await databaseService.addIndex(indexName, indexSettings);
  console.log(`Created a new index ${indexName} successfully!`);
}
