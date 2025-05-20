import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAccess } from '~/lib/db/db'; // Assuming dbAccess is available
import { getUserMcpServer, updateUserMcpServer, deleteUserMcpServer } from '~/lib/db/mcp-servers';
import { MCPServerType } from '~/lib/db/schema'; // Import the enum type

// Zod schema for updating an MCP Server (all fields optional)
const mcpServerUpdateSchema = z.object({
  serverName: z.string().min(1).optional(),
  filePath: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  type: z.enum<MCPServerType, ['stdio', 'sse', 'streamable-http']>(['stdio', 'sse', 'streamable-http']).optional(),
  url: z.string().url('Invalid URL format').nullable().optional(),
  enabled: z.boolean().optional(),
  envVars: z.record(z.string()).optional(),
});

export async function GET(_: Request, { params }: { params: { server: string } }) {
  try {
    const serverName = params.server; // This is the 'name' field of the server
    if (!serverName) {
      return NextResponse.json({ error: 'Server name parameter is missing' }, { status: 400 });
    }

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

    const updatePayload = { ...validatedData.data };

    // Logic for type and url:
    // If type is explicitly set to 'stdio', url should be null.
    if (updatePayload.type === 'stdio') {
        updatePayload.url = null;
    } else if ((updatePayload.type === 'sse' || updatePayload.type === 'streamable-http') && 
               (updatePayload.url === undefined || updatePayload.url === null)) {
      // If type is sse/streamable-http, URL is expected.
      // Check if the existing record already has a URL if type is not in payload
      if (updatePayload.type !== undefined) { // type is being explicitly set
        return NextResponse.json({ error: `URL is required when type is '${updatePayload.type}'` }, { status: 400 });
      }
      // If type is not in payload, we might need to fetch the server to check its current type
      // and see if the URL becomes implicitly required.
      // For simplicity now, this check is only if 'type' is in the payload.
    }


    // The updateUserMcpServer function expects an MCPServerInsert-like object,
    // where 'name' is the identifier for the WHERE clause.
    const serverToUpdate = {
      name: serverNameFromParams, // Critical: This is the key for the update operation
      ...updatePayload
    };

    const updatedServer = await updateUserMcpServer(dbAccess, serverToUpdate);
    return NextResponse.json(updatedServer);

  } catch (error) {
    console.error('Error updating MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
     if (errorMessage.includes('not found or no values changed') || errorMessage.includes('not found or update failed')) {
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
