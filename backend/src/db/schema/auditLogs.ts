import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    action: varchar("action", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    performedBy: varchar("performed_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);