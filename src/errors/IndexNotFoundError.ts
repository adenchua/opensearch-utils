export default class IndexNotFoundError extends Error {
  constructor(message = "Index does not exist as a concrete index or an alias") {
    super(message);
    this.name = "IndexNotFoundError";
  }
}
