import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { experimental_createMCPClient, type ToolSet } from 'ai'; //,
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { promises as fs } from 'fs';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';
import { McpServerConfig } from '~/lib/db/schema';
import { env } from '~/lib/env/server';

export function getMCPSourceDistDir() {
  const baseDir = env.MCP_SOURCE_DIR || 'mcp-source';
  return path.join(process.cwd(), baseDir, 'dist');
}

export function getMCPSourceDir() {
  const baseDir = env.MCP_SOURCE_DIR || 'mcp-source';
  return path.join(process.cwd(), baseDir);
}

async function listMCPTools(): Promise<ToolSet> {
  //gets all the enabled mcp servers tools by checking the enabled status from the db
  try {
    const mcpSourceDistDir = getMCPSourceDistDir();
    const files = await fs.readdir(mcpSourceDistDir);
    const mcpServerFiles = files.filter((file) => file.endsWith('.js'));

    //gets mcp server file and looks at the enabled status of the server
    const mcpServersTools = await Promise.all(
      mcpServerFiles.map(async (file) => {
        const filePath = path.join(mcpSourceDistDir, file);
        const fileName = path.basename(file, '.js');

        //check if the server is enabled in the db
        const getServerFromDb = await actionGetUserMcpServer(fileName);
        if (!getServerFromDb?.enabled) {
          return {};
        }

        //loads the tools from the mcp server file only if the server is enabled
        return await loadToolsFromFile(filePath);
      })
    );

    return mcpServersTools.reduce((acc, tools) => ({ ...acc, ...tools }), {});
  } catch (error) {
    console.error('Error in getToolsFromMCPServer:', error);
    return {};
  }
}

async function getMCPToolForServer(serverFileName: string): Promise<ToolSet> {
  try {
    const mcpSourceDistDir = getMCPSourceDistDir();
    //only gets tools for a certain mcp server if a serverFileName is provided
    //used in mcp-view when getting mcp tools for non-enabled servers that are not in the db
    //later when in mcp-view the tools are allowed to be ran only if the mcp server is enabled
    const filePath = path.join(mcpSourceDistDir, `${serverFileName}.js`);
    return await loadToolsFromFile(filePath);
  } catch (error) {
    console.error('Error in getToolsFromMCPServer:', error);
    return {};
  }
}

function createTransport(config: McpServerConfig) {
  switch (config.type) {
    case 'local':
      return new Experimental_StdioMCPTransport({
        command: 'node',
        args: [config.filePath],
        env: config.env
      });
    case 'sse':
      return {
        type: 'sse',
        url: config.url,
        headers: config.headers
      } as const;
    case 'streamable-http':
      return new StreamableHTTPClientTransport(new URL(config.url), {
        sessionId: undefined
      });
  }
}

async function loadToolsFromFile(filePath: string): Promise<ToolSet> {
  try {
    const serverName = path.basename(filePath, '.js');
    const serverDetails = await actionGetUserMcpServer(serverName);
    if (!serverDetails) {
      console.error(`Server details not found for ${serverName}`);
      return {};
    }

    const client = await experimental_createMCPClient({
      transport: createTransport(serverDetails.config)
    });

    return await client.tools();
  } catch (error) {
    console.error(`Error loading tools for ${filePath}:`, error);
    return {};
  }
}

export const mcpToolset = {
  listMCPTools,
  getMCPToolForServer
};
