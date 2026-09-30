import { describe, expect, it } from "vitest";

import { DrizzleItemRepository } from "@/backend/items/repository";

import { getTestDb } from "../database";

describe("DrizzleItemRepository", () => {
  it("adds, gets, and lists items", async () => {
    const repository = new DrizzleItemRepository(getTestDb());

    const created = await repository.add({ name: "Notebook" });
    const found = await repository.getById(created.id);
    const missing = await repository.getById(crypto.randomUUID());
    const listed = await repository.listAll();

    expect(found).toEqual(created);
    expect(missing).toBeNull();
    expect(listed).toEqual([created]);
  });
});
