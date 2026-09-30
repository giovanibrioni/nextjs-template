import "server-only";

import { trace } from "@opentelemetry/api";
import pino from "pino";
import pretty from "pino-pretty";

import { getSettings } from "@/backend/core/config";
import { getRequestContext } from "@/backend/core/request-context";

function createLogger() {
  const settings = getSettings();
  const options: pino.LoggerOptions = {
    level: settings.LOG_LEVEL,
    mixin() {
      const requestId = getRequestContext()?.requestId;
      const span = trace.getActiveSpan();
      const context = span?.spanContext();
      const recording = span?.isRecording() ?? false;
      return {
        ...(requestId ? { requestId } : {}),
        ...(recording && context ? { trace_id: context.traceId, span_id: context.spanId } : {}),
      };
    },
  };

  if (settings.LOG_JSON) {
    return pino(options);
  }

  return pino(options, pretty({ colorize: true, sync: true }));
}

export const logger = createLogger();
