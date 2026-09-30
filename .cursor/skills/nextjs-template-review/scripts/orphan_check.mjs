/**
 * Unimported src modules and domain errors without an HTTP branch. Node stdlib only.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SRC = path.join(ROOT, "src");
const BACKEND = path.join(SRC, "backend");
const ERRORS = path.join(BACKEND, "core", "errors.ts");
const APP_ENTRY = /\/(page|layout|template|loading|error|not-found|default|global-error|route)\.(ts|tsx)$/;

function main() {
  const modules = sourceModules();
  const imported = importedModules();
  const failures = [];
  for (const [file, moduleName] of [...modules.entries()].sort((left, right) => left[1].localeCompare(right[1]))) {
    if (isEntrypoint(file) || imported.has(file)) {
      continue;
    }
    failures.push(`${relative(file)} module ${moduleName} is never imported`);
  }

  const handler = existsSync(ERRORS) ? readFileSync(ERRORS, "utf8") : "";
  for (const [file, className, line] of appErrorSubclasses()) {
    if (!handler.includes(className)) {
      failures.push(`${relative(file)}:${line} ${className} has no branch in src/backend/core/errors.ts`);
    }
  }

  if (failures.length > 0) {
    for (const item of failures) {
      console.log(`FAIL ${item}`);
    }
    process.exit(1);
  }
  console.log(`OK orphans (${modules.size} src modules imported or entrypoints)`);
}

function sourceModules() {
  const modules = new Map();
  for (const file of walk(SRC)) {
    if (file.endsWith(".d.ts")) {
      continue;
    }
    const moduleName = relative(file).replace(/\.(ts|tsx)$/, "").replaceAll(path.sep, "/");
    modules.set(file, moduleName);
  }
  return modules;
}

function importedModules() {
  const found = new Set();
  for (const root of [SRC, path.join(ROOT, "tests")]) {
    for (const file of walk(root)) {
      for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
        const resolved = resolveSpecifier(file, specifier);
        if (resolved) {
          found.add(resolved);
        }
      }
    }
  }
  return found;
}

function isEntrypoint(file) {
  const rel = relative(file).replaceAll(path.sep, "/");
  if (rel === "src/proxy.ts" || rel === "src/instrumentation.ts" || rel === "src/backend/schema.ts") {
    return true;
  }
  return rel.startsWith("src/app/") && APP_ENTRY.test(`/${rel}`);
}

function appErrorSubclasses() {
  const found = [];
  for (const file of walk(BACKEND)) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/class\s+(\w+)\s+extends\s+(?:AppError|\w+\.AppError)\b/);
      if (match && match[1] !== "AppError") {
        found.push([file, match[1], index + 1]);
      }
    }
  }
  return found;
}

function importSpecifiers(source) {
  const found = [];
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    found.push(match[1]);
  }
  for (const match of source.matchAll(/\bimport\s+["']([^"']+)["']/g)) {
    found.push(match[1]);
  }
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']/g)) {
    found.push(match[1]);
  }
  return found;
}

function resolveSpecifier(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function walk(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file);
}

main();
