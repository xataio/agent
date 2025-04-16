CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mcp_servers_name" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "mcp_servers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "mcp_servers_policy" ON "mcp_servers" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (true);