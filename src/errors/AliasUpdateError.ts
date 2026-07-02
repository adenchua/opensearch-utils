export default class AliasUpdateError extends Error {
  constructor(message = "Failed to update index alias") {
    super(message);
    this.name = "AliasUpdateError";
  }
}
