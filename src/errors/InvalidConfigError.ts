export default class InvalidConfigError extends Error {
  constructor(message: string = "Unable to load config") {
    super(message);
    this.name = "InvalidConfigError";
  }
}
