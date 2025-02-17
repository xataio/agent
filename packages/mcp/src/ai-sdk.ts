import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { jsonSchema, type Tool } from 'ai';

type ToolSetConfig = {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
  onToolCall?: <Result>(serverName: string, toolName: string, args: any, result: Result) => void;
};

type ToolSet = {
  tools: {
    [key: string]: Tool;
  };
  clients: {
    [key: string]: Client;
  };
};

export async function createToolSet(config: ToolSetConfig): Promise<ToolSet> {
  const toolset: ToolSet = {
    tools: {},
    clients: {}
  };

  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    const transport = new StdioClientTransport({
      ...serverConfig,
      stderr: process.stderr
    });

    const client = new Client(
      {
        name: `${serverName}-client`,
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    toolset.clients[serverName] = client;
    await client.connect(transport);

    const { tools } = await client.listTools();
    for (const tool of tools) {
      const toolName = tool.name === serverName ? tool.name : `${serverName}_${tool.name}`;

      toolset.tools[toolName] = {
        description: tool.description || '',
        parameters: jsonSchema(tool.inputSchema as any),
        execute: async (args) => {
          const result = await client.callTool({
            name: tool.name,
            arguments: args
          });

          config.onToolCall?.(serverName, toolName, args, result);

          return JSON.stringify(result);
        }
      };
    }
  }

  return toolset;
}
