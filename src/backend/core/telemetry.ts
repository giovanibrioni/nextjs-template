import "server-only";

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import { getSettings } from "@/backend/core/config";

let started = false;

export function startTelemetry(): void {
  if (started) {
    return;
  }
  started = true;

  const settings = getSettings();
  const spanProcessors = settings.OTEL_EXPORTER_OTLP_ENDPOINT
    ? [new BatchSpanProcessor(new OTLPTraceExporter())]
    : [];

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: settings.OTEL_SERVICE_NAME,
    }),
    spanProcessors,
  });
  provider.register();

  registerInstrumentations({
    instrumentations: [new PgInstrumentation()],
  });
}
