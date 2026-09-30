import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { SpanStatusCode, trace } from "@opentelemetry/api";

import { getSettings } from "@/backend/core/config";

type RequestContext = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export async function withRequestContext(
  request: Request,
  fn: () => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  return storage.run({ requestId }, async () => {
    const tracer = trace.getTracer(getSettings().OTEL_SERVICE_NAME);
    return tracer.startActiveSpan("http.request", async (span) => {
      try {
        const response = await fn();
        response.headers.set("x-request-id", requestId);
        return response;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error("Unknown error"));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  });
}
