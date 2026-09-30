import { describe, expect, it } from "vitest";

import { getItem, getItems, postItem } from "@/backend/items/http";

import "../database";

describe("items API", () => {
  it("creates, lists, and fetches an item", async () => {
    const createdResponse = await postItem(jsonRequest("POST", { name: "Notebook" }));
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();

    const listResponse = await getItems(new Request("http://localhost/api/v1/items"));
    expect(listResponse.status).toBe(200);
    const listed = await listResponse.json();
    expect(listed).toEqual([created]);

    const getResponse = await getItem(new Request(`http://localhost/api/v1/items/${created.id}`), {
      params: Promise.resolve({ itemId: created.id }),
    });
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual(created);
  });

  it("returns 404 when the item does not exist", async () => {
    const itemId = "00000000-0000-4000-8000-000000000000";
    const response = await getItem(new Request(`http://localhost/api/v1/items/${itemId}`), {
      params: Promise.resolve({ itemId }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ detail: "Item not found" });
  });
});

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost/api/v1/items", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
