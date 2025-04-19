import {
  // MessageParam,
  Tool
} from '@anthropic-ai/sdk/resources/messages/messages.mjs';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// import readline from "readline/promises";
import dotenv from 'dotenv';

dotenv.config();

class MCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.mcp = new Client({ name: 'mcp-client-cli', version: '1.0.0' });
  }

  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith('.js');
      const isPy = serverScriptPath.endsWith('.py');
      if (!isJs && !isPy) {
        console.log('Connecting to server: ', serverScriptPath);
        throw new Error('Server script must be a .js or .py file');
      }
      const command = isPy ? (process.platform === 'win32' ? 'python' : 'python3') : process.execPath;

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath]
      });
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema
        };
      });

      console.log(
        'Connected to server with tools:',
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log('Failed to connect to MCP server: ', e);
      throw e;
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

async function main() {
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2] ?? '');
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

void main();
