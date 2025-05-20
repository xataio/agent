import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addUserMcpServerToDB, getUserMcpServers } from '~/lib/db/mcp-servers';
import { dbAccess } from '~/lib/db/db'; // Assuming dbAccess is available like this
import { MCPServerType } from '~/lib/db/schema'; // Import the enum type for Zod

// Zod schema for MCPServerInsert
const mcpServerInsertSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  serverName: z.string().min(1, 'Server name is required'),
  filePath: z.string().min(1, 'File path is required'),
  version: z.string().min(1, 'Version is required'),
  type: z.enum<MCPServerType, ['stdio', 'sse', 'streamable-http']>(['stdio', 'sse', 'streamable-http']),
  url: z.string().url('Invalid URL format').nullable().optional(),
  enabled: z.boolean().optional(),
  envVars: z.record(z.string()).optional(),
});

export async function GET() {
  try {
    // Fetch servers from the database
    const servers = await getUserMcpServers(dbAccess);
    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error fetching MCP servers from database:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch MCP servers from database', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = mcpServerInsertSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid input', details: validatedData.error.flatten() }, { status: 400 });
    }

    // Logic for type and url:
    // If type is 'stdio', url should ideally be null.
    if (validatedData.data.type === 'stdio' && validatedData.data.url) {
        // Optionally, force URL to null for stdio, or return a specific error
        // For now, let's allow it but it might be refined based on strictness requirements
        // validatedData.data.url = null; 
    } else if ((validatedData.data.type === 'sse' || validatedData.data.type === 'streamable-http') && !validatedData.data.url) {
      return NextResponse.json({ error: `URL is required for type '${validatedData.data.type}'` }, { status: 400 });
    }
    
    const newServer = await addUserMcpServerToDB(dbAccess, validatedData.data);
    return NextResponse.json(newServer, { status: 201 });

  } catch (error) {
    console.error('Error creating MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Check for specific error messages from addUserMcpServerToDB (e.g., unique constraints)
    if (errorMessage.includes('already exists')) {
        return NextResponse.json({ error: errorMessage }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: 'Failed to create MCP server', details: errorMessage }, { status: 500 });
  }
}
