/**
 * Merge-risk signals on the diff against the base branch. Node stdlib only.
 *
 * FAIL: destructive SQL in a migration, or Drizzle schema changes without a migration.
 * WARN: API, repository, settings, or event files changed. Warnings do not fail the script.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function main() {
  const { changed, scope } = changedFiles();
  console.log(`INFO scope: ${scope} (${changed.length} file(s))`);
  if (changed.length === 0) {
    console.log("OK merge-risk (empty diff)");
    return;
  }

  const failures = [];
  const warnings = [];
  const migrations = changed.filter((file) => /^drizzle\/[^/]+\.sql$/.test(file));
  const schemas = changed.filter(isDrizzleSchema);
  const api = changed.filter(isApiSurface);
  const repositories = changed.filter((file) => file.endsWith("/repository.ts"));
  const settings = changed.filter((file) => file === "src/backend/core/config.ts");
  const events = changed.filter((file) => file.includes("/events/") || file.endsWith("/events.ts"));

  for (const file of migrations) {
    failures.push(...destructiveSql(file));
  }
  if (schemas.length > 0 && migrations.length === 0) {
    failures.push(`Drizzle schema files changed without a drizzle SQL migration: ${schemas.join(", ")}`);
  }
  if (api.length > 0) {
    warnings.push(`API surface changed; check backward compatibility: ${api.join(", ")}`);
  }
  if (repositories.length > 0 || schemas.length > 0) {
    warnings.push(
      `query or schema shape changed; confirm indexes for new filters and foreign keys: ${[...repositories, ...schemas].join(", ")}`,
    );
  }
  if (settings.length > 0) {
    warnings.push(`settings changed; confirm .env.example and deploy env: ${settings.join(", ")}`);
  }
  if (events.length > 0) {
    warnings.push(`event contract changed; check consumers: ${events.join(", ")}`);
  } else {
    console.log("INFO no domain event contract in this diff");
  }

  for (const item of failures) {
    console.log(`FAIL ${item}`);
  }
  for (const item of warnings) {
    console.log(`WARN ${item}`);
  }
  if (failures.length > 0) {
    process.exit(1);
  }
  console.log("OK merge-risk");
}

function isDrizzleSchema(file) {
  return file === "src/backend/schema.ts" || /^src\/backend\/[^/]+\/schema\.ts$/.test(file);
}

function isApiSurface(file) {
  return (
    file.endsWith("/schemas.ts") ||
    file.endsWith("/http.ts") ||
    /^src\/frontend\/[^/]+\/api\.ts$/.test(file) ||
    (file.startsWith("src/app/api/") && file.endsWith("/route.ts"))
  );
}

function changedFiles() {
  if (!hasHead()) {
    return { changed: untracked(), scope: "untracked files (no commits yet)" };
  }
  const base = mergeBase();
  if (!base) {
    const names = [...new Set([...git(["diff", "--name-only", "--diff-filter=ACMRD"]), ...untracked()])].sort();
    return { changed: names, scope: "working tree (no main/master base)" };
  }
  const names = [...new Set([...git(["diff", "--name-only", "--diff-filter=ACMRD", base.sha]), ...untracked()])].sort();
  return { changed: names, scope: `diff against ${base.branch} (${base.sha.slice(0, 12)})` };
}

function hasHead() {
  return gitOk(["rev-parse", "--verify", "HEAD"]);
}

function mergeBase() {
  for (const branch of ["main", "master"]) {
    if (!gitOk(["rev-parse", "--verify", branch])) {
      continue;
    }
    const sha = git(["merge-base", "HEAD", branch])[0];
    if (sha) {
      return { sha, branch };
    }
  }
  return null;
}

function untracked() {
  return git(["ls-files", "--others", "--exclude-standard"]);
}

function gitOk(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return result.status === 0;
}

function git(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    if (stderr) {
      console.error(stderr);
    }
    return [];
  }
  return (result.stdout ?? "").split("\n").filter(Boolean);
}

function destructiveSql(file) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) {
    return [];
  }
  const source = readFileSync(full, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ""))
    .replace(/--.*$/gm, "");
  const failures = [];
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/\bDROP\b/i.test(line) || /\bRENAME\b/i.test(line) || /\bTRUNCATE\b/i.test(line) || /\bALTER\s+COLUMN\b/i.test(line)) {
      failures.push(`${file}:${index + 1} migration SQL is destructive`);
    }
  }
  return failures;
}

main();
