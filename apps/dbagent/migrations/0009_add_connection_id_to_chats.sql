-- Add connectionId column to chats table
ALTER TABLE chats
ADD COLUMN "connectionId" UUID NULL;

-- Add foreign key constraint
ALTER TABLE chats
ADD CONSTRAINT fk_chats_connection
FOREIGN KEY ("connectionId")
REFERENCES connections(id)
ON DELETE SET NULL;

-- Add index for connectionId
CREATE INDEX idx_chats_connection_id ON chats("connectionId");
