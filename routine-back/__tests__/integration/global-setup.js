import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/** Applies all migrations to the dedicated test database before the suite runs. */
export default function setup() {
  config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL.");
  }
  const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
