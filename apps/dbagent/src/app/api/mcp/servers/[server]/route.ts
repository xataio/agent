import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { deleteUserMcpServer, getUserMcpServer, updateUserMcpServer } from '~/lib/db/mcp-servers';
import { mcpServerConfigSchema } from '~/lib/db/schema';

// Zod schema for updating an MCP Server (all fields optional)
const mcpServerUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().optional(),
  config: mcpServerConfigSchema.optional(),
  enabled: z.boolean().optional()
});

export async function GET(_: Request, { params }: { params: { server: string } }) {
  try {
    const serverName = params.server; // This is the 'name' field of the server
    if (!serverName) {
      return NextResponse.json({ error: 'Server name parameter is missing' }, { status: 400 });
    }

    const dbAccess = await getUserSessionDBAccess();
    const server = await getUserMcpServer(dbAccess, serverName);

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }
    return NextResponse.json(server);
  } catch (error) {
    console.error('Error fetching MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch MCP server', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { server: string } }) {
  try {
    const serverNameFromParams = params.server; // This is the 'name' field to identify the server
    if (!serverNameFromParams) {
      return NextResponse.json({ error: 'Server name parameter is missing' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = mcpServerUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid input', details: validatedData.error.flatten() }, { status: 400 });
    }

    const dbAccess = await getUserSessionDBAccess();
    const updatedServer = await updateUserMcpServer(dbAccess, {
      ...validatedData.data,
      name: serverNameFromParams
    });
    return NextResponse.json(updatedServer);
  } catch (error) {
    console.error('Error updating MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (
      errorMessage.includes('not found or no values changed') ||
      errorMessage.includes('not found or update failed')
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes('already exists')) {
      return NextResponse.json({ error: errorMessage }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: 'Failed to update MCP server', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { server: string } }) {
  try {
    const serverName = params.server; // This is the 'name' field of the server
    if (!serverName) {
      return NextResponse.json({ error: 'Server name parameter is missing' }, { status: 400 });
    }

    const dbAccess = await getUserSessionDBAccess();
    await deleteUserMcpServer(dbAccess, serverName);
    return NextResponse.json({ message: `Server "${serverName}" deleted successfully` }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete MCP server', details: errorMessage }, { status: 500 });
  }
}
