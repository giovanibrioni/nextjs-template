import "server-only";

import { z } from "zod";

const settingsSchema = z.object({
  APP_NAME: z.string().default("nextjs-template"),
  ENVIRONMENT: z.string().default("local"),
  LOG_LEVEL: z.string().default("info"),
  LOG_JSON: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/app"),
  OTEL_SERVICE_NAME: z.string().default("nextjs-template"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type Settings = z.infer<typeof settingsSchema>;

let cached: Settings | undefined;

export function getSettings(): Settings {
  cached ??= settingsSchema.parse({
    APP_NAME: process.env.APP_NAME,
    ENVIRONMENT: process.env.ENVIRONMENT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_JSON: process.env.LOG_JSON,
    DATABASE_URL: process.env.DATABASE_URL,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
  return cached;
}
