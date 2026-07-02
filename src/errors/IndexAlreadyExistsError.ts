export default class IndexAlreadyExistsError extends Error {
  constructor(message = "Index already exists") {
    super(message);
    this.name = "IndexAlreadyExistsError";
  }
}
