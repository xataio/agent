ALTER TABLE "gcp_instances" DROP CONSTRAINT "uq_gcp_instances_instance_name";--> statement-breakpoint
ALTER TABLE "gcp_instances" ADD CONSTRAINT "uq_gcp_instances_instance_name" UNIQUE("project_id","gcp_project_id","instance_name");