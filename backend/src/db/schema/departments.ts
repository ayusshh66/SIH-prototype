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

import {departmentCodeEnum} from "./enums";


export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: departmentCodeEnum("code").notNull().unique(),

    name: varchar("name", {
      length: 100,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
);