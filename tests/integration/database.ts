import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach } from "vitest";
import { type DbExecutor, getPool, useTransactionRunner } from "@/backend/core/database";
import * as schema from "@/backend/schema";

let client: PoolClient | undefined;
let restore: (() => void) | undefined;
let testDb: DbExecutor | undefined;

export function getTestDb(): DbExecutor {
  if (!testDb) {
    throw new Error("Test transaction is not open");
  }
  return testDb;
}

beforeEach(async () => {
  client = await getPool().connect();
  await client.query("BEGIN");
  testDb = drizzle(client, { schema });
  const db = testDb;
  restore = useTransactionRunner(async (fn) => fn(db));
});

afterEach(async () => {
  restore?.();
  restore = undefined;
  testDb = undefined;
  if (client) {
    await client.query("ROLLBACK");
    client.release();
    client = undefined;
  }
});

afterAll(async () => {
  await getPool().end();
});
