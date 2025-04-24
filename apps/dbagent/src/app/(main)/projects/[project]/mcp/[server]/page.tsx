import { promises as fs } from 'fs';
import { notFound } from 'next/navigation';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';
import { McpView } from '~/components/mcp/mcp-view';
import { UserMcpServer } from '~/lib/tools/user-mcp-servers';

type PageParams = {
  project: string;
  server: string;
};

export default async function McpServerPage({ params }: { params: Promise<PageParams> }) {
  const { server: serverId } = await params;
  const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source');

  // Check if server file exists locally
  const filePath = path.join(MCP_SOURCE_DIR, `${serverId}.ts`);
  let server: UserMcpServer | null = null;

  try {
    // Try to read the local file first
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract metadata from file content
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);

    server = {
      fileName: serverId,
      serverName: nameMatch?.[1] ?? serverId,
      version: versionMatch?.[1] ?? '1.0.0',
      filePath: `${serverId}.ts`,
      enabled: false
    };

    // Try to get additional data from database if it exists
    try {
      const dbServer = await actionGetUserMcpServer(serverId);
      if (dbServer && server) {
        server.enabled = dbServer.enabled;
      }
    } catch (error) {
      // Ignore database errors, we'll use the local file data
      console.error('Error fetching server from database:', error);
    }
  } catch (error) {
    // If local file doesn't exist, try database
    try {
      const dbServer = await actionGetUserMcpServer(serverId);
      if (dbServer) {
        server = {
          fileName: dbServer.name,
          serverName: dbServer.serverName,
          version: dbServer.version,
          filePath: dbServer.filePath,
          enabled: dbServer.enabled
        };
      }
    } catch (error) {
      console.error('Error fetching server from database:', error);
    }
  }

  if (!server) {
    notFound();
  }

  return (
    <div className="container">
      <McpView server={server} />
    </div>
  );
}
