import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { taskTypeEnum, taskStatusEnum } from "./enums";
import { assets } from "./assets";
import { departments } from "./departments";
import { corridors } from "./corridors";
import { defects } from "./defects";
import { blockTasks } from "./blockTasks";

export const maintenanceTasks = pgTable(
  "maintenance_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskCode: varchar("task_code", { length: 100 }).notNull().unique(),
    assetId: uuid("asset_id").notNull().references(() => assets.id),
    departmentId: uuid("department_id").notNull().references(() => departments.id),
    corridorId: uuid("corridor_id").notNull().references(() => corridors.id),
    defectId: uuid("defect_id").references(() => defects.id),
    taskType: taskTypeEnum("task_type").notNull(),
    description: text("description"),
    locationStartKm: numeric("location_start_km", { precision: 10, scale: 3 }).notNull(),
    locationEndKm: numeric("location_end_km", { precision: 10, scale: 3 }).notNull(),
    criticalityScore: integer("criticality_score").default(50).notNull(),
    urgencyScore: integer("urgency_score").default(50).notNull(),
    safetyScore: integer("safety_score").default(50).notNull(),
    operationalImpactScore: integer("operational_impact_score").default(50).notNull(),
    priorityScore: numeric("priority_score", { precision: 6, scale: 2 }).default("0").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
    overdueDays: integer("overdue_days").default(0).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: taskStatusEnum("status").default("PENDING").notNull(),
    requiredBlock: boolean("required_block").default(true).notNull(),
    requiresPowerShutdown: boolean("requires_power_shutdown").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    corridorIdx: index("tasks_corridor_idx").on(table.corridorId),
    departmentIdx: index("tasks_department_idx").on(table.departmentId),
    statusIdx: index("tasks_status_idx").on(table.status),
    priorityIdx: index("tasks_priority_idx").on(table.priorityScore),
    dueIdx: index("tasks_due_idx").on(table.dueAt),
  })
);

export const maintenanceTaskRelations = relations(maintenanceTasks, ({ one, many }) => ({
  asset: one(assets, { fields: [maintenanceTasks.assetId], references: [assets.id] }),
  department: one(departments, { fields: [maintenanceTasks.departmentId], references: [departments.id] }),
  corridor: one(corridors, { fields: [maintenanceTasks.corridorId], references: [corridors.id] }),
  defect: one(defects, { fields: [maintenanceTasks.defectId], references: [defects.id] }),
  blockTasks: many(blockTasks),
}));