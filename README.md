# OpenSearch Utils

Unlock the full potential of your OpenSearch database with our Swiss Army-like toolset, designed for developers, data engineers, and database administrators. This versatile toolkit offers a comprehensive suite of features that streamline database management, optimize performance, and enhance your data querying capabilities.

## First-time setup

Pre-requisite: This repository runs on `>= node 18` minimally. To install the latest `node.js`, click [here](https://nodejs.org/en/download/prebuilt-installer)

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

| key                        | explanation                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OPENSEARCH_VERSION         | _opensearchproject/opensearch_ version to use from Docker Hub. Use "latest" to pull the latest opensearch image from docker hub, or specify a version e.g. "2.17.0"                                                                                                                                                                                                                                |
| OPENSEARCH_DATABASE_PORT   | port number to host the opensearch database                                                                                                                                                                                                                                                                                                                                                        |
| OPENSEARCH_DASHBOARDS_PORT | port number to host opensearch dashboards                                                                                                                                                                                                                                                                                                                                                          |
| OPENSEARCH_USERNAME        | username used to login to opensearch. Specify "admin" if you are setting a small development database for yourself                                                                                                                                                                                                                                                                                 |
| OPENSEARCH_PASSWORD        | password used to login to opensearch. From OpenSearch 2.12.0 onwards, the OpenSearch Security Plugin a change that requires an initial password for 'admin' user. Minimum 8 character password and must contain at least one uppercase letter, one lowercase letter, one digit, and one special character that is strong. Password strength can be tested [here](https://lowe.github.io/tryzxcvbn) |

After setting up the required environment keys, run the following step in your terminal:

> docker compose up --build -d

This should start up an OpenSearch database at `https://localhost:<OPENSEARCH_DATABASE_PORT>`.

## Connecting to an external OpenSearch database

Configure the following environment keys in `.env` file:

| key                     | explanation                                           |
| ----------------------- | ----------------------------------------------------- |
| OPENSEARCH_USERNAME     | username used to login to opensearch                  |
| OPENSEARCH_PASSWORD     | password used to login to opensearch                  |
| USE_EXTERNAL_OPENSEARCH | Change to option 1 to connect to an external database |
| EXTERNAL_OPENSEARCH_URL | URL of the external opensearch database               |

## Using the scripts

TODO
