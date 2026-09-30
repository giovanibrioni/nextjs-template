import "server-only";

import { sql } from "drizzle-orm";

import { runInTransaction } from "@/backend/core/database";
import { logger } from "@/backend/core/logging";
import { withRequestContext } from "@/backend/core/request-context";

export function getHealth(request: Request): Promise<Response> {
  return withRequestContext(request, async () => {
    try {
      await runInTransaction(async (tx) => {
        await tx.execute(sql`select 1`);
      });
      return Response.json({ status: "ok" });
    } catch (error) {
      logger.error({ err: error }, "health_check_failed");
      return Response.json({ status: "unavailable" }, { status: 503 });
    }
  });
}
