import { DBAccess } from '~/lib/db/db';
import { dbGetUserMcpServer, dbGetUserMcpServers } from '~/lib/db/user-mcp-servers';

//file name is the name of the file in the mcp-source folder without the .ts extension
//filepath is just the name of the file in the mcp-source folder
export interface UserMcpServer {
  fileName: string;
  serverName: string;
  version: string;
  filePath: string;
  enabled: boolean;
}

export async function getUserMcpServers(dbAccess: DBAccess): Promise<UserMcpServer[]> {
  const servers = await dbGetUserMcpServers(dbAccess);
  return servers.map((server) => ({
    fileName: server.name,
    serverName: server.serverName,
    version: server.version,
    filePath: server.filePath,
    enabled: server.enabled
  }));
}

export async function getUserMcpServer(dbAccess: DBAccess, serverName: string): Promise<UserMcpServer> {
  const server = await dbGetUserMcpServer(dbAccess, serverName);
  if (!server) {
    throw new Error(`Server with name "${serverName}" not found`);
  }
  return {
    fileName: server.name,
    serverName: server.serverName,
    version: server.version,
    filePath: server.filePath,
    enabled: server.enabled
  };
}
