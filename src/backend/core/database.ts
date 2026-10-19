import "server-only";

import "@/backend/core/ensure-telemetry";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getSettings } from "@/backend/core/config";
import { logger } from "@/backend/core/logging";
import * as schema from "@/backend/schema";

export type DbExecutor = NodePgDatabase<typeof schema>;

const pool = new Pool({ connectionString: getSettings().DATABASE_URL });
pool.on("error", (error) => {
  logger.error({ err: error }, "postgres_pool_error");
});

const db = drizzle(pool, { schema });

type TransactionRunner = <T>(fn: (tx: DbExecutor) => Promise<T>) => Promise<T>;

let runner: TransactionRunner = (fn) => db.transaction(async (tx) => fn(tx));

export function runInTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return runner(fn);
}

export function useTransactionRunner(next: TransactionRunner): () => void {
  const previous = runner;
  runner = next;
  return () => {
    runner = previous;
  };
}

export function getPool(): Pool {
  return pool;
}
