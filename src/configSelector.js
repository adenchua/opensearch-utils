import { SCRIPTS } from "./scripts/index.js";

/**
 * Modify and add new configs to this object
 */
const CONFIGS = {
  createIndexSample1: "createIndexConfigSample.json",
  bulkIngestSample1: "bulkIngestDocumentsConfigSample.json",
  exportFromIndexSample1: "exportFromIndexConfigSample.json",
};
export const SELECTED_CONFIG = CONFIGS.createIndexSample1;

/**
 * Select which script to run
 */
export const SELECTED_SCRIPT = SCRIPTS.CREATE_INDEX;
