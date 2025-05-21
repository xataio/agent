ALTER TABLE "mcp_servers" DROP CONSTRAINT "uq_mcp_servers_server_name";--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "config" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "server_name";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "file_path";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "env_vars";