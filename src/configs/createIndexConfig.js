function buildConfig({ indexName, shardCount = 1, replicaCount = 1, mappings = {}, aliases = {} }) {
  return {
    indexName,
    shardCount,
    replicaCount,
    mappings,
    aliases,
  };
}

const sampleConfig1 = buildConfig({
  indexName: "sample-index1",
  shardCount: 1,
  replicaCount: 1,
  mappings: {
    properties: {
      age: {
        type: "integer",
      },
    },
  },
});

const sampleConfig2 = buildConfig({
  indexName: "sample-index2",
  shardCount: 1,
  replicaCount: 1,
  mappings: {
    properties: {
      age: {
        type: "integer",
      },
    },
  },
  aliases: {
    "sample-alias2": {},
  },
});

export const CREATE_INDEX_CONFIGS = {
  sampleConfig1,
  sampleConfig2,
};
