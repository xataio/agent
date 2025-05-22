'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { addUserMcpServerToDB, getUserMcpServer, updateUserMcpServer } from '~/lib/db/mcp-servers';
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
  if (!input.filePath) {
    input.filePath = `${input.name}.js`;
  }
  const dbAccess = await getUserSessionDBAccess();
  return await updateUserMcpServer(dbAccess, input);
}

export async function actionGetUserMcpServer(serverName: string) {
  const dbAccess = await getUserSessionDBAccess();
  return await getUserMcpServer(dbAccess, serverName);
}
