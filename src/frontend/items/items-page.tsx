"use client";

import { type FormEvent, useEffect, useState } from "react";

import { createItem, type Item, listItems } from "@/frontend/items/api";

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listItems()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load items");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setError(null);
    try {
      const created = await createItem(trimmed);
      setItems((current) => [...current, created]);
      setName("");
    } catch {
      setError("Could not create item");
    }
  }

  return (
    <main>
      <h1>Items</h1>
      {error ? <p role="alert">{error}</p> : null}
      <form onSubmit={onSubmit}>
        <label htmlFor="item-name">Name</label>
        <input
          id="item-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit">Create</button>
      </form>
      {items.length === 0 ? <p>No items yet</p> : null}
      <ul aria-label="Items">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </main>
  );
}
