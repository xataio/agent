CREATE TYPE "public"."visibility" AS ENUM('public', 'private');

--> statement-breakpoint
ALTER TABLE
  "chats"
ADD
  COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;

--> statement-breakpoint
CREATE POLICY "chats_view_policy" ON "chats" AS PERMISSIVE FOR
SELECT
  TO public USING (
    EXISTS (
      SELECT
        1
      FROM
        project_members
      WHERE
        project_id = chats.project_id
        AND user_id = current_setting('app.current_user', true) :: TEXT
    )
    OR visibility = 'public'
  );