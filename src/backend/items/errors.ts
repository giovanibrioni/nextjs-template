import "server-only";

import { AppError } from "@/backend/core/errors";

export class ItemNotFoundError extends AppError {
  readonly itemId: string;

  constructor(itemId: string) {
    super("Item not found");
    this.itemId = itemId;
  }
}
