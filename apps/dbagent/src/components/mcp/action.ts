'use server';

import { getUserDBAccess } from '~/lib/db/db';
import { addUserMcpServerToDB, dbGetUserMcpServer, dbUpdateUserMcpServer } from '~/lib/db/user-mcp-servers';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';

//playbook db insert
export async function actionAddUserMcpServerToDB(input: UserMcpServer, asUserId?: string): Promise<UserMcpServer> {
  console.log('adding user mcp server {userMcpServer: ', input, '}');
  const dbAccess = await getUserDBAccess(asUserId);
  return await addUserMcpServerToDB(dbAccess, input);
}

export async function actionCheckUserMcpServerExists(serverName: string, asUserId?: string): Promise<boolean> {
  console.log(`checking if mcp server exists {serverName: ${serverName}}`);
  const dbAccess = await getUserDBAccess(asUserId);
  const result = await dbGetUserMcpServer(dbAccess, serverName);
  console.log('RESULT', result, dbAccess);
  if (result) {
    return true;
  } else {
    return false;
  }
}

export async function actionUpdateUserMcpServer(input: UserMcpServer, asUserId?: string) {
  console.log('updating user mcp server {userMcpServer: ', input, '}');
  const dbAccess = await getUserDBAccess(asUserId);
  return await dbUpdateUserMcpServer(dbAccess, input);
}

export async function actionGetUserMcpServer(serverName: string, asUserId?: string) {
  console.log(`getting user mcp server {serverName: ${serverName}}`);
  const dbAccess = await getUserDBAccess(asUserId);
  return await dbGetUserMcpServer(dbAccess, serverName);
}
