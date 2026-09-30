/**
 * settingsSchema keys must appear in .env.example. Node stdlib only.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const CONFIG = path.join(ROOT, "src", "backend", "core", "config.ts");
const EXAMPLE = path.join(ROOT, ".env.example");

function main() {
  if (!existsSync(CONFIG)) {
    console.log("FAIL src/backend/core/config.ts missing");
    process.exit(1);
  }
  if (!existsSync(EXAMPLE)) {
    console.log("FAIL .env.example missing");
    process.exit(1);
  }

  const expected = settingsEnvNames();
  const present = exampleKeys();
  const missing = [...expected].filter((name) => !present.has(name)).sort();
  if (missing.length > 0) {
    for (const name of missing) {
      console.log(`FAIL .env.example missing ${name}`);
    }
    process.exit(1);
  }
  console.log(`OK env (${expected.size} settings documented in .env.example)`);
}

function settingsEnvNames() {
  const source = readFileSync(CONFIG, "utf8");
  const match = source.match(/const settingsSchema = z\.object\(\{([\s\S]*?)\n\}\);/);
  if (!match) {
    console.log("FAIL src/backend/core/config.ts has no settingsSchema");
    process.exit(1);
  }
  const names = new Set();
  for (const key of match[1].matchAll(/^\s{2}([A-Z0-9_]+)\s*:/gm)) {
    names.add(key[1]);
  }
  return names;
}

function exampleKeys() {
  const keys = new Set();
  for (const line of readFileSync(EXAMPLE, "utf8").split("\n")) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#") || !stripped.includes("=")) {
      continue;
    }
    keys.add(stripped.split("=", 1)[0].trim());
  }
  return keys;
}

main();
