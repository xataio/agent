import { auth } from '~/auth';
import { ArtifactKind } from '~/components/chat/artifact';
import { deleteDocumentsByIdAfterTimestamp, getDocumentsById, saveDocument } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const dbAccess = await getUserSessionDBAccess();

  const documents = await getDocumentsById(dbAccess, { id });

  const [document] = documents;

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

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

  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const dbAccess = await getUserSessionDBAccess();

  const { content, title, kind }: { content: string; title: string; kind: ArtifactKind } = await request.json();

  if (session.user?.id) {
    const document = await saveDocument(dbAccess, {
      id,
      projectId,
      content,
      title,
      kind,
      userId: session.user.id
    });

    return Response.json(document, { status: 200 });
  }

  return new Response('Unauthorized', { status: 401 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const dbAccess = await getUserSessionDBAccess();

  const documents = await getDocumentsById(dbAccess, { id });

  const [document] = documents;

  if (document?.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp(dbAccess, {
    id,
    timestamp: new Date(timestamp)
  });

  return new Response('Deleted', { status: 200 });
}
