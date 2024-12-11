import { select } from "@inquirer/prompts";
import { promises as fs } from "fs";
import path from "path";

import OpenSearchUtils from "./classes/OpensearchUtils";
import { APP_VERSION } from "./constants";

type SelectionType = "CREATE_INDEX" | "BULK_INGEST" | "EXPORT_FROM_INDEX";

async function getSelectedScript(): Promise<SelectionType> {
  const result: SelectionType = await select({
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
    ],
  });

  return result;
}

async function getConfig(foldername: string) {
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

  const openSearchUtils = new OpenSearchUtils();

  const selectedScript = await getSelectedScript();
  let selectedConfig;

  switch (selectedScript) {
    case "CREATE_INDEX":
      selectedConfig = await getConfig("create-index");
      break;
    case "BULK_INGEST":
      selectedConfig = await getConfig("bulk-ingest");
      break;
    case "EXPORT_FROM_INDEX":
      selectedConfig = await getConfig("export-from-index");
      break;
    default:
      throw new Error("Unable to load config, please try again");
  }

  switch (selectedScript) {
    case "CREATE_INDEX":
      openSearchUtils.createIndex(selectedConfig);
      break;
    case "BULK_INGEST":
      openSearchUtils.bulkIngestDocuments(selectedConfig);
      break;
    case "EXPORT_FROM_INDEX":
      openSearchUtils.exportFromIndex(selectedConfig);
      break;
    default:
      throw new Error("Unable to run script, please try again");
  }
}

run();
