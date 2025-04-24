import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.ts')) {
      return NextResponse.json({ message: 'Only TypeScript (.ts) files are allowed' }, { status: 400 });
    }

    // Ensure the mcp-source directory exists
    const mcpSourceDir = path.join(process.cwd(), 'mcp-source');
    try {
      await fs.access(mcpSourceDir);
    } catch {
      throw new Error(
        'MCP source directory does not exist. Please ensure the mcp-source directory is present in the project root.'
      );
    }

    // Read the file content
    const fileContent = await file.text();

    // Write the file to mcp-source directory
    const filePath = path.join(mcpSourceDir, file.name);
    await fs.writeFile(filePath, fileContent);

    // Run the build command
    try {
      await execAsync('pnpm build:mcp-servers');
    } catch (buildError) {
      console.error('Error building MCP servers:', buildError);
      return NextResponse.json({ message: 'File uploaded but build failed' }, { status: 500 });
    }

    return NextResponse.json({ message: 'File uploaded and built successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
  }
}
