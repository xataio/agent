ALTER TABLE "chats" ADD COLUMN "connection_id" uuid;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "fk_chats_connection" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chats_connection_id" ON "chats" USING btree ("connection_id");