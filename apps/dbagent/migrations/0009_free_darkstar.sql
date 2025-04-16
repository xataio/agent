ALTER TABLE "mcp_servers" ADD COLUMN "server_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "file_path" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "uq_mcp_servers_server_name" UNIQUE("server_name");