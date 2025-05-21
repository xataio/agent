import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { getMCPServersDir } from '~/lib/ai/tools/user-mcp';
import { MCPServerInsert } from '~/lib/db/schema';

const mcpServersDir = getMCPServersDir();

export async function findServerOnDisk(server: string): Promise<MCPServerInsert | null> {
  // Ensure server name is safe and only contains alphanumeric characters, dots, and hyphens
  const sanitizedServer = server.replace(/[^a-zA-Z0-9.-]/g, '');
  const filePath = path.join(mcpServersDir, `${sanitizedServer}.js`);
  if (!filePath.startsWith(mcpServersDir) || filePath.includes('..')) {
    return null;
  }

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch (error) {
    return null;
  }

  const metadata = {
    name: sanitizedServer,
    serverName: sanitizedServer,
    filePath: `${sanitizedServer}.js`,
    enabled: false,
    version: '0.0.0' // not used
  };
  return metadata;
}

export async function GET(_: Request, { params }: { params: Promise<{ server: string }> }) {
  try {
    const { server } = await params;
    const metadata = await findServerOnDisk(server);
    if (!metadata) {
      return NextResponse.json({ error: 'Server file not found' }, { status: 404 });
    }
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error reading server file:', error);
    return NextResponse.json({ error: 'Failed to read server file' }, { status: 500 });
  }
}
