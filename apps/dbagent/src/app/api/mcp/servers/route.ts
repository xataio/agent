import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source');

export async function GET() {
  try {
    const files = await fs.readdir(MCP_SOURCE_DIR);
    const serverFiles = files.filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'));

    const servers = await Promise.all(
      serverFiles.map(async (file) => {
        const filePath = path.join(MCP_SOURCE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Extract server name and version from the file content
        const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
        const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);

        return {
          fileName: path.basename(file, '.ts'),
          serverName: nameMatch ? nameMatch[1] : path.basename(file, '.ts'),
          version: versionMatch ? versionMatch[1] : '1.0.0',
          filePath: file,
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
