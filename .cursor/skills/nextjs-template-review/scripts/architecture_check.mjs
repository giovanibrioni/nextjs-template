/**
 * Deterministic architecture checks from AGENTS.md. Node stdlib only.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SRC = path.join(ROOT, "src");
const BACKEND = path.join(SRC, "backend");
const FRONTEND = path.join(SRC, "frontend");
const INFRASTRUCTURE = new Set(["core", "health"]);
const DOMAIN_FILES = ["schema.ts", "schemas.ts", "repository.ts", "service.ts", "http.ts", "errors.ts"];

function main() {
  const failures = [];
  const domains = domainPackages();
  if (domains.length === 0) {
    failures.push("no domain packages under src/backend/ besides core and health");
  }

  for (const domain of domains) {
    const packageDir = path.join(BACKEND, domain);
    for (const name of DOMAIN_FILES) {
      if (!existsSync(path.join(packageDir, name))) {
        failures.push(`src/backend/${domain}/${name} missing`);
      }
    }
    const routes = walk(path.join(SRC, "app", "api", "v1", domain));
    const routeText = routes.map((file) => readFileSync(file, "utf8")).join("\n");
    if (!routeText.includes(`@/backend/${domain}/http`)) {
      failures.push(`src/app/api/v1/${domain}/ does not re-export @/backend/${domain}/http`);
    }
    if (!readFileSync(path.join(BACKEND, "schema.ts"), "utf8").includes(`@/backend/${domain}/schema`)) {
      failures.push(`src/backend/${domain}/schema.ts is not exported from src/backend/schema.ts`);
    }
    if (!fakeRepositoryExists(domain)) {
      failures.push(`tests/unit/${domain}/ has no Fake*Repository class`);
    }
    if (!hasTests(path.join(ROOT, "tests", "integration", domain))) {
      failures.push(`tests/integration/${domain}/ has no tests`);
    }
    const apiTest = path.join(ROOT, "tests", "integration", "api", `${domain}.test.ts`);
    if (!hasTests(apiTest)) {
      failures.push(`tests/integration/api/${domain}.test.ts has no tests`);
    }
    failures.push(...handlerContract(domain));
    failures.push(...repositoryContract(domain));
    failures.push(...frontendScreen(domain));
  }

  failures.push(...serverOnly());
  failures.push(...schemaIsolation());
  failures.push(...boundaries());
  failures.push(...thinRoutes());
  failures.push(...transactionOwnership());
  failures.push(...forbiddenCalls());

  if (failures.length > 0) {
    for (const item of failures) {
      console.log(`FAIL ${item}`);
    }
    process.exit(1);
  }
  console.log(`OK architecture (${domains.length} domain package(s): ${domains.join(", ")})`);
}

function domainPackages() {
  if (!existsSync(BACKEND)) {
    return [];
  }
  return readdirSync(BACKEND)
    .filter((name) => {
      if (name.startsWith(".") || name.startsWith("_") || INFRASTRUCTURE.has(name)) {
        return false;
      }
      return statSync(path.join(BACKEND, name)).isDirectory();
    })
    .sort();
}

function fakeRepositoryExists(domain) {
  const root = path.join(ROOT, "tests", "unit", domain);
  return walk(root).some((file) => /class\s+Fake\w*Repository\b/.test(readFileSync(file, "utf8")));
}

function hasTests(target) {
  if (!existsSync(target)) {
    return false;
  }
  const files = statSync(target).isFile() ? [target] : walk(target);
  return files.some((file) => /^\s*(?:it|test)\(/m.test(readFileSync(file, "utf8")));
}

function handlerContract(domain) {
  const file = path.join(BACKEND, domain, "http.ts");
  if (!existsSync(file)) {
    return [];
  }
  const source = readFileSync(file, "utf8");
  const failures = [];
  const specifiers = importSpecifiers(source);
  if (specifiers.some((item) => item === "./schema" || item === `@/backend/${domain}/schema`)) {
    failures.push(`src/backend/${domain}/http.ts imports the Drizzle table`);
  }
  if (!source.includes(".parse(")) {
    failures.push(`src/backend/${domain}/http.ts does not parse a Zod schema`);
  }
  return failures;
}

function repositoryContract(domain) {
  const file = path.join(BACKEND, domain, "repository.ts");
  if (!existsSync(file)) {
    return [];
  }
  const source = readFileSync(file, "utf8");
  const failures = [];
  if (!/export\s+interface\s+\w*Repository\b/.test(source)) {
    failures.push(`src/backend/${domain}/repository.ts has no repository interface`);
  }
  if (!/export\s+class\s+Drizzle\w*Repository\b/.test(source)) {
    failures.push(`src/backend/${domain}/repository.ts has no Drizzle repository class`);
  }
  return failures;
}

function frontendScreen(domain) {
  const screen = path.join(FRONTEND, domain);
  if (!existsSync(screen)) {
    return [];
  }
  const failures = [];
  const imported = walk(path.join(SRC, "app")).some((file) => {
    return path.basename(file).startsWith("page.") && importSpecifiers(readFileSync(file, "utf8")).some((item) => item === `@/frontend/${domain}` || item.startsWith(`@/frontend/${domain}/`));
  });
  if (!imported) {
    failures.push(`no page imports @/frontend/${domain}`);
  }
  const tests = path.join(ROOT, "tests", "frontend", domain);
  if (!hasTests(tests)) {
    failures.push(`tests/frontend/${domain}/ has no tests`);
  } else if (!walk(tests).some((file) => readFileSync(file, "utf8").includes("fetch"))) {
    failures.push(`tests/frontend/${domain}/ does not mock fetch`);
  }
  return failures;
}

function serverOnly() {
  const failures = [];
  for (const file of walk(BACKEND)) {
    if (!file.endsWith(".ts") || file.endsWith(".d.ts") || path.basename(file) === "schema.ts") {
      continue;
    }
    if (!/import\s+["']server-only["']/.test(readFileSync(file, "utf8"))) {
      failures.push(`${relative(file)} missing import "server-only"`);
    }
  }
  return failures;
}

function schemaIsolation() {
  const failures = [];
  for (const file of walk(BACKEND)) {
    if (path.basename(file) !== "schema.ts") {
      continue;
    }
    const source = readFileSync(file, "utf8");
    if (/import\s+["']server-only["']/.test(source)) {
      failures.push(`${relative(file)} imports server-only`);
    }
    for (const specifier of importSpecifiers(source)) {
      const resolved = resolveSpecifier(file, specifier);
      const importsBackend = specifier.startsWith("@/backend/") || (resolved?.startsWith(`${BACKEND}${path.sep}`) ?? false);
      const schemaImport = specifier === "@/backend/schema" || specifier.endsWith("/schema") || specifier.endsWith("/schema.ts") || path.basename(resolved ?? "") === "schema.ts";
      if (importsBackend && !schemaImport) {
        failures.push(`${relative(file)} imports backend module ${specifier}`);
      }
    }
  }
  return failures;
}

function boundaries() {
  const failures = [];
  for (const file of walk(FRONTEND)) {
    failures.push(...boundaryHits(file, "backend"));
    const source = readFileSync(file, "utf8");
    if (/\bprocess\.env\b/.test(codeOf(source))) {
      failures.push(`${relative(file)} reads process.env`);
    }
  }
  for (const file of walk(BACKEND)) {
    failures.push(...boundaryHits(file, "frontend"));
  }
  const proxy = path.join(SRC, "proxy.ts");
  if (existsSync(proxy)) {
    failures.push(...boundaryHits(proxy, "backend"));
  }
  for (const file of walk(path.join(SRC, "app"))) {
    if (path.basename(file).startsWith("page.")) {
      failures.push(...boundaryHits(file, "backend"));
    }
  }
  return failures;
}

function boundaryHits(file, side) {
  const failures = [];
  for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
    const resolved = resolveSpecifier(file, specifier);
    const alias = specifier === `@/${side}` || specifier.startsWith(`@/${side}/`);
    const root = side === "backend" ? BACKEND : FRONTEND;
    const crossed = resolved?.startsWith(`${root}${path.sep}`) || resolved === root;
    if (alias || crossed) {
      failures.push(`${relative(file)} imports ${side} module ${specifier}`);
    }
  }
  return failures;
}

function thinRoutes() {
  const failures = [];
  for (const file of walk(path.join(SRC, "app", "api"))) {
    if (path.basename(file) !== "route.ts") {
      continue;
    }
    if (!isThinRoute(readFileSync(file, "utf8"))) {
      failures.push(`${relative(file)} is not a handler re-export`);
    }
  }
  return failures;
}

function isThinRoute(source) {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const without = stripped
    .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+(?:type\s+)?\{[\s\S]*?\}\s+from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+const\s+\w+\s*=\s*\w+;?\s*$/gm, "")
    .replace(/^\s*export\s+\{[\s\S]*?\};?\s*$/gm, "");
  return without.trim() === "";
}

function transactionOwnership() {
  const failures = [];
  const allowed = path.join(BACKEND, "core", "database.ts");
  for (const file of walk(SRC)) {
    if (file === allowed) {
      continue;
    }
    const lines = codeOf(readFileSync(file, "utf8")).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.includes(".commit(") || line.includes(".rollback(") || line.includes(".transaction(")) {
        failures.push(`${relative(file)}:${index + 1} commit/rollback outside runInTransaction`);
      }
    }
  }
  return failures;
}

function forbiddenCalls() {
  const failures = [];
  for (const file of walk(SRC)) {
    const source = readFileSync(file, "utf8");
    const lines = codeOf(source).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/\bconsole\.log\s*\(/.test(line)) {
        failures.push(`${relative(file)}:${index + 1} console.log in application code`);
      }
      if (/["']use server["']/.test(line)) {
        failures.push(`${relative(file)}:${index + 1} Server Action`);
      }
      if (line.includes("NEXT_PUBLIC_")) {
        failures.push(`${relative(file)}:${index + 1} NEXT_PUBLIC_ variable`);
      }
    }
    if (
      source.includes("@opentelemetry/api-logs") ||
      source.includes("LoggerProvider") ||
      /\blogs\.getLogger\b/.test(source)
    ) {
      failures.push(`${relative(file)} OpenTelemetry logs API`);
    }
  }
  return failures;
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
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function codeOf(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, "")).replace(/\/\/.*$/gm, "");
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
