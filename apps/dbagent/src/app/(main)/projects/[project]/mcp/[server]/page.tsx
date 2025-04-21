import { notFound } from 'next/navigation';
import { actionGetUserMcpServer } from '~/components/mcp/action';
import { McpView } from '~/components/mcp/mcp-view';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';

import { promises as fs } from 'fs';
import path from 'path';

type PageParams = {
  project: string;
  server: string;
};

export default async function McpServerPage({ params }: { params: Promise<PageParams> }) {
  const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source');
  const files = await fs.readdir(MCP_SOURCE_DIR);
  const serverFiles = files.filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'));

  const { server: serverId } = await params;

  console.log('LOCAL SERVERS', serverFiles);

  console.log('SERVER ID', serverId);
  // Get the server details
  const dbServer = await actionGetUserMcpServer(serverId);
  if (!dbServer) {
    notFound();
  }

  // Map the database result to UserMcpServer type
  const server: UserMcpServer = {
    fileName: dbServer.name,
    serverName: dbServer.serverName,
    version: dbServer.version,
    filePath: dbServer.filePath,
    enabled: dbServer.enabled
  };

  return (
    <div className="container">
      <McpView server={server} />
    </div>
  );
}
