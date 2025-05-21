import { experimental_createMCPClient, type ToolSet } from 'ai'; //,
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { promises as fs } from 'fs';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';
import { env } from '~/lib/env/server';

export function getMCPServersDir() {
  const baseDir = env.MCP_SERVERS_DIR || 'mcp-source/dist';
  return path.join(process.cwd(), baseDir);
}

async function listMCPTools(): Promise<ToolSet> {
  //gets all the enabled mcp servers tools by checking the enabled status from the db
  try {
    const mcpSourceDistDir = getMCPServersDir();
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
    const mcpSourceDistDir = getMCPServersDir();
    // only gets tools for a certain mcp server if a serverFileName is provided
    // used in mcp-view when getting mcp tools for non-enabled servers that are not in the db
    // later when in mcp-view the tools are allowed to be ran only if the mcp server is enabled
    const filePath = path.join(mcpSourceDistDir, `${serverFileName}.js`);
    return await loadToolsFromFile(filePath);
  } catch (error) {
    console.error('Error in getToolsFromMCPServer:', error);
    return {};
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

    const transport = new Experimental_StdioMCPTransport({
      command: 'node',
      args: [filePath],
      env: serverDetails?.envVars
    });

    const client = await experimental_createMCPClient({
      transport
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
