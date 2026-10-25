import "server-only";

import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
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
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: settings.OTEL_SERVICE_NAME,
  });

  const spanProcessors = settings.OTEL_EXPORTER_OTLP_ENDPOINT
    ? [new BatchSpanProcessor(new OTLPTraceExporter())]
    : [];

  const provider = new NodeTracerProvider({
    resource,
    spanProcessors,
  });
  provider.register();

  if (settings.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
        }),
      ],
    });
    metrics.setGlobalMeterProvider(meterProvider);
  }

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new PgInstrumentation({
        requestHook(span, query) {
          span.setAttribute("db.system", "postgresql");
          const database = query.connection.database;
          if (database) {
            span.setAttribute("db.name", database);
          }
        },
      }),
    ],
  });
}
