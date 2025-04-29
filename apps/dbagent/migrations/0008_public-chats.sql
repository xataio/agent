CREATE TYPE "public"."visibility" AS ENUM('public', 'private');

--> statement-breakpoint
CREATE ROLE "anonymous_user";

--> statement-breakpoint
ALTER TABLE
    "chats"
ADD
    COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;

--> statement-breakpoint
CREATE POLICY "chats_anonymous_policy" ON "chats" AS PERMISSIVE FOR
SELECT
    TO "anonymous_user" USING (visibility = 'public');

--> statement-breakpoint
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "anonymous_user";

--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "anonymous_user";