function buildConfig({
  indexName,
  searchQuery = { query: { match_all: {} } },
  scrollSize = 500,
  scrollWindowTimeout = "1m",
  outputFileName,
}) {
  return {
    indexName,
    searchQuery,
    scrollSize,
    scrollWindowTimeout,
    outputFileName,
  };
}

const sampleConfig1 = buildConfig({
  indexName: "sample-index1",
});

const sampleConfig2 = buildConfig({
  indexName: "sample-index2",
  scrollSize: 1000,
  scrollWindowTimeout: "1m",
  outputFileName: "sample-output2",
});

export const EXPORT_FROM_INDEX_CONFIGS = {
  sampleConfig1,
  sampleConfig2,
};
