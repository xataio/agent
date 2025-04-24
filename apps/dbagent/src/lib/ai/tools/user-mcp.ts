import { experimental_createMCPClient } from 'ai'; //,
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { promises as fs } from 'fs';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';

async function getToolsFromMCPServer(userId?: string, serverFileName?: string) {
  try {
    const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source', 'dist');
    const files = await fs.readdir(MCP_SOURCE_DIR);
    const mcpServerFiles = files.filter((file) => file.endsWith('.js'));

    const mcpServersTools = await Promise.all(
      mcpServerFiles.map(async (file) => {
        const filePath = path.join(MCP_SOURCE_DIR, file);
        const fileName = path.basename(file, '.js');

        //check if the server is enabled in the db
        const getServerFromDb = await actionGetUserMcpServer(fileName, userId);
        if (getServerFromDb?.enabled) {
          return await loadToolsFromFile(filePath);
        } else {
          //gets servers from disk
          if (serverFileName) {
            const filePath = path.join(MCP_SOURCE_DIR, `${serverFileName}.js`);
            return await loadToolsFromFile(filePath);
          }
        }
      })
    );

    return mcpServersTools.reduce((acc, tools) => ({ ...acc, ...tools }), {});
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
  getTools: async (userId?: string, serverFileName?: string) => {
    const tools = await getToolsFromMCPServer(userId, serverFileName);
    return tools;
  }
};
