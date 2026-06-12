export default class InvalidDatabaseIndexError extends Error {
  constructor(message = "Database index cannot be an empty string") {
    super(message);
    this.name = "InvalidDatabaseIndexError";
  }
}
