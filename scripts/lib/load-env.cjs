/**
 * Load the repository root `.env` from any script under `scripts/`.
 */
const path = require("path");
const dotenv = require("dotenv");

function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function loadRootEnv() {
  dotenv.config({ path: path.join(repoRoot(), ".env") });
}

module.exports = { loadRootEnv, repoRoot };
