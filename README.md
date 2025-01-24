# OpenSearch Utils

Unlock the full potential of your OpenSearch database with our Swiss Army-like toolset, designed for developers, data engineers, and database administrators. This versatile toolkit offers a comprehensive suite of features that streamline database management, optimize performance, and enhance your data querying capabilities.

## First-time setup

Pre-requisite: This repository runs on `>= node 22` minimally. To install the latest `node.js`, click [here](https://nodejs.org/en/download/prebuilt-installer)

1. Install necessary dependencies with `npm install`

2. Create a `.env` file at the root of this repository. Copy the content from `.env.template` and fill up the values

3. There are two main ways to connect to an OpenSearch database: [set up locally](#setup-opensearch-database-locally) or [connect to an external database](#connecting-to-an-external-opensearch-database)

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

Configure the following environment keys in `.env` file:

- `AUTHENTICATION_METHOD`
- `BASIC_AUTH_FILE_PATH`
- `CERT_AUTH_CERT_FILE_PATH`
- `CERT_AUTH_KEY_FILE_PATH`
- `DATABASE_URL`
- `ROOT_CA_FILE_PATH`
- `VALIDATE_SSL`

## Using the scripts

Before running any script, create the config `json` file in `/configs` folder. The content of the `json` is described in the sections below.

Run `npm run start` and it should automatically start up the script

### (Script) Create Index

Creates an index in the database.

```json
{
"indexName": "sample-index", // create an index with this index name
"shardCount": 1, // (optional) index shard count. Defaults to 1
"replicaCount": 1, // (optional) index replica count. Defaults to 1
"mappings": {}, // (optional) OpenSearch index mapping. Defaults an an empty object (dynamic mapping)
"maxResultWindow": 10000, // (optional) max result size + from. Defaults to 10,000
"refreshInterval": "1s", // (optional) index refresh interval. Defaults to "1s" (1 second)
"analysis": {
  "analyzer": {
    "html_strip_analyzer": {
      "type": "custom",
      "char_filter": ["html_strip"],
      "tokenizer": "whitespace",
      "filter": ["lowercase"]
    }
  }
}, // (optional) index analyzers (https://opensearch.org/docs/latest/analyzers/custom-analyzer/)
"aliases": {}, // (optional) OpenSearch index aliases. Defaults to an empty object (no alias)
};
```

### (Script) Bulk Ingest Documents

Takes in a zipped folder (`./input/bulk-ingest/xxx.zip`) of json files and ingests to an index.

```json
{
  "indexName": "sample-index", // ingests the jsons to this index name
  "inputZipFilename": "sample.zip", // name of the zipped folder to extract json files from. stored in /input/bulk-ingest/*
  "documentIdOptions": {
    "idKey": "id", // When "documentIdOptions" is defined, this value must be provided. Denotes the primary key field of the document and set that field value to _id in OpenSearch.
    "removeIdFromDocs": true // (optional) deletes the field denoted by "uniqueIdKey" in the document before ingestion. Defaults to true
  },
  "generatedTimestampOptions": {
    "timestampKey": "@timestamp", // (optional) Denotes the new field to be added to the document during ingestion. Defaults to "@timestamp"
    "timestampFormat": "iso8601-utc" // (optional) timestamp format of the generated timestamp. Permitted values only. Defaults to "iso8601-utc"
  }
}
```

### (Script) Export From Index

Extracts all documents from an index and saves each document as a json. Zip file will be generated under `./output/export-from-index/YYYY-MM-dd/*`

```json
{
  "indexName": "sample-index", // index to extract documents from
  "searchQuery": { "query": { "match_all": {} } }, // (optional) OpenSearch search query to filter results for extraction. Defaults to match everything
  "scrollSize": 500, // (optional) scroll size of each retrieval from the database. Defaults to 500
  "scrollWindowTimeout": "1m" // (optional) scroll window timeout of OpenSearch's Scroll API. Defaults to "1m". For larger scroll sizes, you may want to increase this timeout window
}
```

### (Script) Export Mapping from Indices

Extracts mappings from a list of provided indices and saves each mapping to a json file. A zipped file containing all the documents will be generated under `./output/export-from-index/*`

```json
{
  "indices": ["sample-index"] // list of database indices to extract documents from
}
```
