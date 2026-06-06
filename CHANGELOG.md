# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.0] - 2026-06-05

### ADDED

- Support for selecting multiple config files per script run
- `allowedScripts` per-environment filter to restrict which scripts are available in each environment
- Per-document failure logging in bulk ingest
- **Delete Documents From Index** script

### CHANGED

- Database configuration and environment variables migrated from `.env` to `src/configs/environments.ts`; connection handling restructured
- Bulk ingest config: `inputZipFilename` renamed to `inputZipPath`; now supports nested subdirectory paths (e.g. `"uat/sample.zip"`)
- `uuid` dependency updated from `^13.0.0` to `^14.0.0`
- bulk-ingest config to take in an array of zips instead of a single zip

### FIXED

- Added explicit type annotation for `hits` in `bulkRetrieveDocuments` method

## [1.6.0] - 2026-02-17

### CHANGED

- export mapping from index to follow input of create-index to ease index creation
- create index 'analysis' will no longer extract just the analyzers, but all custom analyzers too

## [1.5.0] - 2025-04-20

### ADDED

- index knn setting to create index scripts

### CHANGED

- bulk ingestion to ingest `10,000` each time instead of all documents at once

## [1.4.0] - 2025-01-25

### ADDED

- helpful script information on the console

### CHANGED

- output of **bulk extract from index** from `json` to `jsonl` format consisting of 10,000 lines of jsons
- output of **extract index mapping** to include settings. Settings include useful information such as custom analyzers
- input of bulk ingest will now take in a zip of `jsonl` instead of `json`

### REMOVED

- custom output zip file name for **bulk extract from index** and **extract index mapping**
