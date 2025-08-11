-- Migration to update deprecated OpenAI models to GPT-5 variants
-- This migration maps old OpenAI models to their GPT-5 equivalents

-- Update schedules table
UPDATE "schedules"
SET "model" = CASE
    -- Map deprecated OpenAI models to GPT-5 variants
    WHEN "model" = 'openai:gpt-4.1' THEN 'openai:gpt-5'
    WHEN "model" = 'openai:gpt-4.1-mini' THEN 'openai:gpt-5-mini'
    WHEN "model" = 'openai:gpt-4o' THEN 'openai:gpt-5'
    WHEN "model" = 'openai:gpt-4-turbo' THEN 'openai:gpt-5-turbo'
    WHEN "model" = 'openai:o4-mini' THEN 'openai:gpt-5-mini'
    WHEN "model" = 'openai:o1' THEN 'openai:gpt-5'
    -- Legacy format support (in case any remain)
    WHEN "model" = 'openai-gpt-4o' THEN 'openai:gpt-5'
    WHEN "model" = 'openai-gpt-4-turbo' THEN 'openai:gpt-5-turbo'
    ELSE "model" -- Keep non-OpenAI models as is
END
WHERE "model" LIKE 'openai%';

-- Update chats table
UPDATE "chats"
SET "model" = CASE
    -- Map deprecated OpenAI models to GPT-5 variants
    WHEN "model" = 'openai:gpt-4.1' THEN 'openai:gpt-5'
    WHEN "model" = 'openai:gpt-4.1-mini' THEN 'openai:gpt-5-mini'
    WHEN "model" = 'openai:gpt-4o' THEN 'openai:gpt-5'
    WHEN "model" = 'openai:gpt-4-turbo' THEN 'openai:gpt-5-turbo'
    WHEN "model" = 'openai:o4-mini' THEN 'openai:gpt-5-mini'
    WHEN "model" = 'openai:o1' THEN 'openai:gpt-5'
    -- Legacy format support (in case any remain)
    WHEN "model" = 'openai-gpt-4o' THEN 'openai:gpt-5'
    WHEN "model" = 'openai-gpt-4-turbo' THEN 'openai:gpt-5-turbo'
    ELSE "model" -- Keep non-OpenAI models as is
END
WHERE "model" LIKE 'openai%';

-- Update default for schedules table if it still uses old model
ALTER TABLE "schedules"
ALTER COLUMN "model" SET DEFAULT 'openai:gpt-5';