export default class InvalidDatabaseIndexError extends Error {
  constructor(message: string = "Database index cannot be an empty string") {
    super(message);
    this.name = "InvalidDatabaseIndexError";
  }
}
