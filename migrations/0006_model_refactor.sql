ALTER TABLE
    "schedules"
ALTER COLUMN
    "model" DROP DEFAULT;

-- Update existing models to use provider:model syntax
-- Example: openai-gpt-4o becomes openai:gpt-4o
UPDATE
    "schedules"
SET
    "model" = CASE
        WHEN "model" LIKE 'openai-%' THEN REPLACE("model", 'openai-', 'openai:')
        WHEN "model" LIKE 'anthropic-%' THEN REPLACE("model", 'anthropic-', 'anthropic:')
        WHEN "model" LIKE 'deepseek-%' THEN REPLACE("model", 'deepseek-', 'deepseek:')
        WHEN "model" LIKE 'google-%' THEN REPLACE("model", 'google-', 'google:')
        WHEN "model" LIKE 'gemini-%' THEN REPLACE("model", 'gemini-', 'google:gemini-')
        ELSE "model" -- Keep as is if no pattern matches
    END
WHERE
    "model" IS NOT NULL;