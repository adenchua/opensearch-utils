# OpenSearch Utils

Designed for developers, data engineers, and database administrators. This toolkit offers useful utilities to manage an opensearch database.

## First-time setup

Pre-requisite: This repository runs on `>= node 22` minimally. To install the latest `node.js`, click [here](https://nodejs.org/en/download/prebuilt-installer)

1. Install necessary dependencies with `npm install`

2. Create a `.env` file at the root of this repository by copying `.env.template`. This file is only needed if you are [running OpenSearch locally via Docker](#setup-opensearch-database-locally).

3. Configure your database connection(s) in `src/configs/environments.ts`. Each environment (`local`, `development`, `staging`, `test`, `production`) has its own database URL, authentication method, SSL setting, and credential file paths.

4. There are two main ways to connect to an OpenSearch database: [set up locally](#setup-opensearch-database-locally) or [connect to an external database](#connecting-to-an-external-opensearch-database)

## Setup OpenSearch database locally

This script uses **Docker** to ease the process to set-up a database. If you do not have docker, download it from their [official website](https://www.docker.com/products/docker-desktop/)

### Windows Settings

For Windows workloads using WSL through Docker Desktop, run the following commands in a terminal to set the `vm.max_map_count`:

```bash
wsl -d docker-desktop
sysctl -w vm.max_map_count=262144
```

### Local database configuration

Configure the following environment keys in `.env` file:

- `OPENSEARCH_VERSION`
- `OPENSEARCH_DATABASE_PORT`
- `OPENSEARCH_DASHBOARDS_PORT`
- `OPENSEARCH_INITIAL_ADMIN_PASSWORD`

After setting up the required environment keys, run the following step in your terminal:

> docker compose up --build -d

This should start up an OpenSearch database at `https://localhost:<OPENSEARCH_DATABASE_PORT>`.

## Connecting to an external OpenSearch database

Open `src/configs/environments.ts` and update the entry for the environment you want to use (e.g. `production`). Set the following fields:

| Field | Description |
|---|---|
| `databaseUrl` | URL of the OpenSearch cluster, e.g. `https://my-cluster:9200` |
| `authenticationMethod` | `"BASIC_AUTH"` or `"CERTIFICATE_AUTH"` |
| `validateSsl` | `true` to enforce SSL verification, `false` to skip (useful for self-signed certs) |
| `rootCAFilePath` | Path to the root CA certificate file (optional) |
| `basicAuthFilePath` | Path to a file containing `username:password` (required for `BASIC_AUTH`) |
| `certAuthCertFilePath` | Path to the client certificate file (required for `CERTIFICATE_AUTH`) |
| `certAuthKeyFilePath` | Path to the client key file (required for `CERTIFICATE_AUTH`) |
| `allowedScripts` | List of scripts available in this environment. Scripts not listed are shown as disabled in the CLI. |

Credential files are read from the local filesystem at runtime and are not stored in `.env`. Place them in `./certs/<environment>/` (this directory is git-ignored).

## Using the scripts

Before running any script, create the config `json` file in `/configs` folder. The content of the `json` is described in the sections below.

Run `npm run start`. You will first be prompted to select an environment, then a script to run, and then one or more config files. Multiple configs can be selected and will run sequentially.

### (Script) Create Index

Creates an index in the database.

```js
{
  // create an index with this index name
"indexName": "sample-index",
// allow creation of vector index. Defaults to false
"indexKnn": false,
// (optional) index shard count. Defaults to 1
"shardCount": 1,
// (optional) index replica count. Defaults to 1
"replicaCount": 1,
 // (optional) OpenSearch index mapping. Defaults an an empty object (dynamic mapping)
"mappings": {},
 // (optional) max result size + from. Defaults to 10,000
"maxResultWindow": 10000,
// (optional) index refresh interval. Defaults to "1s" (1 second)
"refreshInterval": "1s",
// (optional) index analyzers (https://opensearch.org/docs/latest/analyzers/custom-analyzer/)
"analysis": {
  "analyzer": {
    "html_strip_analyzer": {
      "type": "custom",
      "char_filter": ["html_strip"],
      "tokenizer": "whitespace",
      "filter": ["lowercase"]
    }
  }
},
// (optional) OpenSearch index aliases. Defaults to an empty object (no alias)
"aliases": {},
};
```

### (Script) Bulk Ingest Documents

Takes in one or more zipped folders of [`jsonl`](https://jsonlines.org/) files and ingests to an index. Each ZIP must be placed under `./input/bulk-ingest/` and can be nested in subdirectories (e.g. `./input/bulk-ingest/uat/sample.zip`). ZIPs are processed sequentially; a failed ZIP is skipped with an error log and the remaining ZIPs continue.

```js
{
  // ingests the jsons to this index name
  "indexName": "sample-index",
  // array of relative paths to zip files within /input/bulk-ingest/. supports subdirectories, e.g. "uat/sample.zip"
  "inputZipPaths": ["sample.zip"],
  "documentIdOptions": {
    // When "documentIdOptions" is defined, this value must be provided. Denotes the primary key field of the document and set that field value to _id in OpenSearch.
    "idKey": "id",
    // (optional) deletes the field denoted by "uniqueIdKey" in the document before ingestion. Defaults to true
    "removeIdFromDocs": true
  },
  "generatedTimestampOptions": {
    // (optional) Denotes the new field to be added to the document during ingestion. Defaults to "@timestamp"
    "timestampKey": "@timestamp",
    // (optional) timestamp format of the generated timestamp. Permitted values only. Defaults to "iso8601-utc"
    "timestampFormat": "iso8601-utc"
  }
}
```

### (Script) Export From Index

Extracts all documents from an index and saves documents in [`jsonl`](https://jsonlines.org/) format. Zip file will be generated under `./output/export-from-index/YYYY-MM-dd/*`

```js
{
  // index to extract documents from
  "indexName": "sample-index",
  // (optional) OpenSearch search query to filter results for extraction. Defaults to match everything
  "searchQuery": { "query": { "match_all": {} } },
  // (optional) scroll size of each retrieval from the database. Defaults to 500
  "scrollSize": 500,
  // (optional) scroll window timeout of OpenSearch's Scroll API. Defaults to "1m". For larger scroll sizes, you may want to increase this timeout window
  "scrollWindowTimeout": "1m"
}
```

### (Script) Export Mapping from Indices

Extracts mappings from a list of provided indices and saves each mapping to a json file. A zipped file containing all the documents will be generated under `./output/export-from-index/*`

```js
{
  // list of database indices to extract documents from
  "indices": ["sample-index"]
}
```

### (Script) Delete Documents from Index

Deletes documents from one or more indices using an optional query body. When `queryBody` is omitted, all documents in the listed indices are deleted (`match_all`). The script displays the target indices and query, then requires explicit confirmation before proceeding. Not available in the `production` environment.

```js
{
  // list of indices to delete documents from
  "indices": ["sample-index"],
  // (optional) OpenSearch query body to filter which documents to delete. Defaults to match_all (deletes everything)
  "queryBody": {
    "query": {
      "match": {
        "status": "inactive"
      }
    }
  }
}
```
