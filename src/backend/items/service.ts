import "server-only";

import { logger } from "@/backend/core/logging";
import { ItemNotFoundError } from "@/backend/items/errors";
import type { ItemRecord, ItemRepository } from "@/backend/items/repository";

export class ItemService {
  constructor(private readonly repository: ItemRepository) {}

  async create(name: string): Promise<ItemRecord> {
    const item = await this.repository.add({ name });
    logger.info({ itemId: item.id }, "item_created");
    return item;
  }

  async get(id: string): Promise<ItemRecord> {
    const item = await this.repository.getById(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }
    return item;
  }

  async list(): Promise<ItemRecord[]> {
    return this.repository.listAll();
  }
}
