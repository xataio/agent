CREATE TYPE "public"."notification_level" AS ENUM('info', 'warning', 'alert');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('disabled', 'scheduled', 'running');--> statement-breakpoint
CREATE TABLE "aws_cluster_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aws_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_identifier" text NOT NULL,
	"region" text DEFAULT 'us-east-1' NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_aws_clusters_integration_identifier" UNIQUE("cluster_identifier")
);
--> statement-breakpoint
CREATE TABLE "connection_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_connections_info" UNIQUE("connection_id","type")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"connection_string" text NOT NULL,
	CONSTRAINT "uq_connections_name" UNIQUE("project_id","name"),
	CONSTRAINT "uq_connections_connection_string" UNIQUE("project_id","connection_string")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_integrations_name" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	CONSTRAINT "uq_projects_name" UNIQUE("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE "schedule_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"result" text NOT NULL,
	"summary" text,
	"notification_level" "notification_level" DEFAULT 'info' NOT NULL,
	"messages" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"playbook" varchar(255) NOT NULL,
	"schedule_type" varchar(255) NOT NULL,
	"cron_expression" varchar(255),
	"additional_instructions" text,
	"min_interval" integer,
	"max_interval" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp,
	"status" "schedule_status" DEFAULT 'disabled' NOT NULL,
	"failures" integer DEFAULT 0,
	"keep_history" integer DEFAULT 300 NOT NULL,
	"model" text DEFAULT 'openai-gpt-4o' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aws_cluster_connections" ADD CONSTRAINT "fk_aws_cluster_connections_cluster" FOREIGN KEY ("cluster_id") REFERENCES "public"."aws_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws_cluster_connections" ADD CONSTRAINT "fk_aws_cluster_connections_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_info" ADD CONSTRAINT "fk_connections_info_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "fk_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "fk_integrations_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "fk_schedule_runs_schedule" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_schedule_runs_created_at" ON "schedule_runs" USING btree ("schedule_id","created_at");