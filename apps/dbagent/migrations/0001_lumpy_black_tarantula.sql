CREATE TYPE "public"."notification_level" AS ENUM('info', 'warning', 'alert');--> statement-breakpoint
CREATE TABLE "schedule_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"result" text NOT NULL,
	"summary" text,
	"notification_level" "notification_level" DEFAULT 'info' NOT NULL,
	"messages" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "keep_history" integer DEFAULT 300;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_runs_created_at_idx" ON "schedule_runs" USING btree ("schedule_id","created_at");