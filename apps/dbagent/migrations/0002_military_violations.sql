CREATE TABLE "slack_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slack_channel_id" text NOT NULL,
	"slack_team_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_slack_conversations_ids" UNIQUE("slack_channel_id","slack_team_id")
);
--> statement-breakpoint
CREATE TABLE "slack_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slack_user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_slack_memory" UNIQUE("slack_user_id","conversation_id","key")
);
--> statement-breakpoint
CREATE TABLE "slack_user_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slack_user_id" uuid NOT NULL,
	"platform_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_slack_user_links" UNIQUE("slack_user_id","platform_user_id")
);
--> statement-breakpoint
CREATE TABLE "slack_user_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slack_user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_slack_user_projects" UNIQUE("slack_user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "slack_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slack_user_id" text NOT NULL,
	"slack_team_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_slack_users_ids" UNIQUE("slack_user_id","slack_team_id")
);
--> statement-breakpoint
ALTER TABLE "slack_conversations" ADD CONSTRAINT "fk_slack_conversations_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_memory" ADD CONSTRAINT "fk_slack_memory_user" FOREIGN KEY ("slack_user_id") REFERENCES "public"."slack_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_memory" ADD CONSTRAINT "fk_slack_memory_conversation" FOREIGN KEY ("conversation_id") REFERENCES "public"."slack_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_user_links" ADD CONSTRAINT "fk_slack_user_links_slack_user" FOREIGN KEY ("slack_user_id") REFERENCES "public"."slack_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_user_projects" ADD CONSTRAINT "fk_slack_user_projects_user" FOREIGN KEY ("slack_user_id") REFERENCES "public"."slack_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_user_projects" ADD CONSTRAINT "fk_slack_user_projects_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;