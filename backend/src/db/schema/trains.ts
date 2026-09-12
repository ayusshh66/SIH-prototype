import { pgTable, uuid, varchar, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { trainTypeEnum } from "./enums";
import { corridors } from "./corridors";

export const trains = pgTable(
  "trains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainNumber: varchar("train_number", { length: 50 }).notNull(),
    trainName: varchar("train_name", { length: 255 }),
    trainType: trainTypeEnum("train_type").notNull(),
    corridorId: uuid("corridor_id").notNull().references(() => corridors.id),
    scheduledArrival: timestamp("scheduled_arrival", { withTimezone: true }).notNull(),
    scheduledDeparture: timestamp("scheduled_departure", { withTimezone: true }).notNull(),
    priority: integer("priority").default(50).notNull(),
    isGoodsTrain: boolean("is_goods_train").default(false).notNull(),
    isCriticalService: boolean("is_critical_service").default(false).notNull(),
    status: varchar("status", { length: 30 }).default("SCHEDULED").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    corridorIdx: index("trains_corridor_idx").on(table.corridorId),
    arrivalIdx: index("trains_arrival_idx").on(table.scheduledArrival),
  })
);

export const trainRelations = relations(trains, ({ one }) => ({
  corridor: one(corridors, { fields: [trains.corridorId], references: [corridors.id] }),
}));