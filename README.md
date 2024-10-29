# Opensearch Utils

Unlock the full potential of your OpenSearch database with our Swiss Army-like toolset, designed for developers, data engineers, and database administrators. This versatile toolkit offers a comprehensive suite of features that streamline database management, optimize performance, and enhance your data querying capabilities.

## 1. Setup OpenSearch database locally

The following steps start up OpenSearch database and dashboards locally

### Windows Settings

For Windows workloads using WSL through Docker Desktop, run the following commands in a terminal to set the `vm.max_map_count`:

```bash
wsl -d docker-desktop
sysctl -w vm.max_map_count=262144
```
