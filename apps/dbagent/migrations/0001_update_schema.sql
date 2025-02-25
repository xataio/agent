ALTER TABLE "clusters" ALTER COLUMN "cluster_identifier" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clusters" ALTER COLUMN "integration" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clusters" ALTER COLUMN "data" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "is_default" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "is_default" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "connstring" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "model" SET NOT NULL;