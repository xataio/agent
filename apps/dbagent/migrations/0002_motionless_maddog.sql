CREATE TYPE "public"."message_role" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text DEFAULT 'New Conversation',
	"connection_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"message" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "fk_chats_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "fk_chats_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_chat" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chats_project_id" ON "chats" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_chats_connection_id" ON "chats" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_messages_chat_id" ON "messages" USING btree ("chat_id");--> statement-breakpoint
CREATE POLICY "chats_policy" ON "chats" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = chats.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
CREATE POLICY "messages_policy" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members pm
        JOIN chats c ON c.project_id = pm.project_id
        WHERE c.id = messages.chat_id AND pm.user_id = current_setting('app.current_user', true)::TEXT
      ));