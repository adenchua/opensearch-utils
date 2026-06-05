import { Search_RequestBody } from "@opensearch-project/opensearch/api/index.js";

export default interface DeleteDocumentsFromIndexOptions {
  indices: string[];
  queryBody?: Search_RequestBody;
}
