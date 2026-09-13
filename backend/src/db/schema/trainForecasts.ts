import { pgTable, uuid, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { congestionLevelEnum } from "./enums";
import { corridors } from "./corridors";

export const trainForecasts = pgTable(
  "train_forecasts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    corridorId: uuid("corridor_id").notNull().references(() => corridors.id),
    forecastDate: timestamp("forecast_date", { withTimezone: true }).notNull(),
    timeWindowStart: timestamp("time_window_start", { withTimezone: true }).notNull(),
    timeWindowEnd: timestamp("time_window_end", { withTimezone: true }).notNull(),
    expectedTrainCount: integer("expected_train_count").notNull(),
    congestionLevel: congestionLevelEnum("congestion_level").notNull(),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    corridorIdx: index("forecast_corridor_idx").on(table.corridorId),
    dateIdx: index("forecast_date_idx").on(table.forecastDate),
  })
);

export const trainForecastRelations = relations(trainForecasts, ({ one }) => ({
  corridor: one(corridors, { fields: [trainForecasts.corridorId], references: [corridors.id] }),
}));