CREATE TYPE "public"."member_role" AS ENUM('owner', 'member');

--> statement-breakpoint
CREATE ROLE "user";

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
  "aws_cluster_connections" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "aws_clusters" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "connection_info" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "connections" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "integrations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "projects" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "schedule_runs" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "schedules" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE
  "projects" DROP CONSTRAINT "uq_projects_name";

--> statement-breakpoint
ALTER TABLE
  "aws_cluster_connections"
ADD
  COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "aws_clusters"
ADD
  COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "connection_info"
ADD
  COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "schedule_runs"
ADD
  COLUMN "project_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "project_members"
ADD
  CONSTRAINT "fk_project_members_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "idx_project_members_project_id" ON "project_members" USING btree ("project_id");

--> statement-breakpoint
ALTER TABLE
  "aws_cluster_connections"
ADD
  CONSTRAINT "fk_aws_cluster_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
  "aws_clusters"
ADD
  CONSTRAINT "fk_aws_clusters_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
  "connection_info"
ADD
  CONSTRAINT "fk_connection_info_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
  "schedule_runs"
ADD
  CONSTRAINT "fk_schedule_runs_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;

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
ALTER TABLE
  "projects" DROP COLUMN "owner_id";

--> statement-breakpoint
CREATE POLICY "aws_cluster_connections_policy" ON "aws_cluster_connections" AS PERMISSIVE FOR ALL TO "user" USING (
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
CREATE POLICY "aws_clusters_policy" ON "aws_clusters" AS PERMISSIVE FOR ALL TO "user" USING (
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
CREATE POLICY "connection_info_policy" ON "connection_info" AS PERMISSIVE FOR ALL TO "user" USING (
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
CREATE POLICY "connections_policy" ON "connections" AS PERMISSIVE FOR ALL TO "user" USING (
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
CREATE POLICY "integrations_policy" ON "integrations" AS PERMISSIVE FOR ALL TO "user" USING (
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
CREATE POLICY "projects_view_policy" ON "projects" AS PERMISSIVE FOR
SELECT
  TO "user" USING (
    EXISTS (
      SELECT
        1
      FROM
        project_members
      WHERE
        project_id = id
        AND user_id = current_setting('app.current_user', true) :: TEXT
    )
  );

--> statement-breakpoint
CREATE POLICY "projects_create_policy" ON "projects" AS PERMISSIVE FOR
INSERT
  TO "user" WITH CHECK (true);

--> statement-breakpoint
CREATE POLICY "projects_update_policy" ON "projects" AS PERMISSIVE FOR
UPDATE
  TO "user" USING (
    EXISTS (
      SELECT
        1
      FROM
        project_members
      WHERE
        project_id = id
        AND user_id = current_setting('app.current_user', true) :: TEXT
        AND role = 'owner'
    )
  );

--> statement-breakpoint
CREATE POLICY "projects_delete_policy" ON "projects" AS PERMISSIVE FOR DELETE TO "user" USING (
  EXISTS (
    SELECT
      1
    FROM
      project_members
    WHERE
      project_id = id
      AND user_id = current_setting('app.current_user', true) :: TEXT
      AND role = 'owner'
  )
);

--> statement-breakpoint
CREATE POLICY "schedule_runs_policy" ON "schedule_runs" AS PERMISSIVE FOR ALL TO "user" USING (
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
CREATE POLICY "schedules_policy" ON "schedules" AS PERMISSIVE FOR ALL TO "user" USING (
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
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "user";