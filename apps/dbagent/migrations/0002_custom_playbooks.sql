CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "uq_playbooks_name" UNIQUE("project_id","name")
);
--> statement-breakpoint
ALTER TABLE "playbooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "fk_playbooks_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_playbooks_project_id" ON "playbooks" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "playbooks_policy" ON "playbooks" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = playbooks.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));