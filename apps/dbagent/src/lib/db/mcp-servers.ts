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

//might need to update this for version and filepath aswell
export async function updateUserMcpServer(dbAccess: DBAccess, input: MCPServerInsert) {
  return await dbAccess.query(async ({ db }) => {
    const updateData: Partial<MCPServerInsert> = {};
    // Check and add fields to updateData if they are provided in input
    if (input.enabled !== undefined) {
      updateData.enabled = input.enabled;
    }
    if (input.envVars !== undefined) {
      updateData.envVars = input.envVars;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    // Explicitly check for undefined to allow setting url to null
    if (input.url !== undefined) {
      updateData.url = input.url;
    }
    if (input.version !== undefined) {
      updateData.version = input.version;
    }
    if (input.filePath !== undefined) {
      updateData.filePath = input.filePath;
    }
    // serverName can also be updated
    if (input.serverName !== undefined) {
      updateData.serverName = input.serverName;
    }

    // Ensure input.name is present, as it's used in the WHERE clause
    if (!input.name) {
      throw new Error('Server name (input.name) is required for update.');
    }

    // If no updatable fields were provided, fetch and return the existing server
    if (Object.keys(updateData).length === 0) {
      const currentServer = await db.select().from(mcpServers).where(eq(mcpServers.name, input.name)).limit(1);
      if (currentServer.length === 0) {
        throw new Error(`[UPDATE]Server with name "${input.name}" not found.`);
      }
      return currentServer[0];
    }
    
    // Note: If input.serverName is being updated, and it's unique,
    // this could fail if another record already has the new serverName.
    // The DB unique constraint will handle this.
    const result = await db
      .update(mcpServers)
      .set(updateData)
      .where(eq(mcpServers.name, input.name)) 
      .returning();

    if (result.length === 0) {
      // This might happen if the server name in input.name doesn't exist
      // or if the unique constraint on serverName failed during an update of serverName.
      throw new Error(`[UPDATE]Server with name "${input.name}" not found, or update failed due to constraints (e.g., serverName already exists).`);
    }

    return result[0];
  });
}

export async function addUserMcpServerToDB(dbAccess: DBAccess, input: MCPServerInsert): Promise<MCPServer> {
  return await dbAccess.query(async ({ db }) => {
    // Validate required fields from MCPServerInsert
    if (!input.name || !input.serverName || !input.filePath || !input.version) {
      throw new Error('Required fields (name, serverName, filePath, version) are missing from input.');
    }

    // Check if server with same name or serverName exists
    const existingServerByName = await db.select().from(mcpServers).where(eq(mcpServers.name, input.name)).limit(1);
    if (existingServerByName.length > 0) {
      throw new Error(`Server with name "${input.name}" already exists`);
    }

    // serverName is required by the check above, so no need for "if (input.serverName)"
    const existingServerByServerName = await db.select().from(mcpServers).where(eq(mcpServers.serverName, input.serverName)).limit(1);
    if (existingServerByServerName.length > 0) {
      throw new Error(`Server with serverName "${input.serverName}" already exists`);
    }

    // Create new server
    // All fields in MCPServerInsert should be passed.
    // Drizzle handles undefined for optional fields (inserts NULL or uses default)
    const result = await db
      .insert(mcpServers)
      .values({
        name: input.name, // required
        serverName: input.serverName, // required
        filePath: input.filePath, // required
        version: input.version, // required
        enabled: input.enabled, // has default
        envVars: input.envVars, // has default
        type: input.type, // has default
        url: input.url // optional (nullable)
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
