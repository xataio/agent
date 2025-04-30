import { notFound } from 'next/navigation';
import { ArtifactKind } from '~/components/chat/artifacts/artifact';
import { deleteDocumentsByIdAfterTimestamp, getDocumentsById, saveDocument } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { requireUserSession } from '~/utils/route';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const dbAccess = await getUserSessionDBAccess();

  const documents = await getDocumentsById(dbAccess, { id });

  const [document] = documents;
  if (!document) notFound();

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const projectId = searchParams.get('projectId');
  if (!projectId) {
    return new Response('Missing projectId', { status: 400 });
  }

  const userId = await requireUserSession();
  const dbAccess = await getUserSessionDBAccess();

  const { content, title, kind }: { content: string; title: string; kind: ArtifactKind } = await request.json();

  const document = await saveDocument(dbAccess, {
    id,
    projectId,
    content,
    title,
    kind,
    userId
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const timestamp = searchParams.get('timestamp');
  if (!timestamp) {
    return new Response('Missing timestamp', { status: 400 });
  }

  const dbAccess = await getUserSessionDBAccess();

  const documents = await getDocumentsById(dbAccess, { id });

  const [document] = documents;
  if (!document) notFound();

  await deleteDocumentsByIdAfterTimestamp(dbAccess, {
    id,
    timestamp: new Date(timestamp)
  });

  return new Response('Deleted', { status: 200 });
}
