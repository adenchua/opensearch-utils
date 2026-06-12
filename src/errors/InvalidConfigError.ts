export default class InvalidConfigError extends Error {
  constructor(message = "Unable to load config") {
    super(message);
    this.name = "InvalidConfigError";
  }
}
