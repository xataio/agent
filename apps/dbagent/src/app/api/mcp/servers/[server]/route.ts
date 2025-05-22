import { NextResponse } from 'next/server';
import { findServerOnDisk } from '~/lib/db/mcp-servers';

export async function GET(_: Request, { params }: { params: Promise<{ server: string }> }) {
  try {
    const { server } = await params;
    const metadata = await findServerOnDisk(server);
    if (!metadata) {
      return NextResponse.json({ error: 'Server file not found' }, { status: 404 });
    }
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error reading server file:', error);
    return NextResponse.json({ error: 'Failed to read server file' }, { status: 500 });
  }
}
