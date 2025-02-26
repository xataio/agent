ALTER TABLE "dbinfo" RENAME COLUMN "connid" TO "connection_id";--> statement-breakpoint
ALTER TABLE "dbinfo" DROP CONSTRAINT "dbinfo_module_unique";--> statement-breakpoint
ALTER TABLE "dbinfo" DROP CONSTRAINT "dbinfo_connid_fkey";
--> statement-breakpoint
ALTER TABLE "assoc_cluster_connections" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "assoc_cluster_connections" ALTER COLUMN "id" SET DEFAULT 'gen_random_uuid()';--> statement-breakpoint
ALTER TABLE "assoc_cluster_connections" ALTER COLUMN "cluster_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "assoc_cluster_connections" ALTER COLUMN "connection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "clusters" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "clusters" ALTER COLUMN "id" SET DEFAULT 'gen_random_uuid()';--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "id" SET DEFAULT 'gen_random_uuid()';--> statement-breakpoint
ALTER TABLE "dbinfo" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "dbinfo" ALTER COLUMN "id" SET DEFAULT 'gen_random_uuid()';--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "id" SET DEFAULT 'gen_random_uuid()';--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "id" SET DEFAULT 'gen_random_uuid()';--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "connection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "dbinfo" ADD CONSTRAINT "dbinfo_connid_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dbinfo" ADD CONSTRAINT "dbinfo_module_unique" UNIQUE("connection_id","module");