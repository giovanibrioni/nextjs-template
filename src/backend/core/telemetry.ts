import "server-only";

import http from "node:http";

import { type Histogram, metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import { getSettings } from "@/backend/core/config";

let started = false;
let requestDuration: Histogram | undefined;

function patchHttpServerMetrics(): void {
  if (!requestDuration) {
    return;
  }
  const duration = requestDuration;
  const originalEmit = http.Server.prototype.emit;
  // Next.js App Router often bypasses @opentelemetry/instrumentation-http hooks;
  // record http.server.request.duration on the Node server directly.
  http.Server.prototype.emit = function patchedEmit(
    this: http.Server,
    event: string | symbol,
    ...args: unknown[]
  ): boolean {
    if (event === "request") {
      const req = args[0] as http.IncomingMessage;
      const res = args[1] as http.ServerResponse;
      const start = process.hrtime.bigint();
      res.once("finish", () => {
        const elapsedNs = Number(process.hrtime.bigint() - start);
        duration.record(elapsedNs / 1e9, {
          "http.request.method": req.method ?? "GET",
          "http.response.status_code": res.statusCode,
          "url.scheme": "http",
        });
      });
    }
    return originalEmit.apply(this, [event, ...args] as Parameters<typeof originalEmit>);
  };
}

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

  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors,
  });
  tracerProvider.register();

  let meterProvider: MeterProvider | undefined;
  if (settings.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const metricsUrl = `${settings.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/metrics`;
    meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url: metricsUrl }),
          exportIntervalMillis: 15_000,
        }),
      ],
    });
    metrics.setGlobalMeterProvider(meterProvider);
    requestDuration = meterProvider
      .getMeter("http")
      .createHistogram("http.server.request.duration", {
        unit: "s",
        description: "Duration of HTTP server requests",
      });
    patchHttpServerMetrics();
  }

  registerInstrumentations({
    tracerProvider,
    meterProvider,
    instrumentations: [
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
