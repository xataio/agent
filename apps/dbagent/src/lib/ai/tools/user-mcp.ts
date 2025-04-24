import { experimental_createMCPClient } from 'ai'; //,
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { promises as fs } from 'fs';
import path from 'path';
import { actionGetUserMcpServer } from '~/components/mcp/action';

async function getToolsFromMCPServer(userId?: string, serverFileName?: string, skipDbCheck: boolean = false) {
  try {
    const MCP_SOURCE_DIR = path.join(process.cwd(), 'mcp-source', 'dist');
    const files = await fs.readdir(MCP_SOURCE_DIR);
    const mcpServerFiles = files.filter((file) => file.endsWith('.js'));

    // If we have a specific server file, only process that one
    if (serverFileName) {
      const filePath = path.join(MCP_SOURCE_DIR, `${serverFileName}.js`);
      try {
        if (!skipDbCheck) {
          const getServerFromDb = await actionGetUserMcpServer(serverFileName, userId);
          if (!getServerFromDb?.enabled) {
            return {};
          }
        }

        const transport = new Experimental_StdioMCPTransport({
          command: 'node',
          args: [filePath]
        });

        const client = await experimental_createMCPClient({
          transport
        });

        const toolSet = await client.tools();
        console.log('Loaded tools for', serverFileName, toolSet);
        return toolSet;
      } catch (error) {
        console.error(`Error loading tools for ${serverFileName}:`, error);
        return {};
      }
    }

    // Otherwise, process all files in parallel
    const mcpServersTools = await Promise.all(
      mcpServerFiles.map(async (file) => {
        try {
          const filePath = path.join(MCP_SOURCE_DIR, file);
          const fileName = path.basename(file, '.js');

          if (!skipDbCheck) {
            const getServerFromDb = await actionGetUserMcpServer(fileName, userId);
            if (!getServerFromDb?.enabled) {
              return null;
            }
          }

          const transport = new Experimental_StdioMCPTransport({
            command: 'node',
            args: [filePath]
          });

          const client = await experimental_createMCPClient({
            transport
          });

          const toolSet = await client.tools();
          console.log('Loaded tools for', fileName, toolSet);
          return toolSet;
        } catch (error) {
          console.error(`Error loading`, error);
          return null;
        }
      })
    );

    return mcpServersTools
      .filter(Boolean)
      .map((tools) => tools || {})
      .reduce((acc, tools) => ({ ...acc, ...tools }), {});
  } catch (error) {
    console.error('Error in getToolsFromMCPServer:', error);
    return {};
  }
}

export const userMCPToolset = {
  getTools: async (userId?: string, serverFileName?: string, skipDbCheck: boolean = false) => {
    const tools = await getToolsFromMCPServer(userId, serverFileName, skipDbCheck);
    return tools;
  }
};
