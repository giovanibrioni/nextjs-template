import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemsPage } from "@/frontend/items/items-page";

const notebook = {
  id: "6f1b0c2e-1c3a-4d5e-8f70-9a0b1c2d3e4f",
  name: "Notebook",
  created_at: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ItemsPage", () => {
  it("shows items loaded from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [notebook],
      }),
    );

    render(<ItemsPage />);

    expect(await screen.findByText("Notebook")).toBeInTheDocument();
  });

  it("creates an item", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ ...notebook, name: "Pen" }),
        };
      }
      return {
        ok: true,
        json: async () => [],
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ItemsPage />);
    await screen.findByText("No items yet");

    await user.type(screen.getByLabelText("Name"), "Pen");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Pen")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(postCall?.[1]?.body).toBe(JSON.stringify({ name: "Pen" }));
  });

  it("does not submit an empty name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ItemsPage />);
    await screen.findByText("No items yet");

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
