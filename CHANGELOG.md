# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2025-01-25

### ADDED

- helpful script information on the console

### CHANGED

- output of **bulk extract from index** from `json` to `jsonl` format consisting of 10,000 lines of jsons
- output of **extract index mapping** to include settings. Settings include useful information such as custom analyzers
- input of bulk ingest will now take in a zip of `jsonl` instead of `json`

### REMOVED

- custom output zip file name for **bulk extract from index** and **extract index mapping**
