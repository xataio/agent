CREATE TYPE "public"."project_type" AS ENUM('postgres', 'rds');--> statement-breakpoint
CREATE TABLE "project_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"connection_string" text NOT NULL,
	CONSTRAINT "uq_project_connections_name" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "project_connections_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_project_connections_info" UNIQUE("connection_id","type")
);
--> statement-breakpoint
CREATE TABLE "project_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_project_integrations_name" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "project_schedules" (
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
	"model" text DEFAULT 'openai-gpt-4o' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"type" "project_type" NOT NULL,
	"info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "uq_projects_name" UNIQUE("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DROP TABLE "assoc_cluster_connections" CASCADE;--> statement-breakpoint
DROP TABLE "clusters" CASCADE;--> statement-breakpoint
DROP TABLE "connections" CASCADE;--> statement-breakpoint
DROP TABLE "dbinfo" CASCADE;--> statement-breakpoint
DROP TABLE "integrations" CASCADE;--> statement-breakpoint
DROP TABLE "schedules" CASCADE;--> statement-breakpoint
ALTER TABLE "project_connections" ADD CONSTRAINT "fk_project_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_connections_info" ADD CONSTRAINT "fk_project_connections_info_conn" FOREIGN KEY ("connection_id") REFERENCES "public"."project_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "fk_project_integrations_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_schedules" ADD CONSTRAINT "fk_project_schedules_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_schedules" ADD CONSTRAINT "fk_project_schedules_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."project_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "fk_projects_owner" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;