import { select } from "@inquirer/prompts";
import { promises as fs } from "fs";
import path from "path";

import { APP_VERSION } from "./constants";
import DatabaseConnectionError from "./errors/DatabaseConnectionError";
import InvalidConfigError from "./errors/InvalidConfigError";
import bulkIngestDocuments from "./scripts/bulk-ingest";
import createIndex from "./scripts/create-index";
import exportDocsFromIndex from "./scripts/export-docs-from-index";
import exportMappingFromIndices from "./scripts/export-mapping-from-indices";
import { databaseClient } from "./singletons";

type ScriptSelectionType =
  | "CREATE_INDEX"
  | "BULK_INGEST"
  | "EXPORT_FROM_INDEX"
  | "EXPORT_INDEX_MAPPING";

/** Prompts the user to select a script */
async function runScriptSelectionPrompt(): Promise<ScriptSelectionType> {
  const result: ScriptSelectionType = await select({
    message: "Select a script to run:",
    choices: [
      {
        name: "1. Bulk ingest documents",
        value: "BULK_INGEST",
        description: "Ingests jsonl documents from an input folder into an index",
      },
      {
        name: "2. Create new index",
        value: "CREATE_INDEX",
        description: "Create a new index",
      },
      {
        name: "3. Export documents from index",
        value: "EXPORT_FROM_INDEX",
        description: "Exports documents from an index as json files",
      },
      {
        name: "4. Export indices mapping",
        value: "EXPORT_INDEX_MAPPING",
        description:
          "Exports mappings from a list of indices and save them as individual json objects",
      },
    ],
  });

  return result;
}

async function runScript(selectedScript: ScriptSelectionType): Promise<void> {
  let selectedConfig;

  switch (selectedScript) {
    case "CREATE_INDEX":
      selectedConfig = await runConfigSelectionPrompt("create-index");
      createIndex(selectedConfig);
      break;
    case "BULK_INGEST":
      selectedConfig = await runConfigSelectionPrompt("bulk-ingest");
      bulkIngestDocuments(selectedConfig, path.join("input", "bulk-ingest"));
      break;
    case "EXPORT_FROM_INDEX":
      selectedConfig = await runConfigSelectionPrompt("export-from-index");
      exportDocsFromIndex(selectedConfig);
      break;
    case "EXPORT_INDEX_MAPPING":
      selectedConfig = await runConfigSelectionPrompt("export-mapping-from-indices");
      exportMappingFromIndices(selectedConfig);
      break;
    default:
      throw new InvalidConfigError();
  }
}

/** Prompt the user to select a config for a given script */
async function runConfigSelectionPrompt(foldername: string) {
  const configPath = path.join("configs", foldername);
  const filenames = await fs.readdir(configPath);
  const configInput = await select({
    message: "Select a config:",
    choices: filenames.map((filename) => {
      return {
        name: filename,
        value: filename,
      };
    }),
  });

  const configFilepath = path.join(configPath, configInput);
  const result = JSON.parse(await fs.readFile(configFilepath, { encoding: "utf-8" }));

  return result;
}

async function run() {
  console.log(`Running OpenSearch-Utils version ${APP_VERSION}...`);

  const connectionSuccessful = await databaseClient.ping();
  const databaseURL = databaseClient.getDatabaseURL();

  if (!connectionSuccessful) {
    throw new DatabaseConnectionError();
  } else {
    console.log("Connected to database successfully!");
    console.log("Connected to database:", databaseURL);
  }

  const selectedScript = await runScriptSelectionPrompt();
  runScript(selectedScript);
}

run();
