import { DEFAULT_DATE_FORMAT } from "../constants.js";

function buildConfig({
  indexName,
  zipFileName = "",
  autoGenerateId = true,
  autoGenerateTimestamp = false,
  uniqueIdOptions = {
    uniqueIdKey: undefined,
    removeIdFromDocs: false,
  },
  generatedTimestampOptions = {
    timestampKey: "@timestamp",
    timestampFormat: DEFAULT_DATE_FORMAT,
  },
}) {
  return {
    indexName,
    zipFileName,
    autoGenerateId,
    autoGenerateTimestamp,
    uniqueIdOptions,
    generatedTimestampOptions,
  };
}

const sampleConfig1 = buildConfig({
  indexName: "sample-index1",
  zipFileName: "sample1.zip",
  autoGenerateId: true,
  autoGenerateTimestamp: true,
  generatedTimestampOptions: {
    timestampKey: "createdAt",
    timestampFormat: "iso8601-utc",
  },
});

const sampleConfig2 = buildConfig({
  indexName: "sample-index2",
  zipFileName: "sample2.zip",
  autoGenerateId: false,
  autoGenerateTimestamp: false,
  uniqueIdOptions: {
    uniqueIdKey: "idKey",
    removeIdFromDocs: true,
  },
});

export const BULK_INGEST_DOCUMENTS_CONFIGS = {
  sampleConfig1,
  sampleConfig2,
};
