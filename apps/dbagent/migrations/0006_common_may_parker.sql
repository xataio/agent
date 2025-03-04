CREATE TABLE "aws_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_identifier" text NOT NULL,
	"integration_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"region" text DEFAULT 'us-east-1' NOT NULL,
	CONSTRAINT "uq_aws_clusters_integration_identifier" UNIQUE("cluster_identifier","integration_id")
);
--> statement-breakpoint
ALTER TABLE "connections_info" RENAME TO "connection_info";--> statement-breakpoint
ALTER TABLE "connection_info" DROP CONSTRAINT "fk_connections_info_connection";
--> statement-breakpoint
ALTER TABLE "aws_clusters" ADD CONSTRAINT "fk_aws_clusters_integration" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_info" ADD CONSTRAINT "fk_connections_info_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_schedules_next_run_status" ON "schedules" USING btree ("next_run","status");