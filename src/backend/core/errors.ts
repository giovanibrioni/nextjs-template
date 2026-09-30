import "server-only";

import { logger } from "@/backend/core/logging";

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError && error.name === "ItemNotFoundError") {
    return Response.json({ detail: "Item not found" }, { status: 404 });
  }

  logger.error({ err: error }, "unhandled_error");
  return Response.json({ detail: "Internal server error" }, { status: 500 });
}
