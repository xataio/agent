'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { getUserDBAccess } from '~/lib/db/db';
import {
  dbAddUserMcpServerToDB,
  dbDeleteUserMcpServer,
  dbGetUserMcpServer,
  dbUpdateUserMcpServer
} from '~/lib/db/user-mcp-servers';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';

//playbook db insert
export async function actionAddUserMcpServerToDB(input: UserMcpServer, asUserId?: string): Promise<UserMcpServer> {
  // console.log('adding user mcp server {userMcpServer: ', input, '}');
  const dbAccess = await getUserDBAccess(asUserId);
  return await dbAddUserMcpServerToDB(dbAccess, input);
}

export async function actionCheckUserMcpServerExists(serverName: string, asUserId?: string): Promise<boolean> {
  // console.log(`checking if mcp server exists {serverName: ${serverName}}`);
  const dbAccess = await getUserDBAccess(asUserId);
  const result = await dbGetUserMcpServer(dbAccess, serverName);
  // console.log('RESULT', result, dbAccess);
  if (result) {
    return true;
  } else {
    return false;
  }
}

export async function actionUpdateUserMcpServer(input: UserMcpServer, asUserId?: string) {
  // console.log('updating user mcp server {userMcpServer: ', input, '}');
  const dbAccess = await getUserDBAccess(asUserId);
  return await dbUpdateUserMcpServer(dbAccess, input);
}

export async function actionGetUserMcpServer(serverName: string, asUserId?: string) {
  // console.log(`getting user mcp server {serverName: ${serverName}}`);
  const dbAccess = await getUserDBAccess(asUserId);
  return await dbGetUserMcpServer(dbAccess, serverName);
}

export async function actionDeleteUserMcpServer(serverName: string, asUserId?: string): Promise<void> {
  const dbAccess = await getUserDBAccess(asUserId);

  // Get the server details before deleting from DB
  const server = await dbGetUserMcpServer(dbAccess, serverName);
  if (!server) {
    throw new Error(`Server with name "${serverName}" not found`);
  }

  // Delete from DB first
  await dbDeleteUserMcpServer(dbAccess, serverName);

  // Delete the files
  const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source');
  const MCP_SOURCE_DIST_DIR = path.join(process.cwd(), 'mcp-source', 'dist');

  try {
    // Delete .ts file
    const tsFilePath = path.join(MCP_SOURCE_DIR, `${server.filePath}`);
    await fs.unlink(tsFilePath);

    // Delete .js file if it exists
    const jsFilePath = path.join(MCP_SOURCE_DIST_DIR, `${server.filePath.replace('.ts', '.js')}`);
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
