UPDATE "schedules"
SET "model" = 'openai:gpt-5'
WHERE "model" LIKE 'openai%';