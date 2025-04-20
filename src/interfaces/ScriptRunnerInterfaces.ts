import { Analyzer } from "@opensearch-project/opensearch/api/_types/_common.analysis.js";
import {
  Indices_Create_RequestBody,
  Search_RequestBody,
} from "@opensearch-project/opensearch/api/index.js";

import { ALLOWED_DATE_FORMATS_TYPE } from "../types/dateUtilsTypes";

export interface BulkIngestDocumentsOption {
  indexName: string;
  inputZipFilename: string;
  documentIdOptions?: {
    idKey: string;
    removeIdFromDocs: boolean;
  };
  generatedTimestampOptions?: {
    timestampKey: string;
    timestampFormat: ALLOWED_DATE_FORMATS_TYPE;
  };
}

export interface CreateIndexOption {
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

export interface ExportFromIndexOptions {
  indexName: string;
  searchQuery?: Search_RequestBody;
  scrollSize?: number;
  scrollWindowTimeout?: string;
}

export interface ExportMappingFromIndicesOptions {
  indices: string[];
  outputFilename?: string;
}
