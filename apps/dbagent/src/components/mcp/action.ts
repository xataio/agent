'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { getMCPSourceDir, getMCPSourceDistDir } from '~/lib/ai/tools/user-mcp';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { addUserMcpServerToDB, deleteUserMcpServer, getUserMcpServer, updateUserMcpServer } from '~/lib/db/mcp-servers';
import { MCPServer, MCPServerInsert } from '~/lib/db/schema';

//playbook db insert
export async function actionAddUserMcpServerToDB(input: MCPServer): Promise<MCPServer> {
  const dbAccess = await getUserSessionDBAccess();
  return await addUserMcpServerToDB(dbAccess, input);
}

export async function actionCheckUserMcpServerExists(serverName: string): Promise<boolean> {
  const dbAccess = await getUserSessionDBAccess();
  const result = await getUserMcpServer(dbAccess, serverName);
  if (result) {
    return true;
  } else {
    return false;
  }
}

export async function actionUpdateUserMcpServer(input: MCPServerInsert) {
  const dbAccess = await getUserSessionDBAccess();
  return await updateUserMcpServer(dbAccess, input);
}

export async function actionGetUserMcpServer(serverName: string) {
  const dbAccess = await getUserSessionDBAccess();
  return await getUserMcpServer(dbAccess, serverName);
}

export async function actionDeleteUserMcpServerFromDBAndFiles(serverName: string): Promise<void> {
  const dbAccess = await getUserSessionDBAccess();

  // Get the server details before deleting from DB
  const server = await getUserMcpServer(dbAccess, serverName);
  if (server) {
    await deleteUserMcpServer(dbAccess, serverName);
  }

  // Delete the files
  const mcpSourceDir = getMCPSourceDir();
  const mcpSourceDistDir = getMCPSourceDistDir();

  try {
    // Delete .ts file
    const tsFilePath = path.join(mcpSourceDir, `${serverName}.ts`);
    await fs.unlink(tsFilePath);

    // Delete .js file if it exists
    const jsFilePath = path.join(mcpSourceDistDir, `${serverName}.js`);
    try {
      await fs.unlink(jsFilePath);
    } catch (error) {
      // Ignore error if .js file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting server files:', error);
    // Don't throw the error since the DB deletion was successful
  }
}
