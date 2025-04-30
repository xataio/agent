CREATE TABLE "artifact_documents" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"kind" varchar DEFAULT 'text' NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "artifact_documents_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "artifact_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artifact_suggestions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"document_created_at" timestamp NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artifact_suggestions_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "artifact_suggestions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_votes" (
	"project_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_upvoted" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_votes_chat_id_message_id_user_id_pk" PRIMARY KEY("chat_id","message_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "message_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "connection_info" DROP CONSTRAINT "uq_connections_info";--> statement-breakpoint
ALTER TABLE "connection_info" DROP CONSTRAINT "fk_connections_info_connection";
--> statement-breakpoint
DROP INDEX "idx_aws_cluster_conn_cluster_id";--> statement-breakpoint
DROP INDEX "idx_aws_cluster_conn_connection_id";--> statement-breakpoint
DROP INDEX "idx_aws_cluster_conn_project_id";--> statement-breakpoint
ALTER TABLE "artifact_documents" ADD CONSTRAINT "fk_artifact_documents_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_suggestions" ADD CONSTRAINT "fk_artifact_suggestions_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_suggestions" ADD CONSTRAINT "fk_artifact_suggestions_document" FOREIGN KEY ("document_id") REFERENCES "public"."artifact_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "fk_chats_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "fk_votes_chat" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "fk_message_votes_message" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "fk_message_votes_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_chat" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artifact_documents_project_id" ON "artifact_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_documents_user_id" ON "artifact_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_suggestions_document_id" ON "artifact_suggestions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_suggestions_project_id" ON "artifact_suggestions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_suggestions_user_id" ON "artifact_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chats_project_id" ON "chats" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_chats_user_id" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_chat_id" ON "message_votes" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_message_id" ON "message_votes" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_project_id" ON "message_votes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_user_id" ON "message_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_project_id" ON "messages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_messages_chat_id" ON "messages" USING btree ("chat_id");--> statement-breakpoint
ALTER TABLE "connection_info" ADD CONSTRAINT "fk_connection_info_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_aws_cluster_connections_cluster_id" ON "aws_cluster_connections" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "idx_aws_cluster_connections_connection_id" ON "aws_cluster_connections" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_aws_cluster_connections_project_id" ON "aws_cluster_connections" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "playbooks" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "connection_info" ADD CONSTRAINT "uq_connection_info" UNIQUE("connection_id","type");--> statement-breakpoint
ALTER POLICY "projects_members_policy" ON "project_members" RENAME TO "project_members_policy";--> statement-breakpoint
CREATE POLICY "artifact_documents_policy" ON "artifact_documents" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = artifact_documents.project_id AND user_id = current_setting('app.current_user', true)::TEXT
        ));--> statement-breakpoint
CREATE POLICY "artifact_suggestions_policy" ON "artifact_suggestions" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = artifact_suggestions.project_id AND user_id = current_setting('app.current_user', true)::TEXT
        ));--> statement-breakpoint
CREATE POLICY "chats_policy" ON "chats" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = chats.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
CREATE POLICY "message_votes_policy" ON "message_votes" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = message_votes.project_id AND user_id = current_setting('app.current_user', true)::TEXT
        ));--> statement-breakpoint
CREATE POLICY "messages_policy" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = messages.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));