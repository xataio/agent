import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
const server = new McpServer(
  {
    name: 'multiple-math-operations-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
server.tool('mult', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: 'text', text: String(a * b) }]
}));
server.tool('div', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: 'text', text: String(a / b) }]
}));
server.tool('mod', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: 'text', text: String(a % b) }]
}));
// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
