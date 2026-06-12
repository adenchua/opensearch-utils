export default interface BulkIngestDocumentsOption {
  indexName?: string;
  inputZipPaths?: string[];
  documentIdOptions?: {
    idKey?: string;
    removeIdFromDocs?: boolean;
  };
  generatedTimestampOptions?: {
    timestampKey?: string;
    timestampFormat?: string;
  };
}
