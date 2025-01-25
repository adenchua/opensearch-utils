export default class DatabaseConnectionError extends Error {
  constructor(message: string = "Failed to establish a connection to the database") {
    super(message);
    this.name = "DatabaseConnectionError";
  }
}
