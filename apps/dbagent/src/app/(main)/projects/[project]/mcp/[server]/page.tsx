import { promises as fs } from 'fs';
import { notFound } from 'next/navigation';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';
import { McpView } from '~/components/mcp/mcp-view';
import { getMCPSourceDir } from '~/lib/ai/tools/user-mcp';
import { MCPServerInsert } from '~/lib/db/schema';

type PageParams = {
  project: string;
  server: string;
};

export default async function McpServerPage({ params }: { params: Promise<PageParams> }) {
  const { server: serverId } = await params;
  const mcpSourceDir = getMCPSourceDir();

  // Check if server file exists locally
  const filePath = path.join(mcpSourceDir, `${serverId}.ts`);
  let server: MCPServerInsert | null = null;

  try {
    // Try to read the local file first
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract metadata from file content
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);

    server = {
      name: nameMatch?.[1] ?? serverId,
      version: versionMatch?.[1] ?? '1.0.0',
      enabled: false,
      config: {
        type: 'local',
        filePath
      }
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
          name: dbServer.name,
          version: dbServer.version,
          enabled: dbServer.enabled,
          config: {
            type: 'local',
            filePath
          }
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
