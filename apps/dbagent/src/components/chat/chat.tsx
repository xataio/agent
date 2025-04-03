'use client';

import { useChat } from '@ai-sdk/react';
import { toast } from '@internal/components';
import type { Attachment, UIMessage } from 'ai';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Connection, Vote } from '~/lib/db/schema';
import { Artifact } from './artifact';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { SuggestedAction } from './suggested-actions';
import { useArtifactSelector } from './use-artifact';
import { fetcher, generateUUID } from './utils';

export function Chat({
  id,
  connections,
  initialMessages,
  suggestedActions,
  selectedChatModel,
  isReadonly
}: {
  id: string;
  connections: Connection[];
  initialMessages: Array<UIMessage>;
  suggestedActions?: SuggestedAction[];
  selectedChatModel: string;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  const defaultConnection = connections.find((c) => c.isDefault);
  const [connectionId, setConnectionId] = useState<string>(defaultConnection?.id || '');

  const { messages, setMessages, handleSubmit, input, setInput, append, status, stop, reload } = useChat({
    id,
    body: { id, connectionId, model: 'openai-gpt-4o' },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: () => {
      toast.error('An error occured, please try again!');
    }
  });

  const { data: votes } = useSWR<Array<Vote>>(messages.length >= 2 ? `/api/vote?chatId=${id}` : null, fetcher);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="bg-background flex h-full min-w-0 flex-col">
        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
          {!isReadonly && (
            <MultimodalInput
              suggestedActions={suggestedActions}
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
