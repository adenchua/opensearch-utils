import { opensearchtypes } from "@opensearch-project/opensearch";
import { ALLOWED_DATE_FORMATS_TYPE } from "./dateUtilsTypes";

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
  shardCount?: number;
  replicaCount?: number;
  mappings?: opensearchtypes.MappingTypeMapping;
  aliases?: { [key: string]: object };
}

export interface ExportFromIndexOptions {
  indexName: string;
  searchQuery?: opensearchtypes.SearchRequest["body"];
  scrollSize?: number;
  scrollWindowTimeout?: string;
  outputFileName?: string;
}
