import { Analyzer } from "@opensearch-project/opensearch/api/_types/_common.analysis.js";
import { Indices_Create_RequestBody } from "@opensearch-project/opensearch/api/index.js";

export default interface CreateIndexOption {
  indexName: string;
  indexKnn?: boolean;
  shardCount?: number;
  replicaCount?: number;
  maxResultWindow?: number;
  refreshInterval?: string;
  search?: {
    defaultPipeline?: string;
  };
  analysis?: {
    analyzer?: Record<string, Analyzer>;
  };
  mappings?: Indices_Create_RequestBody["mappings"];
  aliases?: { [key: string]: object };
}
