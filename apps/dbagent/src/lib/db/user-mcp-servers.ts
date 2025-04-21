'use server';

import { eq } from 'drizzle-orm';
import { DBAccess } from '~/lib/db/db';
import { mcpServers } from '~/lib/db/schema';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';

export async function dbGetUserMcpServers(dbAccess: DBAccess) {
  return await dbAccess.query(async ({ db }) => {
    const results = await db.select().from(mcpServers);

    return results;
  });
}

export async function dbGetUserMcpServer(dbAccess: DBAccess, serverName: string) {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.select().from(mcpServers).where(eq(mcpServers.name, serverName)).limit(1);

    return result[0];
  });
}

//might need to update this for version and filepath aswell
export async function dbUpdateUserMcpServer(dbAccess: DBAccess, input: UserMcpServer) {
  return await dbAccess.query(async ({ db }) => {
    const result = await db
      .update(mcpServers)
      .set({
        enabled: input.enabled
      })
      .where(eq(mcpServers.name, input.fileName))
      .returning();

    if (result.length === 0) {
      throw new Error(`[UPDATE]Server with name "${input.fileName}" not found`);
    }

    return result[0];
  });
}

export async function dbAddUserMcpServerToDB(dbAccess: DBAccess, input: UserMcpServer): Promise<UserMcpServer> {
  return await dbAccess.query(async ({ db }) => {
    // Check if server with same name exists
    const existingServer = await db.select().from(mcpServers).where(eq(mcpServers.name, input.serverName)).limit(1);

    if (existingServer.length > 0) {
      throw new Error(`Server with name "${input.serverName}" already exists`);
    }

    // Create new server
    const result = await db
      .insert(mcpServers)
      .values({
        name: input.fileName,
        serverName: input.serverName,
        version: input.version,
        filePath: input.filePath,
        enabled: input.enabled
      })
      .returning();

    const server = result[0];

    if (!server) {
      throw new Error('Failed to create server');
    }

    return {
      fileName: server.name,
      serverName: server.name,
      version: server.version,
      filePath: server.filePath,
      enabled: server.enabled
    };
  });
}

export async function dbDeleteUserMcpServer(dbAccess: DBAccess, serverName: string): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.delete(mcpServers).where(eq(mcpServers.name, serverName)).returning();

    if (result.length === 0) {
      throw new Error(`Server with name "${serverName}" not found`);
    }
  });
}
