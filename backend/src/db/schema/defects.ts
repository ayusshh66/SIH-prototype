import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { defectSeverityEnum, defectStatusEnum } from "./enums";
import { assets } from "./assets";
import { corridors } from "./corridors";
import { maintenanceTasks } from "./maintenanceTasks";

export const defects = pgTable(
  "defects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    defectCode: varchar("defect_code", { length: 100 }).notNull().unique(),
    assetId: uuid("asset_id").notNull().references(() => assets.id),
    corridorId: uuid("corridor_id").notNull().references(() => corridors.id),
    severity: defectSeverityEnum("severity").notNull(),
    description: text("description"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: defectStatusEnum("status").default("OPEN").notNull(),
    safetyImpact: integer("safety_impact").default(0).notNull(),
    operationalImpact: integer("operational_impact").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    assetIdx: index("defects_asset_idx").on(table.assetId),
    corridorIdx: index("defects_corridor_idx").on(table.corridorId),
    severityIdx: index("defects_severity_idx").on(table.severity),
    statusIdx: index("defects_status_idx").on(table.status),
  })
);

export const defectRelations = relations(defects, ({ one, many }) => ({
  asset: one(assets, { 
    fields: [defects.assetId], 
    references: [assets.id] 
  }),
  corridor: one(corridors, { 
    fields: [defects.corridorId], 
    references: [corridors.id] 
  }),
  maintenanceTasks: many(maintenanceTasks),
}));