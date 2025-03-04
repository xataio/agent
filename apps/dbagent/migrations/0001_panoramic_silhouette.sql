ALTER TABLE "schedules" ADD COLUMN "max_steps" integer;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "notify_level" "notification_level" DEFAULT 'alert' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "extra_notification_text" text;