import { select } from "@inquirer/prompts";
import { promises as fs } from "fs";
import path from "path";

import DatabaseClient from "./classes/DatabaseClient";
import ScriptRunner from "./classes/ScriptRunner";
import {
  APP_VERSION,
  AUTHENTICATION_METHOD,
  BASIC_AUTH_FILE_PATH,
  CERT_AUTH_CERT_FILE_PATH,
  CERT_AUTH_KEY_FILE_PATH,
  DATABASE_URL,
  ROOT_CA_FILE_PATH,
  VALIDATE_SSL,
} from "./constants";

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
        name: "Bulk ingest documents",
        value: "BULK_INGEST",
        description: "Ingests json documents from an input folder into an index",
      },
      {
        name: "Create new index",
        value: "CREATE_INDEX",
        description: "Create a new index",
      },
      {
        name: "Export documents from index",
        value: "EXPORT_FROM_INDEX",
        description: "Exports documents from an index as json files",
      },
      {
        name: "Extract indices mapping",
        value: "EXPORT_INDEX_MAPPING",
        description:
          "Exports mappings from a list of indices and save them as individual json objects",
      },
    ],
  });

  return result;
}

async function runScript(
  scriptRunner: ScriptRunner,
  selectedScript: ScriptSelectionType,
): Promise<void> {
  let selectedConfig;

  switch (selectedScript) {
    case "CREATE_INDEX":
      selectedConfig = await runConfigSelectionPrompt("create-index");
      scriptRunner.createIndex(selectedConfig);
      break;
    case "BULK_INGEST":
      selectedConfig = await runConfigSelectionPrompt("bulk-ingest");
      scriptRunner.bulkIngestDocuments(selectedConfig);
      break;
    case "EXPORT_FROM_INDEX":
      selectedConfig = await runConfigSelectionPrompt("export-from-index");
      scriptRunner.exportFromIndex(selectedConfig);
      break;
    case "EXPORT_INDEX_MAPPING":
      selectedConfig = await runConfigSelectionPrompt("export-mapping-from-indices");
      scriptRunner.exportMappingFromIndices(selectedConfig);
      break;
    default:
      throw new Error("Unable to load config, please try again");
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

  const databaseClient = new DatabaseClient({
    databaseUrl: DATABASE_URL,
    authenticationMethod: AUTHENTICATION_METHOD as "BASIC_AUTH" | "CERTIFICATE_AUTH",
    basicAuthFilepath: BASIC_AUTH_FILE_PATH,
    certFilepath: CERT_AUTH_CERT_FILE_PATH,
    keyFilepath: CERT_AUTH_KEY_FILE_PATH,
    rootCAFilepath: ROOT_CA_FILE_PATH,
    rejectUnauthorized: VALIDATE_SSL,
  });

  const connectionSuccessful = await databaseClient.ping();

  if (!connectionSuccessful) {
    throw new Error("Failed to connect to database");
  } else {
    console.log("Connected to database successfully!");
  }

  const scriptRunner = new ScriptRunner(databaseClient);
  const selectedScript = await runScriptSelectionPrompt();
  runScript(scriptRunner, selectedScript);
}

run();
