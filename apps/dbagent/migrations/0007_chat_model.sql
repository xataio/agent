ALTER TABLE "documents" RENAME TO "artifact_documents";--> statement-breakpoint
ALTER TABLE "suggestions" RENAME TO "artifact_suggestions";--> statement-breakpoint
ALTER TABLE "votes" RENAME TO "message_votes";--> statement-breakpoint
ALTER TABLE "artifact_documents" DROP CONSTRAINT "fk_documents_project";
--> statement-breakpoint
ALTER TABLE "artifact_suggestions" DROP CONSTRAINT "fk_suggestions_project";
--> statement-breakpoint
ALTER TABLE "artifact_suggestions" DROP CONSTRAINT "fk_suggestions_document";
--> statement-breakpoint
ALTER TABLE "message_votes" DROP CONSTRAINT "fk_votes_message";
--> statement-breakpoint
ALTER TABLE "message_votes" DROP CONSTRAINT "fk_votes_project";
--> statement-breakpoint
ALTER TABLE "message_votes" DROP CONSTRAINT "fk_votes_chat";
--> statement-breakpoint
DROP INDEX "idx_documents_project_id";--> statement-breakpoint
DROP INDEX "idx_documents_user_id";--> statement-breakpoint
DROP INDEX "idx_suggestions_document_id";--> statement-breakpoint
DROP INDEX "idx_suggestions_project_id";--> statement-breakpoint
DROP INDEX "idx_suggestions_user_id";--> statement-breakpoint
DROP INDEX "idx_votes_chat_id";--> statement-breakpoint
DROP INDEX "idx_votes_message_id";--> statement-breakpoint
DROP INDEX "idx_votes_project_id";--> statement-breakpoint
DROP INDEX "idx_votes_user_id";--> statement-breakpoint
ALTER TABLE "artifact_documents" DROP CONSTRAINT "documents_id_pk";--> statement-breakpoint
ALTER TABLE "artifact_suggestions" DROP CONSTRAINT "suggestions_id_pk";--> statement-breakpoint
ALTER TABLE "message_votes" DROP CONSTRAINT "votes_chat_id_message_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "artifact_documents" ADD CONSTRAINT "artifact_documents_id_pk" PRIMARY KEY("id");--> statement-breakpoint
ALTER TABLE "artifact_suggestions" ADD CONSTRAINT "artifact_suggestions_id_pk" PRIMARY KEY("id");--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_chat_id_message_id_user_id_pk" PRIMARY KEY("chat_id","message_id","user_id");--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "model" text NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_documents" ADD CONSTRAINT "fk_artifact_documents_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_suggestions" ADD CONSTRAINT "fk_artifact_suggestions_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_suggestions" ADD CONSTRAINT "fk_artifact_suggestions_document" FOREIGN KEY ("document_id") REFERENCES "public"."artifact_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "fk_message_votes_message" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "fk_message_votes_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "fk_votes_chat" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artifact_documents_project_id" ON "artifact_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_documents_user_id" ON "artifact_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_suggestions_document_id" ON "artifact_suggestions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_suggestions_project_id" ON "artifact_suggestions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_suggestions_user_id" ON "artifact_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_chat_id" ON "message_votes" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_message_id" ON "message_votes" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_project_id" ON "message_votes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_message_votes_user_id" ON "message_votes" USING btree ("user_id");--> statement-breakpoint
ALTER POLICY "documents_policy" ON "artifact_documents" RENAME TO "artifact_documents_policy";--> statement-breakpoint
ALTER POLICY "suggestions_policy" ON "artifact_suggestions" RENAME TO "artifact_suggestions_policy";--> statement-breakpoint
ALTER POLICY "votes_policy" ON "message_votes" RENAME TO "message_votes_policy";