import "server-only";

import { z } from "zod";

export const itemCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const itemPublicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  created_at: z.union([z.date().transform((value) => value.toISOString()), z.string()]),
});

export type ItemPublic = z.infer<typeof itemPublicSchema>;
