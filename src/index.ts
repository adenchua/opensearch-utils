import { checkbox, select } from "@inquirer/prompts";
import { promises as fs } from "fs";
import path from "path";

import DatabaseClient from "./classes/DatabaseClient";
import { AppEnvironment, environmentConfigs, ScriptSelectionType } from "./configs/environments";
import { APP_VERSION } from "./constants";
import DatabaseConnectionError from "./errors/DatabaseConnectionError";
import InvalidConfigError from "./errors/InvalidConfigError";
import bulkIngestDocuments from "./scripts/bulk-ingest";
import createIndex from "./scripts/create-index";
import deleteDocumentsFromIndices from "./scripts/delete-documents-from-indices";
import exportDocsFromIndex from "./scripts/export-docs-from-index";
import exportMappingFromIndices from "./scripts/export-mapping-from-indices";
import replaceMapping from "./scripts/replace-mapping";
import { createDatabaseClient } from "./singletons";

/** Prompts the user to select an environment */
async function runEnvironmentSelectionPrompt(): Promise<AppEnvironment> {
  const result: AppEnvironment = await select({
    message: "Select an environment:",
    choices: [
      { name: "Local", value: "local" },
      { name: "Development", value: "development" },
      { name: "Staging", value: "staging" },
      { name: "Test", value: "test" },
      { name: "Production", value: "production" },
    ],
  });

  return result;
}

/** Prompts the user to select a script */
async function runScriptSelectionPrompt(
  allowedScripts: ScriptSelectionType[],
): Promise<ScriptSelectionType> {
  const result: ScriptSelectionType = await select({
    message: "Select a script to run:",
    choices: [
      {
        name: "1. Bulk ingest documents",
        value: "BULK_INGEST",
        description: "Ingests jsonl documents from an input folder into an index",
        disabled: !allowedScripts.includes("BULK_INGEST")
          ? "Not available in this environment"
          : false,
      },
      {
        name: "2. Create new index",
        value: "CREATE_INDEX",
        description: "Create a new index",
        disabled: !allowedScripts.includes("CREATE_INDEX")
          ? "Not available in this environment"
          : false,
      },
      {
        name: "3. Export documents from index",
        value: "EXPORT_FROM_INDEX",
        description: "Exports documents from an index as json files",
        disabled: !allowedScripts.includes("EXPORT_FROM_INDEX")
          ? "Not available in this environment"
          : false,
      },
      {
        name: "4. Export indices mapping",
        value: "EXPORT_INDEX_MAPPING",
        description:
          "Exports mappings from a list of indices and save them as individual json objects",
        disabled: !allowedScripts.includes("EXPORT_INDEX_MAPPING")
          ? "Not available in this environment"
          : false,
      },
      {
        name: "5. Delete documents from indices",
        value: "DELETE_DOCUMENTS_FROM_INDICES",
        description: "Deletes documents from one or more indices using an optional query body",
        disabled: !allowedScripts.includes("DELETE_DOCUMENTS_FROM_INDICES")
          ? "Not available in this environment"
          : false,
      },
      {
        name: "6. Replace index mapping",
        value: "REPLACE_MAPPING",
        description:
          "Recreates an index with a new mapping via reindex, and points an alias at the new index",
        disabled: !allowedScripts.includes("REPLACE_MAPPING")
          ? "Not available in this environment"
          : false,
      },
    ],
  });

  return result;
}

async function runScript(
  selectedScript: ScriptSelectionType,
  databaseClient: DatabaseClient,
): Promise<void> {
  switch (selectedScript) {
    case "CREATE_INDEX": {
      const selectedConfigs = await runConfigSelectionPrompt("create-index");
      const total = selectedConfigs.length;
      for (let i = 0; i < total; i++) {
        const { filename, config } = selectedConfigs[i];
        console.log(`\n[${i + 1}/${total}] Running: ${filename}`);
        await createIndex(config, databaseClient);
      }
      break;
    }
    case "BULK_INGEST": {
      const selectedConfigs = await runConfigSelectionPrompt("bulk-ingest");
      const total = selectedConfigs.length;
      for (let i = 0; i < total; i++) {
        const { filename, config } = selectedConfigs[i];
        console.log(`\n[${i + 1}/${total}] Running: ${filename}`);
        await bulkIngestDocuments(config, path.join("input", "bulk-ingest"), databaseClient);
      }
      break;
    }
    case "EXPORT_FROM_INDEX": {
      const selectedConfigs = await runConfigSelectionPrompt("export-from-index");
      const total = selectedConfigs.length;
      for (let i = 0; i < total; i++) {
        const { filename, config } = selectedConfigs[i];
        console.log(`\n[${i + 1}/${total}] Running: ${filename}`);
        await exportDocsFromIndex(config, databaseClient);
      }
      break;
    }
    case "EXPORT_INDEX_MAPPING": {
      const selectedConfigs = await runConfigSelectionPrompt("export-mapping-from-indices");
      const total = selectedConfigs.length;
      for (let i = 0; i < total; i++) {
        const { filename, config } = selectedConfigs[i];
        console.log(`\n[${i + 1}/${total}] Running: ${filename}`);
        await exportMappingFromIndices(config, databaseClient);
      }
      break;
    }
    case "DELETE_DOCUMENTS_FROM_INDICES": {
      const selectedConfigs = await runConfigSelectionPrompt("delete-documents-from-indices");
      const total = selectedConfigs.length;
      for (let i = 0; i < total; i++) {
        const { filename, config } = selectedConfigs[i];
        console.log(`\n[${i + 1}/${total}] Running: ${filename}`);
        await deleteDocumentsFromIndices(config, databaseClient);
      }
      break;
    }
    case "REPLACE_MAPPING": {
      const selectedConfigs = await runConfigSelectionPrompt("replace-mapping");
      const total = selectedConfigs.length;
      for (let i = 0; i < total; i++) {
        const { filename, config } = selectedConfigs[i];
        console.log(`\n[${i + 1}/${total}] Running: ${filename}`);
        await replaceMapping(config, databaseClient);
      }
      break;
    }
    default:
      throw new InvalidConfigError();
  }
}

/** Prompt the user to select one or more configs for a given script */
async function runConfigSelectionPrompt(
  foldername: string,
): Promise<{ filename: string; config: any }[]> {
  const configPath = path.join("configs", foldername);
  const filenames = await fs.readdir(configPath);
  const selected = await checkbox({
    message: "Select configs to run (space to tick, enter to confirm):",
    choices: filenames.map((filename) => ({ name: filename, value: filename })),
  });

  return Promise.all(
    selected.map(async (filename) => ({
      filename,
      config: JSON.parse(await fs.readFile(path.join(configPath, filename), { encoding: "utf-8" })),
    })),
  );
}

async function run() {
  console.log(`Running OpenSearch-Utils version ${APP_VERSION}...`);

  const selectedEnv = await runEnvironmentSelectionPrompt();
  const databaseClient = createDatabaseClient(environmentConfigs[selectedEnv]);

  const connectionSuccessful = await databaseClient.ping();
  const databaseURL = databaseClient.getDatabaseURL();

  if (!connectionSuccessful) {
    throw new DatabaseConnectionError();
  } else {
    console.log("Connected to database successfully!");
    console.log("Connected to database:", databaseURL);
  }

  const selectedScript = await runScriptSelectionPrompt(
    environmentConfigs[selectedEnv].allowedScripts,
  );
  runScript(selectedScript, databaseClient);
}

run();
