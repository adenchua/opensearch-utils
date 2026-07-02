# opensearch-utils

A CLI toolkit for managing OpenSearch databases. Provides six interactive scripts for bulk ingesting documents, creating indices, exporting documents, exporting index mappings, deleting documents from indices, and replacing an index's mapping. Runs entirely from the terminal using interactive prompts — no web UI.

## Quick Start

**Prerequisites:** Node.js ≥ 22, npm

```bash
npm install

# Copy the template and fill in your credentials and database URL
cp .env.template .env

# Start a local OpenSearch instance (optional — skip if connecting to an existing cluster)
docker compose up -d

npm start
```

## Development Commands

| Command | Description |
|---|---|
| `npm start` | Run the CLI (requires `.env`) |
| `npm run lint` | ESLint + TypeScript type check (`tsc --noEmit`) |
| `npm run format` | Prettier auto-format all files in `src/` |

There is no test suite.

## Architecture

```
src/
├── index.ts               CLI entry — connects to DB, prompts script selection, routes
├── constants.ts           APP_VERSION and date format constants
├── singletons.ts          createDatabaseClient(config) factory — constructs DatabaseClient from an EnvironmentConfig
├── classes/
│   ├── DatabaseClient.ts  OpenSearch connection management (BASIC_AUTH or CERTIFICATE_AUTH)
│   ├── DatabaseService.ts High-level DB operations: addIndex, bulkIngestDocuments, bulkRetrieveDocuments, fetchIndexInfo, deleteDocumentsByQuery, indexExists, deleteIndex, resolveAlias, getAliasesForIndex, updateAliases, reindex, getTaskStatus, countDocuments
│   └── FileManager.ts     Static file helpers: saveAsJson, saveAsJsonLine, readJsonLine
├── scripts/
│   ├── bulk-ingest/       Extract ZIP → read JSONL → chunk at 10k → bulk ingest
│   ├── create-index/      Create index with custom mappings and analyzers
│   ├── delete-documents-from-indices/  Confirm → deleteByQuery per index
│   ├── export-docs-from-index/   Scroll all docs → write JSONL → compress to ZIP
│   ├── export-mapping-from-indices/  Fetch index mapping+settings → save as JSON
│   └── replace-mapping/  Create versioned index with new mapping → reindex → verify counts → point alias at new index → optionally delete original
├── configs/
│   └── environments.ts    Per-environment database config (URL, auth method, SSL, file paths, allowedScripts) for local/development/staging/test/production; also exports ScriptSelectionType
├── errors/                DatabaseConnectionError, InvalidConfigError, InvalidDatabaseIndexError, IndexNotFoundError, IndexAlreadyExistsError, ReindexVerificationError, AliasUpdateError
├── types/                 dateUtilsTypes.ts
└── utils/                 dateUtils, folderUtils, booleanHelper
```

Each script folder contains:
- `index.ts` — script logic
- `interfaces.ts` — Zod schema and inferred TypeScript type for the JSON config it accepts

The call chain is: `index.ts` → `scripts/<name>` → `DatabaseService` → `DatabaseClient` → OpenSearch

## Environment Variables

Copy `.env.template` to `.env` and fill in these values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | — | Moved to `src/configs/environments.ts` (per-environment) |
| `AUTHENTICATION_METHOD` | — | Moved to `src/configs/environments.ts` (per-environment) |
| `VALIDATE_SSL` | — | Moved to `src/configs/environments.ts` (per-environment) |
| `OPENSEARCH_VERSION` | Docker only | OpenSearch image version for docker compose (default `3.7.0`, pinned rather than `latest`) |
| `OPENSEARCH_DATABASE_PORT` | Docker only | Host port for OpenSearch (default `9200`) |
| `OPENSEARCH_DASHBOARDS_PORT` | Docker only | Host port for Dashboards UI (default `5601`) |
| `OPENSEARCH_INITIAL_ADMIN_PASSWORD` | Docker only | Admin password for local cluster |

## Config Files

Each script is driven by a JSON config file selected interactively at runtime. Place configs in the corresponding folder:

| Script | Config folder | Sample |
|---|---|---|
| Bulk Ingest | `configs/bulk-ingest/` | `configs/bulk-ingest/sample.json` |
| Create Index | `configs/create-index/` | `configs/create-index/sample.json` |
| Delete Documents | `configs/delete-documents-from-indices/` | `configs/delete-documents-from-indices/sample.json` |
| Export Documents | `configs/export-from-index/` | `configs/export-from-index/sample.json` |
| Export Mapping | `configs/export-mapping-from-indices/` | `configs/export-mapping-from-indices/sample.json` |
| Replace Mapping | `configs/replace-mapping/` | `configs/replace-mapping/sample.json` |

See the `interfaces.ts` in each script folder for the exact config shape.

For bulk ingest, place input ZIP files (containing JSONL files) in `input/bulk-ingest/`. Subdirectories are supported — set `inputZipPaths` to an array of relative paths such as `["uat/sample.zip"]`. Multiple ZIPs are processed sequentially; a failed ZIP is skipped and the rest continue.

## Adding a New Script

1. Create `src/scripts/<script-name>/interfaces.ts` — define a Zod schema (export it as a named export) and derive the TypeScript type with `z.infer<>` as the default export
2. Create `src/scripts/<script-name>/index.ts` — implement the script as a default-exported async function
3. Add the script's config folder: `configs/<script-name>/` with a sample JSON
4. Register the new option in `src/configs/environments.ts`:
   - Add the value to `ScriptSelectionType`
   - Add the value to `allowedScripts` in each environment that should permit it (principle of least privilege — omit from restricted environments like `production` if the script is destructive)
5. Register the new option in `src/index.ts`:
   - Add a choice entry in `runScriptSelectionPrompt()`
   - Add a `case` in `runScript()` that calls `runConfigSelectionPrompt("<script-name>")` then your function

If the script reads or writes files, use `FileManager` (static methods). For database operations, instantiate `DatabaseService` with the `databaseClient` singleton.

At the top of the script function (before any database calls), call `Schema.safeParse(options)` and throw `InvalidConfigError` if validation fails. Required fields must be non-optional in the schema (not marked `?`). Destructure from `result.data` rather than `options`. See any existing script's `interfaces.ts` and `index.ts` for the pattern.

## Conventions

- **TypeScript strict mode** — all types must be explicit; no `any`
- **ES Modules** — use `import`/`export`; no `require()`; file extensions not needed in imports (Bundler resolution)
- **No compile step** — `tsx` executes TypeScript directly; `tsc` is only used for type checking
- **Formatting** — 2-space indent, 100-char line width, double quotes, semicolons, trailing commas, LF line endings. Run `npm run format` before committing
- **Chunking** — bulk ingest processes documents in chunks of 10,000 to manage memory
- **Scroll API** — large document retrieval uses OpenSearch's scroll API via `DatabaseService.bulkRetrieveDocuments`; always clear the scroll context after use
- **Config validation** — each script validates its config via its Zod schema (`safeParse` → `InvalidConfigError` on failure); complex OpenSearch SDK types use `z.unknown()` with explicit casts, since Zod is not used to mirror the full OpenSearch API shape
- **Custom errors** — throw the appropriate error class from `src/errors/` rather than plain `Error` where applicable
- **Output directories** — `output/`, `mappings/`, `database/`, `certs/` are git-ignored; scripts write results there at runtime
