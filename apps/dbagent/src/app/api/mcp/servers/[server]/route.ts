import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source');

export async function GET(request: Request, { params }: { params: { server: string } }) {
  try {
    const { server } = params;
    const filePath = path.join(MCP_SOURCE_DIR, `${server}.ts`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json({ error: 'Server file not found' }, { status: 404 });
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract metadata from file content
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
    const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);

    const metadata = {
      fileName: server,
      serverName: nameMatch ? nameMatch[1] : server,
      version: versionMatch ? versionMatch[1] : '1.0.0',
      description: descriptionMatch ? descriptionMatch[1] : '',
      filePath: `${server}.ts`,
      enabled: false
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error reading server file:', error);
    return NextResponse.json({ error: 'Failed to read server file' }, { status: 500 });
  }
}
