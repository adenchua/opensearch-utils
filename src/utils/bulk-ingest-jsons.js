import { databaseInstance } from "../classes/DatabaseClient.js";

export async function bulkIngestJSONs({ indexName, documents, uniqueIdFieldName, createdAtFieldName }) {
  try {
    await databaseInstance.bulkIngestDocuments(indexName, documents, uniqueIdFieldName, createdAtFieldName);
  } catch (error) {
    console.error(error);
  }
}
