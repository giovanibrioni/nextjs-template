// Loaded by drizzle-kit, so this file must not import server-only or other backend modules.
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
