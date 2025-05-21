'use server';

import { eq } from 'drizzle-orm';
import { DBAccess } from '~/lib/db/db';
import { MCPServer, MCPServerInsert, mcpServers } from '~/lib/db/schema';

export async function getUserMcpServers(dbAccess: DBAccess) {
  return await dbAccess.query(async ({ db }) => {
    const results = await db.select().from(mcpServers);

    return results;
  });
}

export async function getUserMcpServer(dbAccess: DBAccess, serverName: string) {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.select().from(mcpServers).where(eq(mcpServers.name, serverName)).limit(1);

    return result[0];
  });
}

export async function updateUserMcpServer(dbAccess: DBAccess, input: Partial<MCPServerInsert> & { name: string }) {
  return await dbAccess.query(async ({ db }) => {
    if (!input.name) {
      throw new Error('Server name (input.name) is required for update.');
    }

    const result = await db
      .update(mcpServers)
      .set({
        enabled: input.enabled,
        config: input.config
      })
      .where(eq(mcpServers.name, input.name))
      .returning();

    if (result.length === 0) {
      throw new Error(
        `[UPDATE]Server with name "${input.name}" not found, or update failed due to constraints (e.g., serverName already exists).`
      );
    }

    return result[0];
  });
}

export async function addUserMcpServerToDB(dbAccess: DBAccess, input: MCPServerInsert): Promise<MCPServer> {
  return await dbAccess.query(async ({ db }) => {
    // Check if server with same name exists
    const existingServer = await db.select().from(mcpServers).where(eq(mcpServers.name, input.name)).limit(1);

    if (existingServer.length > 0) {
      throw new Error(`Server with name "${input.name}" already exists`);
    }

    // Create new server
    // All fields in MCPServerInsert should be passed.
    // Drizzle handles undefined for optional fields (inserts NULL or uses default)
    const result = await db
      .insert(mcpServers)
      .values({
        name: input.name,
        version: input.version,
        enabled: input.enabled,
        config: input.config
      })
      .returning();

    const server = result[0];

    if (!server) {
      throw new Error('Failed to create server');
    }

    return server;
  });
}

export async function deleteUserMcpServer(dbAccess: DBAccess, serverName: string): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.delete(mcpServers).where(eq(mcpServers.name, serverName)).returning();

    if (result.length === 0) {
      throw new Error(`Server with name "${serverName}" not found`);
    }
  });
}
