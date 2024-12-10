import fs from "fs";
import path from "path";

import { SELECTED_CONFIG, SELECTED_SCRIPT } from "./configSelector";
import { APP_VERSION } from "./constants";

const CONFIG_PATH = path.join("configs", SELECTED_CONFIG);

function loadConfig() {
  const { parser, invokeScript, name } = SELECTED_SCRIPT;
  console.log(`Loading configuration from: ${SELECTED_CONFIG}...`);
  const options = JSON.parse(fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" }));
  const transformedOptions = parser(options);

  return { invokeScript, options: transformedOptions, name };
}

function main() {
  console.log(`Running OpenSearch-Utils version ${APP_VERSION}...`);
  const { invokeScript, options, name } = loadConfig();
  console.log(`Running ${name} script...`);
  invokeScript(options);
}

main();
