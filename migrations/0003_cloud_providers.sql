CREATE TYPE "public"."cloud_provider" AS ENUM('aws', 'gcp', 'other');--> statement-breakpoint
CREATE TABLE "gcp_instance_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"instance_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gcp_instance_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gcp_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"instance_name" text NOT NULL,
	"gcp_project_id" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "uq_gcp_instances_instance_name" UNIQUE("project_id","gcp_project_id","instance_name")
);
--> statement-breakpoint
ALTER TABLE "gcp_instances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cloud_provider" "cloud_provider" DEFAULT 'aws' NOT NULL;--> statement-breakpoint
ALTER TABLE "gcp_instance_connections" ADD CONSTRAINT "fk_gcp_instance_connections_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gcp_instance_connections" ADD CONSTRAINT "fk_gcp_instance_connections_instance" FOREIGN KEY ("instance_id") REFERENCES "public"."gcp_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gcp_instance_connections" ADD CONSTRAINT "fk_gcp_instance_connections_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gcp_instances" ADD CONSTRAINT "fk_gcp_instances_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gcp_instance_connections_instance_id" ON "gcp_instance_connections" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_gcp_instance_connections_connection_id" ON "gcp_instance_connections" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_gcp_instance_connections_project_id" ON "gcp_instance_connections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_gcp_instances_project_id" ON "gcp_instances" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "gcp_instance_connections_policy" ON "gcp_instance_connections" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = gcp_instance_connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
CREATE POLICY "gcp_instances_policy" ON "gcp_instances" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = gcp_instances.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));