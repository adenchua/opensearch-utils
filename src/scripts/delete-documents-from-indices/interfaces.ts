import { Search_RequestBody } from "@opensearch-project/opensearch/api/index.js";

export default interface DeleteDocumentsFromIndicesOptions {
  indices: string[];
  queryBody?: Search_RequestBody;
}
