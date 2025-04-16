import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';

const TEST_TIMEOUT = 5000; // 5 seconds timeout

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Await the params object
    const { id: serverId } = await Promise.resolve(params);
    const basePath = path.join(process.cwd(), 'mcp-source', 'dist');
    const serverPath = path.join(basePath, `${serverId}.js`);
    const clientPath = path.join(process.cwd(), 'src', 'components', 'mcp', 'index.js');

    // Run the MCP server with client and server paths
    const command = `node ${clientPath} ${serverPath}`;

    const { output, error, exitCode } = await new Promise<{ output: string; error: string; exitCode: number }>(
      (resolve) => {
        let output = '';
        let error = '';

        const process = exec(command, { cwd: basePath }, (err, stdout, stderr) => {
          if (err) {
            error += err.message;
          }
          output = stdout;
          error += stderr;
        });

        const timeout = setTimeout(() => {
          process.kill();
          error += '\nTest timed out after 5 seconds';
        }, TEST_TIMEOUT);

        process.on('close', (code) => {
          clearTimeout(timeout);
          resolve({
            output,
            error: error || 'No error output',
            exitCode: code ?? 0
          });
        });
      }
    );

    return NextResponse.json({
      success: exitCode === 0 && !error.includes('timed out'),
      output,
      error,
      exitCode
    });
  } catch (error) {
    console.error('Error test running MCP server:', error);
    return NextResponse.json(
      {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to test run MCP server',
        exitCode: 1
      },
      { status: 500 }
    );
  }
}
