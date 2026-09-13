import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { blocks } from "./blocks";
import { maintenanceTasks } from "./maintenanceTasks";
import { departments } from "./departments";

export const blockTasks = pgTable(
  "block_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockId: uuid("block_id").notNull().references(() => blocks.id, { onDelete: "cascade" }),
    maintenanceTaskId: uuid("maintenance_task_id").notNull().references(() => maintenanceTasks.id),
    departmentId: uuid("department_id").notNull().references(() => departments.id),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    status: varchar("status", { length: 30 }).default("SCHEDULED").notNull(),
  },
  (table) => ({
    blockIdx: index("block_tasks_block_idx").on(table.blockId),
    taskIdx: index("block_tasks_task_idx").on(table.maintenanceTaskId),
  })
);

export const blockTaskRelations = relations(blockTasks, ({ one }) => ({
  block: one(blocks, { fields: [blockTasks.blockId], references: [blocks.id] }),
  maintenanceTask: one(maintenanceTasks, { fields: [blockTasks.maintenanceTaskId], references: [maintenanceTasks.id] }),
  department: one(departments, { fields: [blockTasks.departmentId], references: [departments.id] }),
}));