import { pgEnum } from "drizzle-orm/pg-core";

export const departmentCodeEnum = pgEnum("department_code", ["ENG", "TRD", "SNT"]);

export const assetStatusEnum = pgEnum("asset_status", ["ACTIVE", "DEGRADED", "FAILED", "UNDER_MAINTENANCE", "RETIRED"]);

export const taskStatusEnum = pgEnum("task_status", ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const taskTypeEnum = pgEnum("task_type", ["PREVENTIVE", "CORRECTIVE", "INSPECTION", "DEFECT_REPAIR", "EMERGENCY"]);

export const defectSeverityEnum = pgEnum("defect_severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const defectStatusEnum = pgEnum("defect_status", ["OPEN", "UNDER_REPAIR", "RESOLVED", "CLOSED"]);

export const trainTypeEnum = pgEnum("train_type", ["PASSENGER", "EXPRESS", "GOODS", "SPECIAL"]);

export const blockStatusEnum = pgEnum("block_status", ["DRAFT", "PROPOSED", "APPROVED", "REJECTED", "EXECUTED", "CANCELLED"]);

export const planningHorizonEnum = pgEnum("planning_horizon", ["WEEKLY", "MONTHLY"]);

export const blockWindowSourceEnum = pgEnum("block_window_source", ["COA", "MANUAL", "FORECAST"]);

export const congestionLevelEnum = pgEnum("congestion_level", ["LOW", "MEDIUM", "HIGH"]);