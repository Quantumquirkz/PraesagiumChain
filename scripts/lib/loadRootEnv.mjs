import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** Load repo-root `.env` from any module under `scripts/`. */
export function loadRootEnv() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(dir, "..", "..");
  dotenv.config({ path: path.join(root, ".env") });
}
