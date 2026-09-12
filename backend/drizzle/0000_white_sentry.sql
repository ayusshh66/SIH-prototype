CREATE TYPE "public"."asset_status" AS ENUM('ACTIVE', 'DEGRADED', 'FAILED', 'UNDER_MAINTENANCE', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."block_status" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."block_window_source" AS ENUM('COA', 'MANUAL', 'FORECAST');--> statement-breakpoint
CREATE TYPE "public"."congestion_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."defect_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."defect_status" AS ENUM('OPEN', 'UNDER_REPAIR', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."department_code" AS ENUM('ENG', 'TRD', 'SNT');--> statement-breakpoint
CREATE TYPE "public"."planning_horizon" AS ENUM('WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'DEFECT_REPAIR', 'EMERGENCY');--> statement-breakpoint
CREATE TYPE "public"."train_type" AS ENUM('PASSENGER', 'EXPRESS', 'GOODS', 'SPECIAL');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "department_code" NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "corridors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"zone" varchar(100),
	"division" varchar(100),
	"start_km" numeric(10, 3) NOT NULL,
	"end_km" numeric(10, 3) NOT NULL,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corridors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_code" varchar(100) NOT NULL,
	"asset_type" varchar(100) NOT NULL,
	"department_id" uuid NOT NULL,
	"corridor_id" uuid NOT NULL,
	"location_km" numeric(10, 3) NOT NULL,
	"criticality_score" integer DEFAULT 50 NOT NULL,
	"safety_score" integer DEFAULT 50 NOT NULL,
	"health_score" integer DEFAULT 100 NOT NULL,
	"installation_date" timestamp with time zone,
	"last_maintenance_at" timestamp with time zone,
	"next_maintenance_at" timestamp with time zone,
	"status" "asset_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "defects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"defect_code" varchar(100) NOT NULL,
	"asset_id" uuid NOT NULL,
	"corridor_id" uuid NOT NULL,
	"severity" "defect_severity" NOT NULL,
	"description" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"status" "defect_status" DEFAULT 'OPEN' NOT NULL,
	"safety_impact" integer DEFAULT 0 NOT NULL,
	"operational_impact" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "defects_defect_code_unique" UNIQUE("defect_code")
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_code" varchar(100) NOT NULL,
	"asset_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"corridor_id" uuid NOT NULL,
	"defect_id" uuid,
	"task_type" "task_type" NOT NULL,
	"description" text,
	"location_start_km" numeric(10, 3) NOT NULL,
	"location_end_km" numeric(10, 3) NOT NULL,
	"criticality_score" integer DEFAULT 50 NOT NULL,
	"urgency_score" integer DEFAULT 50 NOT NULL,
	"safety_score" integer DEFAULT 50 NOT NULL,
	"operational_impact_score" integer DEFAULT 50 NOT NULL,
	"priority_score" numeric(6, 2) DEFAULT '0' NOT NULL,
	"estimated_duration_minutes" integer NOT NULL,
	"overdue_days" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"status" "task_status" DEFAULT 'PENDING' NOT NULL,
	"required_block" boolean DEFAULT true NOT NULL,
	"requires_power_shutdown" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_tasks_task_code_unique" UNIQUE("task_code")
);
--> statement-breakpoint
CREATE TABLE "trains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"train_number" varchar(50) NOT NULL,
	"train_name" varchar(255),
	"train_type" "train_type" NOT NULL,
	"corridor_id" uuid NOT NULL,
	"scheduled_arrival" timestamp with time zone NOT NULL,
	"scheduled_departure" timestamp with time zone NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"is_goods_train" boolean DEFAULT false NOT NULL,
	"is_critical_service" boolean DEFAULT false NOT NULL,
	"status" varchar(30) DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "train_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corridor_id" uuid NOT NULL,
	"forecast_date" timestamp with time zone NOT NULL,
	"time_window_start" timestamp with time zone NOT NULL,
	"time_window_end" timestamp with time zone NOT NULL,
	"expected_train_count" integer NOT NULL,
	"congestion_level" "congestion_level" NOT NULL,
	"confidence_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "block_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corridor_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"available_minutes" integer NOT NULL,
	"source" "block_window_source" DEFAULT 'COA' NOT NULL,
	"status" varchar(30) DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_code" varchar(100) NOT NULL,
	"corridor_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" "block_status" DEFAULT 'PROPOSED' NOT NULL,
	"planning_horizon" "planning_horizon" NOT NULL,
	"optimization_score" numeric(6, 2),
	"baseline_duration_minutes" integer,
	"saved_minutes" integer DEFAULT 0 NOT NULL,
	"approved_by" varchar(255),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_block_code_unique" UNIQUE("block_code")
);
--> statement-breakpoint
CREATE TABLE "block_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"maintenance_task_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"status" varchar(30) DEFAULT 'SCHEDULED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optimization_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_code" varchar(100) NOT NULL,
	"horizon" "planning_horizon" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"tasks_considered" integer DEFAULT 0 NOT NULL,
	"tasks_scheduled" integer DEFAULT 0 NOT NULL,
	"blocks_generated" integer DEFAULT 0 NOT NULL,
	"total_block_minutes" integer DEFAULT 0 NOT NULL,
	"baseline_block_minutes" integer DEFAULT 0 NOT NULL,
	"estimated_savings_minutes" integer DEFAULT 0 NOT NULL,
	"optimization_score" numeric(6, 2),
	"status" varchar(30) DEFAULT 'COMPLETED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "optimization_runs_run_code_unique" UNIQUE("run_code")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"action" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"performed_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_defect_id_defects_id_fk" FOREIGN KEY ("defect_id") REFERENCES "public"."defects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trains" ADD CONSTRAINT "trains_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "train_forecasts" ADD CONSTRAINT "train_forecasts_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_windows" ADD CONSTRAINT "block_windows_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_corridor_id_corridors_id_fk" FOREIGN KEY ("corridor_id") REFERENCES "public"."corridors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_tasks" ADD CONSTRAINT "block_tasks_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_tasks" ADD CONSTRAINT "block_tasks_maintenance_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("maintenance_task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_tasks" ADD CONSTRAINT "block_tasks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "corridors_code_idx" ON "corridors" USING btree ("code");--> statement-breakpoint
CREATE INDEX "assets_department_idx" ON "assets" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "assets_corridor_idx" ON "assets" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "defects_asset_idx" ON "defects" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "defects_corridor_idx" ON "defects" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "defects_severity_idx" ON "defects" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "defects_status_idx" ON "defects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_corridor_idx" ON "maintenance_tasks" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "tasks_department_idx" ON "maintenance_tasks" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "maintenance_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "maintenance_tasks" USING btree ("priority_score");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "maintenance_tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "trains_corridor_idx" ON "trains" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "trains_arrival_idx" ON "trains" USING btree ("scheduled_arrival");--> statement-breakpoint
CREATE INDEX "forecast_corridor_idx" ON "train_forecasts" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "forecast_date_idx" ON "train_forecasts" USING btree ("forecast_date");--> statement-breakpoint
CREATE INDEX "block_windows_corridor_idx" ON "block_windows" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "block_windows_start_idx" ON "block_windows" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "blocks_corridor_idx" ON "blocks" USING btree ("corridor_id");--> statement-breakpoint
CREATE INDEX "blocks_start_idx" ON "blocks" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "blocks_status_idx" ON "blocks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "block_tasks_block_idx" ON "block_tasks" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "block_tasks_task_idx" ON "block_tasks" USING btree ("maintenance_task_id");