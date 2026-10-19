import { isWrapped } from "@opentelemetry/instrumentation";
import { describe, expect, it } from "vitest";

import { startTelemetry } from "@/backend/core/telemetry";

describe("postgres telemetry", () => {
  it("patches pg when telemetry starts before the driver loads", async () => {
    startTelemetry();
    const pg = await import("pg");

    expect(isWrapped(pg.Client.prototype.query)).toBe(true);
  });
});
