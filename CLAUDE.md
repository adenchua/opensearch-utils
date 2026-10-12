# opensearch-utils

A CLI toolkit for managing OpenSearch databases via interactive terminal prompts — no web UI. Each script is driven by a JSON config selected at runtime from `configs/<script-name>/`.

## Setup

- Requires Node.js ≥ 22 (not declared in `package.json`)
- `cp .env.template .env` before `npm start`. `.env` only holds Docker settings for the optional local cluster (`docker compose up -d`). Database URL, auth method, and SSL validation are configured per environment in `src/configs/environments.ts`, not via env vars
- There is no test suite; `npm run lint` (ESLint + `tsc --noEmit`) is the only check

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

- **Formatting** — run `npm run format` before committing (nothing enforces it automatically)
- **Scroll API** — large document retrieval uses OpenSearch's scroll API via `DatabaseService.bulkRetrieveDocuments`; always clear the scroll context after use
- **Config validation** — complex OpenSearch SDK types use `z.unknown()` with explicit casts, since Zod is not used to mirror the full OpenSearch API shape
- **Custom errors** — throw the appropriate error class from `src/errors/` rather than plain `Error` where applicable
