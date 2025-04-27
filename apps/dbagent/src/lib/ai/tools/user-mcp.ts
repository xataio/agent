import { experimental_createMCPClient } from 'ai'; //,
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { promises as fs } from 'fs';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';
import { env } from '~/lib/env/server';

export function getMCPSourceDistDir() {
  const baseDir = env.MCP_SOURCE_DIR || 'mcp-source';
  return path.join(process.cwd(), baseDir, 'dist');
}

export function getMCPSourceDir() {
  const baseDir = env.MCP_SOURCE_DIR || 'mcp-source';
  return path.join(process.cwd(), baseDir);
}

async function getToolsFromAllEnabledMCPServers(userId?: string) {
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
        const getServerFromDb = await actionGetUserMcpServer(fileName, userId);
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

async function getToolsFromMCPServer(serverFileName?: string) {
  try {
    const mcpSourceDistDir = getMCPSourceDistDir();
    //only gets tools for a certain mcp server if a serverFileName is provided
    //used in mcp-view when getting mcp tools for non-enabled servers that are not in the db
    //later when in mcp-view the tools are allowed to be ran only if the mcp server is enabled
    if (serverFileName) {
      const filePath = path.join(mcpSourceDistDir, `${serverFileName}.js`);
      return await loadToolsFromFile(filePath);
    }
    return {};
  } catch (error) {
    console.error('Error in getToolsFromMCPServer:', error);
    return {};
  }
}

async function loadToolsFromFile(filePath: string) {
  try {
    const transport = new Experimental_StdioMCPTransport({
      command: 'node',
      args: [filePath]
    });

    const client = await experimental_createMCPClient({
      transport
    });

    const toolSet = await client.tools();
    console.log('Loaded tools for', path.basename(filePath, '.js'), toolSet);
    return toolSet || {};
  } catch (error) {
    console.error(`Error loading tools for ${filePath}:`, error);
    return {};
  }
}

export const userMCPToolset = {
  getTools: async (userId?: string) => {
    const tools = await getToolsFromAllEnabledMCPServers(userId);
    return tools;
  },
  getToolsFromMCPServer: async (serverFileName?: string) => {
    const tools = await getToolsFromMCPServer(serverFileName);
    return tools;
  }
};
