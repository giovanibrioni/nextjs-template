import { describe, expect, it } from "vitest";

import { getHealth } from "@/backend/health/check";

import "../database";

describe("health API", () => {
  it("returns ok when the database answers", async () => {
    const response = await getHealth(new Request("http://localhost/api/v1/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
