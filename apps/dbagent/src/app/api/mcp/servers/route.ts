import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { getMCPServersDir } from '~/lib/ai/tools/user-mcp';

const mcpServersDir = getMCPServersDir();

export async function GET() {
  try {
    const files = await fs.readdir(mcpServersDir);
    const serverFiles = files.filter((file) => file.endsWith('.js'));

    const servers = await Promise.all(
      serverFiles.map(async (file) => {
        return {
          name: file.endsWith('.js') ? file.slice(0, -3) : file,
          serverName: file,
          enabled: false
        };
      })
    );

    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error reading MCP servers:', error);
    return NextResponse.json({ error: 'Failed to read MCP servers' }, { status: 500 });
  }
}
