ALTER TABLE
    "assoc_cluster_connections" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
DROP TABLE "assoc_cluster_connections" CASCADE;

--> statement-breakpoint
ALTER TABLE
    "aws_clusters" DROP CONSTRAINT "uq_aws_clusters_integration_identifier";

--> statement-breakpoint
ALTER TABLE
    "aws_clusters" DROP CONSTRAINT "fk_aws_clusters_integration_name";

--> statement-breakpoint
ALTER TABLE
    "aws_clusters"
ADD
    COLUMN "connection_id" uuid NOT NULL;

--> statement-breakpoint
ALTER TABLE
    "aws_clusters"
ADD
    CONSTRAINT "fk_aws_clusters_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "aws_clusters" DROP COLUMN "integration";

--> statement-breakpoint
ALTER TABLE
    "aws_clusters"
ADD
    CONSTRAINT "uq_aws_clusters_integration_identifier" UNIQUE("cluster_identifier");