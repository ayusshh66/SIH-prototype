import { pgTable, uuid, varchar, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { assets } from "./assets";
import { defects } from "./defects";
import { maintenanceTasks } from "./maintenanceTasks";
import { trains } from "./trains";
import { trainForecasts } from "./trainForecasts";
import { blockWindows } from "./blockWindows";
import { blocks } from "./blocks";

export const corridors = pgTable(
  "corridors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    zone: varchar("zone", { length: 100 }),
    division: varchar("division", { length: 100 }),
    startKm: numeric("start_km", { precision: 10, scale: 3 }).notNull(),
    endKm: numeric("end_km", { precision: 10, scale: 3 }).notNull(),
    status: varchar("status", { length: 30 }).default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("corridors_code_idx").on(table.code),
  })
);

export const corridorRelations = relations(corridors, ({ many }) => ({
  assets: many(assets),
  defects: many(defects),
  maintenanceTasks: many(maintenanceTasks),
  trains: many(trains),
  trainForecasts: many(trainForecasts),
  blockWindows: many(blockWindows),
  blocks: many(blocks),
}));