import { pgTable, uuid, varchar, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { blockStatusEnum, planningHorizonEnum } from "./enums";
import { corridors } from "./corridors";
import { blockTasks } from "./blockTasks";
import { optimizationRuns } from "./optimizationRuns";

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockCode: varchar("block_code", { length: 100 }).notNull().unique(),
    corridorId: uuid("corridor_id").notNull().references(() => corridors.id),
    optimizationRunId: uuid("optimization_run_id").references(() => optimizationRuns.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: blockStatusEnum("status").default("PROPOSED").notNull(),
    planningHorizon: planningHorizonEnum("planning_horizon").notNull(),
    optimizationScore: numeric("optimization_score", { precision: 6, scale: 2 }),
    baselineDurationMinutes: integer("baseline_duration_minutes"),
    savedMinutes: integer("saved_minutes").default(0).notNull(),
    approvedBy: varchar("approved_by", { length: 255 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    corridorIdx: index("blocks_corridor_idx").on(table.corridorId),
    runIdx: index("blocks_optimization_run_idx").on(table.optimizationRunId),
    startIdx: index("blocks_start_idx").on(table.startAt),
    statusIdx: index("blocks_status_idx").on(table.status),
  })
);

export const blockRelations = relations(blocks, ({ one, many }) => ({
  corridor: one(corridors, { fields: [blocks.corridorId], references: [corridors.id] }),
  optimizationRun: one(optimizationRuns, { fields: [blocks.optimizationRunId], references: [optimizationRuns.id] }),
  blockTasks: many(blockTasks),
}));