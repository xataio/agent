-- Add mcp_server_type enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mcp_server_type') THEN
        CREATE TYPE mcp_server_type AS ENUM ('stdio', 'sse', 'streamable-http');
    END IF;
END$$;

-- Add the new columns to the mcp_servers table
ALTER TABLE mcp_servers
ADD COLUMN type mcp_server_type DEFAULT 'stdio',
ADD COLUMN url TEXT;
