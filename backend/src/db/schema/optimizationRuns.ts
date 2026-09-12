import { pgTable, uuid, varchar, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { planningHorizonEnum } from "./enums";

export const optimizationRuns = pgTable(
  "optimization_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runCode: varchar("run_code", { length: 100 }).notNull().unique(),
    horizon: planningHorizonEnum("horizon").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    tasksConsidered: integer("tasks_considered").default(0).notNull(),
    tasksScheduled: integer("tasks_scheduled").default(0).notNull(),
    blocksGenerated: integer("blocks_generated").default(0).notNull(),
    totalBlockMinutes: integer("total_block_minutes").default(0).notNull(),
    baselineBlockMinutes: integer("baseline_block_minutes").default(0).notNull(),
    estimatedSavingsMinutes: integer("estimated_savings_minutes").default(0).notNull(),
    optimizationScore: numeric("optimization_score", { precision: 6, scale: 2 }),
    status: varchar("status", { length: 30 }).default("COMPLETED").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);