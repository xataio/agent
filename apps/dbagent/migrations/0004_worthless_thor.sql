ALTER TABLE "assoc_cluster_connections" RENAME TO "aws_cluster_connections";--> statement-breakpoint
ALTER TABLE "aws_clusters" DROP CONSTRAINT "uq_aws_clusters_integration_identifier";--> statement-breakpoint
ALTER TABLE "aws_cluster_connections" DROP CONSTRAINT "assoc_instance_connections_instance_id_fkey";
--> statement-breakpoint
ALTER TABLE "aws_cluster_connections" DROP CONSTRAINT "assoc_instance_connections_connection_id_fkey";
--> statement-breakpoint
ALTER TABLE "aws_clusters" DROP CONSTRAINT "fk_aws_clusters_integration_name";
--> statement-breakpoint
ALTER TABLE "aws_cluster_connections" ADD CONSTRAINT "fk_aws_cluster_connections_cluster" FOREIGN KEY ("cluster_id") REFERENCES "public"."aws_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws_cluster_connections" ADD CONSTRAINT "fk_aws_cluster_connections_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws_clusters" DROP COLUMN "integration";--> statement-breakpoint
ALTER TABLE "aws_clusters" ADD CONSTRAINT "uq_aws_clusters_integration_identifier" UNIQUE("cluster_identifier");