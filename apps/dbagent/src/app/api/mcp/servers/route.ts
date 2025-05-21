import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserSessionDBAccess } from '~/lib/db/db'; // Assuming dbAccess is available like this
import { addUserMcpServerToDB, getUserMcpServers } from '~/lib/db/mcp-servers';
import { mcpServerConfigSchema } from '~/lib/db/schema'; // Import the enum type for Zod

// Zod schema for MCPServerInsert
const mcpServerInsertSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string(),
  config: mcpServerConfigSchema
});

export async function GET() {
  try {
    const dbAccess = await getUserSessionDBAccess();
    const servers = await getUserMcpServers(dbAccess);
    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error fetching MCP servers from database:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch MCP servers from database', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = mcpServerInsertSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid input', details: validatedData.error.flatten() }, { status: 400 });
    }

    const dbAccess = await getUserSessionDBAccess();
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
