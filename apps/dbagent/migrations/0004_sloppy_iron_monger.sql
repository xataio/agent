ALTER POLICY "projects_view_policy" ON "projects" TO "user" USING (EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = current_setting('app.current_user', true)::TEXT
    ));--> statement-breakpoint
ALTER POLICY "projects_update_policy" ON "projects" TO "user" USING (EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    ));--> statement-breakpoint
ALTER POLICY "projects_delete_policy" ON "projects" TO "user" USING (EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    ));