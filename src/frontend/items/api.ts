export type Item = {
  id: string;
  name: string;
  created_at: string;
};

export async function listItems(): Promise<Item[]> {
  const response = await fetch("/api/v1/items");
  if (!response.ok) {
    throw new Error("Could not load items");
  }
  return response.json() as Promise<Item[]>;
}

export async function createItem(name: string): Promise<Item> {
  const response = await fetch("/api/v1/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error("Could not create item");
  }
  return response.json() as Promise<Item>;
}
