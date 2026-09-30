import "server-only";

import { asc, eq } from "drizzle-orm";

import type { DbExecutor } from "@/backend/core/database";
import { items } from "@/backend/items/schema";

export type ItemRecord = {
  id: string;
  name: string;
  created_at: Date;
};

export interface ItemRepository {
  add(input: { name: string }): Promise<ItemRecord>;
  getById(id: string): Promise<ItemRecord | null>;
  listAll(): Promise<ItemRecord[]>;
}

function toRecord(row: typeof items.$inferSelect): ItemRecord {
  return {
    id: row.id,
    name: row.name,
    created_at: row.createdAt,
  };
}

export class DrizzleItemRepository implements ItemRepository {
  constructor(private readonly db: DbExecutor) {}

  async add(input: { name: string }): Promise<ItemRecord> {
    const rows = await this.db.insert(items).values({ name: input.name }).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Insert did not return a row");
    }
    return toRecord(row);
  }

  async getById(id: string): Promise<ItemRecord | null> {
    const rows = await this.db.select().from(items).where(eq(items.id, id)).limit(1);
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async listAll(): Promise<ItemRecord[]> {
    const rows = await this.db.select().from(items).orderBy(asc(items.createdAt));
    return rows.map(toRecord);
  }
}
