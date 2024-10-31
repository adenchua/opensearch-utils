import { databaseInstance } from "../classes/DatabaseClient.js";

export async function createIndex({
  indexName,
  shardCount = 1,
  replicaCount = 1,
  mappings = {},
  aliases = {},
}) {
  console.log("Running create-index script...");
  try {
    const indexSettings = {
      settings: {
        number_of_shards: shardCount,
        number_of_replicas: replicaCount,
      },
      mappings,
      aliases,
    };

    await databaseInstance.addIndex(indexName, indexSettings);
  } catch (error) {
    console.error(error);
  }
}
