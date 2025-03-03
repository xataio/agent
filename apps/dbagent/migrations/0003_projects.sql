CREATE TYPE "public"."project_type" AS ENUM('postgres', 'rds');

--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

--> statement-breakpoint
ALTER TABLE
	"assoc_cluster_connections" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
DROP TABLE "assoc_cluster_connections" CASCADE;

--> statement-breakpoint
ALTER TABLE
	"dbinfo" RENAME TO "connections_info";

--> statement-breakpoint
ALTER TABLE
	"clusters" RENAME TO "projects";

--> statement-breakpoint
ALTER TABLE
	"projects" RENAME COLUMN "cluster_identifier" TO "name";

--> statement-breakpoint
ALTER TABLE
	"projects" RENAME COLUMN "integration" TO "type";

--> statement-breakpoint
ALTER TABLE
	"projects" RENAME COLUMN "data" TO "info";

--> statement-breakpoint
ALTER TABLE
	"connections" RENAME COLUMN "connstring" TO "connection_string";

--> statement-breakpoint
ALTER TABLE
	"connections_info" RENAME COLUMN "module" TO "type";

--> statement-breakpoint
ALTER TABLE
	"projects" DROP CONSTRAINT "instances_integration_identifier_unique";

--> statement-breakpoint
ALTER TABLE
	"connections" DROP CONSTRAINT "connections_name_unique";

--> statement-breakpoint
ALTER TABLE
	"connections" DROP CONSTRAINT "connections_connstring_unique";

--> statement-breakpoint
ALTER TABLE
	"connections_info" DROP CONSTRAINT "dbinfo_module_unique";

--> statement-breakpoint
ALTER TABLE
	"integrations" DROP CONSTRAINT "integrations_name_unique" CASCADE;

--> statement-breakpoint
ALTER TABLE
	"connections_info" DROP CONSTRAINT "dbinfo_connid_fkey";

--> statement-breakpoint
ALTER TABLE
	"schedule_runs" DROP CONSTRAINT "schedule_runs_schedule_id_fkey";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP CONSTRAINT "schedules_connection_id_fkey";

--> statement-breakpoint
DROP INDEX "schedule_runs_created_at_idx";

--> statement-breakpoint
ALTER TABLE
	"connections_info"
ALTER COLUMN
	"connection_id"
SET
	NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"connections_info"
ALTER COLUMN
	"data"
SET
	NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"integrations"
ALTER COLUMN
	"name"
SET
	NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"integrations"
ALTER COLUMN
	"data"
SET
	NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedule_runs"
ALTER COLUMN
	"created_at"
SET
	NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ALTER COLUMN
	"enabled"
SET
	DEFAULT true;

--> statement-breakpoint
ALTER TABLE
	"projects"
ADD
	COLUMN "owner_id" text NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"connections"
ADD
	COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"integrations"
ADD
	COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"projects"
ADD
	CONSTRAINT "fk_projects_owner" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"connections"
ADD
	CONSTRAINT "fk_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"connections_info"
ADD
	CONSTRAINT "fk_connections_info_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"integrations"
ADD
	CONSTRAINT "fk_integrations_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedule_runs"
ADD
	CONSTRAINT "fk_schedule_runs_schedule" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	CONSTRAINT "fk_schedules_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	CONSTRAINT "fk_schedules_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "idx_schedule_runs_created_at" ON "schedule_runs" USING btree ("schedule_id", "created_at");

--> statement-breakpoint
ALTER TABLE
	"projects" DROP COLUMN "region";

--> statement-breakpoint
ALTER TABLE
	"connections" DROP COLUMN "params";

--> statement-breakpoint
ALTER TABLE
	"projects"
ADD
	CONSTRAINT "uq_projects_name" UNIQUE("owner_id", "name");

--> statement-breakpoint
ALTER TABLE
	"connections"
ADD
	CONSTRAINT "uq_connections_name" UNIQUE("project_id", "name");

--> statement-breakpoint
ALTER TABLE
	"connections_info"
ADD
	CONSTRAINT "uq_connections_info" UNIQUE("connection_id", "type");

--> statement-breakpoint
ALTER TABLE
	"integrations"
ADD
	CONSTRAINT "uq_integrations_name" UNIQUE("project_id", "name");