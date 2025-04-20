import { ALLOWED_DATE_FORMATS_TYPE } from "../../types/dateUtilsTypes";

export default interface BulkIngestDocumentsOption {
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
