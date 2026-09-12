import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { blockWindowSourceEnum } from "./enums";
import { corridors } from "./corridors";

export const blockWindows = pgTable(
  "block_windows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    corridorId: uuid("corridor_id").notNull().references(() => corridors.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    availableMinutes: integer("available_minutes").notNull(),
    source: blockWindowSourceEnum("source").default("COA").notNull(),
    status: varchar("status", { length: 30 }).default("AVAILABLE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    corridorIdx: index("block_windows_corridor_idx").on(table.corridorId),
    startIdx: index("block_windows_start_idx").on(table.startAt),
  })
);

export const blockWindowRelations = relations(blockWindows, ({ one }) => ({
  corridor: one(corridors, { fields: [blockWindows.corridorId], references: [corridors.id] }),
}));