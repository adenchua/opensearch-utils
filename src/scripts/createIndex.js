import { databaseInstance } from "../classes/DatabaseClient.js";

/**
 * Creates an index in OpenSearch database
 * @property {object} options
 * @property {string} options.indexName name of the database index
 * @property {number} options.shardCount index shard count
 * @property {number} options.replicaCount index replica count
 * @property {object} options.mappings OpenSearch index mapping
 * @property {object} options.aliases OpenSearch index alias
 */
export async function createIndex({
  indexName,
  shardCount = 1,
  replicaCount = 1,
  mappings = {},
  aliases = {},
}) {
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
