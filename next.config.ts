import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the repository AGENTS.md. Next.js would otherwise rewrite it on dev startup.
  agentRules: false,
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "pg",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/instrumentation",
    "@opentelemetry/instrumentation-pg",
    "@opentelemetry/exporter-trace-otlp-http",
  ],
};

export default nextConfig;
