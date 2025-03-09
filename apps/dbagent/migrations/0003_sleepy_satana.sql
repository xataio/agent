ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "projects_members_policy" ON "project_members" AS PERMISSIVE FOR ALL TO "user" USING (true);--> statement-breakpoint
ALTER POLICY "aws_cluster_connections_policy" ON "aws_cluster_connections" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = aws_cluster_connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
ALTER POLICY "aws_clusters_policy" ON "aws_clusters" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = aws_clusters.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
ALTER POLICY "connection_info_policy" ON "connection_info" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = connection_info.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
ALTER POLICY "connections_policy" ON "connections" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
ALTER POLICY "integrations_policy" ON "integrations" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = integrations.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
ALTER POLICY "projects_view_policy" ON "projects" TO "user" USING (EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = current_setting('app.current_user', true)::TEXT
    ));--> statement-breakpoint
ALTER POLICY "projects_create_policy" ON "projects" TO "user" WITH CHECK (true);--> statement-breakpoint
ALTER POLICY "projects_update_policy" ON "projects" TO "user" USING (EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    ));--> statement-breakpoint
ALTER POLICY "projects_delete_policy" ON "projects" TO "user" USING (EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    ));--> statement-breakpoint
ALTER POLICY "schedule_runs_policy" ON "schedule_runs" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = schedule_runs.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));--> statement-breakpoint
ALTER POLICY "schedules_policy" ON "schedules" TO "user" USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = schedules.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      ));