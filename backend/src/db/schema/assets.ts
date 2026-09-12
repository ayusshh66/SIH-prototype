import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {departments} from "./departments"
import {corridors} from "./corridors"
import {assetStatusEnum} from "./enums"


export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    assetCode: varchar("asset_code", {
      length: 100,
    }).notNull().unique(),

    assetType: varchar("asset_type", {
      length: 100,
    }).notNull(),

    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id),

    corridorId: uuid("corridor_id")
      .notNull()
      .references(() => corridors.id),

    locationKm: numeric("location_km", {
      precision: 10,
      scale: 3,
    }).notNull(),

    criticalityScore: integer("criticality_score")
      .default(50)
      .notNull(),

    safetyScore: integer("safety_score")
      .default(50)
      .notNull(),

    healthScore: integer("health_score")
      .default(100)
      .notNull(),

    installationDate: timestamp("installation_date", {
      withTimezone: true,
    }),

    lastMaintenanceAt: timestamp("last_maintenance_at", {
      withTimezone: true,
    }),

    nextMaintenanceAt: timestamp("next_maintenance_at", {
      withTimezone: true,
    }),

    status: assetStatusEnum("status")
      .default("ACTIVE")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    departmentIdx: index("assets_department_idx").on(table.departmentId),
    corridorIdx: index("assets_corridor_idx").on(table.corridorId),
    statusIdx: index("assets_status_idx").on(table.status),
  }),
);