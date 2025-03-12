CREATE TYPE "public"."member_role" AS ENUM('owner', 'member');

--> statement-breakpoint
CREATE TYPE "public"."notification_level" AS ENUM('info', 'warning', 'alert');

--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('disabled', 'scheduled', 'running');

--> statement-breakpoint
CREATE ROLE "authenticated_user";

--> statement-breakpoint
CREATE TABLE "aws_cluster_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"cluster_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL
);

--> statement-breakpoint
ALTER TABLE
	"aws_cluster_connections" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "aws_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"cluster_identifier" text NOT NULL,
	"region" text DEFAULT 'us-east-1' NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_aws_clusters_integration_identifier" UNIQUE("cluster_identifier")
);

--> statement-breakpoint
ALTER TABLE
	"aws_clusters" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "connection_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_connections_info" UNIQUE("connection_id", "type")
);

--> statement-breakpoint
ALTER TABLE
	"connection_info" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"connection_string" text NOT NULL,
	CONSTRAINT "uq_connections_name" UNIQUE("project_id", "name"),
	CONSTRAINT "uq_connections_connection_string" UNIQUE("project_id", "connection_string")
);

--> statement-breakpoint
ALTER TABLE
	"connections" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_integrations_name" UNIQUE("project_id", "name")
);

--> statement-breakpoint
ALTER TABLE
	"integrations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_project_members_user_project" UNIQUE("project_id", "user_id")
);

--> statement-breakpoint
ALTER TABLE
	"project_members" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);

--> statement-breakpoint
ALTER TABLE
	"projects" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "schedule_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"result" text NOT NULL,
	"summary" text,
	"notification_level" "notification_level" DEFAULT 'info' NOT NULL,
	"messages" jsonb NOT NULL
);

--> statement-breakpoint
ALTER TABLE
	"schedule_runs" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
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
	"model" text DEFAULT 'openai-gpt-4o' NOT NULL,
	"max_steps" integer,
	"notify_level" "notification_level" DEFAULT 'alert' NOT NULL,
	"extra_notification_text" text
);

--> statement-breakpoint
ALTER TABLE
	"schedules" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
	"aws_cluster_connections"
ADD
	CONSTRAINT "fk_aws_cluster_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"aws_cluster_connections"
ADD
	CONSTRAINT "fk_aws_cluster_connections_cluster" FOREIGN KEY ("cluster_id") REFERENCES "public"."aws_clusters"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"aws_cluster_connections"
ADD
	CONSTRAINT "fk_aws_cluster_connections_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"aws_clusters"
ADD
	CONSTRAINT "fk_aws_clusters_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"connection_info"
ADD
	CONSTRAINT "fk_connection_info_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"connection_info"
ADD
	CONSTRAINT "fk_connections_info_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"connections"
ADD
	CONSTRAINT "fk_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"integrations"
ADD
	CONSTRAINT "fk_integrations_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"project_members"
ADD
	CONSTRAINT "fk_project_members_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedule_runs"
ADD
	CONSTRAINT "fk_schedule_runs_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedule_runs"
ADD
	CONSTRAINT "fk_schedule_runs_schedule" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	CONSTRAINT "fk_schedules_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	CONSTRAINT "fk_schedules_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "idx_aws_cluster_conn_cluster_id" ON "aws_cluster_connections" USING btree ("cluster_id");

--> statement-breakpoint
CREATE INDEX "idx_aws_cluster_conn_connection_id" ON "aws_cluster_connections" USING btree ("connection_id");

--> statement-breakpoint
CREATE INDEX "idx_aws_cluster_conn_project_id" ON "aws_cluster_connections" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_aws_clusters_project_id" ON "aws_clusters" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_connection_info_connection_id" ON "connection_info" USING btree ("connection_id");

--> statement-breakpoint
CREATE INDEX "idx_connection_info_project_id" ON "connection_info" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_connections_project_id" ON "connections" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_integrations_project_id" ON "integrations" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_project_members_project_id" ON "project_members" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_schedule_runs_created_at" ON "schedule_runs" USING btree ("schedule_id", "created_at");

--> statement-breakpoint
CREATE INDEX "idx_schedule_runs_schedule_id" ON "schedule_runs" USING btree ("schedule_id");

--> statement-breakpoint
CREATE INDEX "idx_schedule_runs_project_id" ON "schedule_runs" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_schedule_runs_notification_level" ON "schedule_runs" USING btree ("notification_level");

--> statement-breakpoint
CREATE INDEX "idx_schedules_project_id" ON "schedules" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_schedules_connection_id" ON "schedules" USING btree ("connection_id");

--> statement-breakpoint
CREATE INDEX "idx_schedules_status" ON "schedules" USING btree ("status");

--> statement-breakpoint
CREATE INDEX "idx_schedules_next_run" ON "schedules" USING btree ("next_run");

--> statement-breakpoint
CREATE INDEX "idx_schedules_enabled" ON "schedules" USING btree ("enabled");

--> statement-breakpoint
CREATE POLICY "aws_cluster_connections_policy" ON "aws_cluster_connections" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = aws_cluster_connections.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
CREATE POLICY "aws_clusters_policy" ON "aws_clusters" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = aws_clusters.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
CREATE POLICY "connection_info_policy" ON "connection_info" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = connection_info.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
CREATE POLICY "connections_policy" ON "connections" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = connections.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
CREATE POLICY "integrations_policy" ON "integrations" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = integrations.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
CREATE POLICY "projects_members_policy" ON "project_members" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "projects_view_policy" ON "projects" AS PERMISSIVE FOR
SELECT
	TO "authenticated_user" USING (
		EXISTS (
			SELECT
				1
			FROM
				project_members
			WHERE
				project_id = projects.id
				AND user_id = current_setting('app.current_user', true) :: TEXT
		)
	);

--> statement-breakpoint
CREATE POLICY "projects_create_policy" ON "projects" AS PERMISSIVE FOR
INSERT
	TO "authenticated_user" WITH CHECK (true);

--> statement-breakpoint
CREATE POLICY "projects_update_policy" ON "projects" AS PERMISSIVE FOR
UPDATE
	TO "authenticated_user" USING (
		EXISTS (
			SELECT
				1
			FROM
				project_members
			WHERE
				project_id = projects.id
				AND user_id = current_setting('app.current_user', true) :: TEXT
				AND role = 'owner'
		)
	);

--> statement-breakpoint
CREATE POLICY "projects_delete_policy" ON "projects" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = projects.id
			AND user_id = current_setting('app.current_user', true) :: TEXT
			AND role = 'owner'
	)
);

--> statement-breakpoint
CREATE POLICY "schedule_runs_policy" ON "schedule_runs" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = schedule_runs.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
CREATE POLICY "schedules_policy" ON "schedules" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (
	EXISTS (
		SELECT
			1
		FROM
			project_members
		WHERE
			project_id = schedules.project_id
			AND user_id = current_setting('app.current_user', true) :: TEXT
	)
);

--> statement-breakpoint
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "authenticated_user";