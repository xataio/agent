import { notFound } from 'next/dist/client/components/not-found';
import { getChatById, getVotesByChatId, voteMessage } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { requireUserSession } from '~/utils/route';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  if (!chatId) {
    return new Response('chatId is required', { status: 400 });
  }

  const dbAccess = await getUserSessionDBAccess();
  const chat = await getChatById(dbAccess, { id: chatId });
  if (!chat) notFound();

  const votes = await getVotesByChatId(dbAccess, { id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const { chatId, messageId, type }: { chatId: string; messageId: string; type: 'up' | 'down' } = await request.json();

  if (!chatId || !messageId || !type) {
    return new Response('messageId and type are required', { status: 400 });
  }

  const userId = await requireUserSession();
  const dbAccess = await getUserSessionDBAccess();

  const chat = await getChatById(dbAccess, { id: chatId });
  if (!chat) {
    return new Response('Chat not found', { status: 404 });
  }

  await voteMessage(dbAccess, {
    projectId: chat.projectId,
    userId,
    chatId,
    messageId,
    type: type
  });

  return new Response('Message voted', { status: 200 });
}
