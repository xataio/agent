CREATE TABLE "model_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_model_settings_project_model" UNIQUE("project_id","model_id")
);
--> statement-breakpoint
ALTER TABLE "model_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "fk_model_settings_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_model_settings_project_id" ON "model_settings" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "model_settings_policy" ON "model_settings" AS PERMISSIVE FOR ALL TO "authenticated_user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = model_settings.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));