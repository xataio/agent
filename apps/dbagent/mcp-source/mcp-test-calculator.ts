import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer(
  {
    name: 'example-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: 'text', text: String(a + b) }]
}));

// Add a dynamic greeting resource
server.resource('greeting', new ResourceTemplate('greeting://{name}', { list: undefined }), async (uri, { name }) => ({
  contents: [
    {
      uri: uri.href,
      text: `Hello, ${name}!`
    }
  ]
}));

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
