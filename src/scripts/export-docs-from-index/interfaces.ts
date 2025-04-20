import { Search_RequestBody } from "@opensearch-project/opensearch/api/index.js";

export default interface ExportFromIndexOptions {
  indexName: string;
  searchQuery?: Search_RequestBody;
  scrollSize?: number;
  scrollWindowTimeout?: string;
}
