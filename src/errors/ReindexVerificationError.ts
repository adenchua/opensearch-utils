export default class ReindexVerificationError extends Error {
  constructor(message = "Document count mismatch after reindex") {
    super(message);
    this.name = "ReindexVerificationError";
  }
}
