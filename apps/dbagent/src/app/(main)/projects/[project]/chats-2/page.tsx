import { cookies } from 'next/headers';
import { Chat } from '~/components/chat/chat';
import { DataStreamHandler } from '~/components/chat/data-stream-handler';
import { generateUUID } from '~/components/chat/utils';
import { DEFAULT_CHAT_MODEL } from '~/lib/ai/models';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
