import "server-only";

import { runInTransaction } from "@/backend/core/database";
import { toErrorResponse } from "@/backend/core/errors";
import { withRequestContext } from "@/backend/core/request-context";
import { DrizzleItemRepository } from "@/backend/items/repository";
import { itemCreateSchema, itemPublicSchema } from "@/backend/items/schemas";
import { ItemService } from "@/backend/items/service";

export function getItems(request: Request): Promise<Response> {
  return withRequestContext(request, async () => {
    try {
      const records = await runInTransaction(async (tx) => {
        const service = new ItemService(new DrizzleItemRepository(tx));
        return service.list();
      });
      return Response.json(records.map((record) => itemPublicSchema.parse(record)));
    } catch (error) {
      return toErrorResponse(error);
    }
  });
}

export function postItem(request: Request): Promise<Response> {
  return withRequestContext(request, async () => {
    const body = await readJson(request);
    const parsed = itemCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ detail: "Invalid request" }, { status: 400 });
    }

    try {
      const record = await runInTransaction(async (tx) => {
        const service = new ItemService(new DrizzleItemRepository(tx));
        return service.create(parsed.data.name);
      });
      return Response.json(itemPublicSchema.parse(record), { status: 201 });
    } catch (error) {
      return toErrorResponse(error);
    }
  });
}

export function getItem(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  return withRequestContext(request, async () => {
    const { itemId } = await context.params;
    try {
      const record = await runInTransaction(async (tx) => {
        const service = new ItemService(new DrizzleItemRepository(tx));
        return service.get(itemId);
      });
      return Response.json(itemPublicSchema.parse(record));
    } catch (error) {
      return toErrorResponse(error);
    }
  });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
