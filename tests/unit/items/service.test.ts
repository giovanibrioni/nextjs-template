import { describe, expect, it } from "vitest";

import { ItemNotFoundError } from "@/backend/items/errors";
import type { ItemRecord, ItemRepository } from "@/backend/items/repository";
import { ItemService } from "@/backend/items/service";

class FakeItemRepository implements ItemRepository {
  private readonly items: ItemRecord[] = [];

  async add(input: { name: string }): Promise<ItemRecord> {
    const item: ItemRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    };
    this.items.push(item);
    return item;
  }

  async getById(id: string): Promise<ItemRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async listAll(): Promise<ItemRecord[]> {
    return [...this.items];
  }
}

describe("ItemService", () => {
  it("creates an item", async () => {
    const repository = new FakeItemRepository();
    const service = new ItemService(repository);

    const created = await service.create("Notebook");

    expect(created.name).toBe("Notebook");
    expect(created.id).toBeTruthy();
  });

  it("lists items", async () => {
    const service = new ItemService(new FakeItemRepository());
    await service.create("Notebook");
    await service.create("Pen");

    const items = await service.list();

    expect(items.map((item) => item.name)).toEqual(["Notebook", "Pen"]);
  });

  it("gets an existing item", async () => {
    const service = new ItemService(new FakeItemRepository());
    const created = await service.create("Notebook");

    const found = await service.get(created.id);

    expect(found).toEqual(created);
  });

  it("raises ItemNotFoundError when the item is missing", async () => {
    const service = new ItemService(new FakeItemRepository());

    await expect(service.get(crypto.randomUUID())).rejects.toBeInstanceOf(ItemNotFoundError);
  });
});
