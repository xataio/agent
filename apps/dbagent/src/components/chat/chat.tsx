'use client';

import { useChat } from '@ai-sdk/react';
import { toast } from '@internal/components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { useState } from 'react';
import { Connection, Vote } from '~/lib/db/schema';
import { Artifact } from './artifact';
import { ChatHeader } from './chat-header';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { SuggestedAction } from './suggested-actions';
import { useArtifactSelector } from './use-artifact';
import { fetcher, generateUUID } from './utils';

export function Chat({
  id,
  projectId,
  defaultLanguageModel,
  connections,
  initialMessages,
  suggestedActions
}: {
  id: string;
  projectId: string;
  defaultLanguageModel: string;
  connections: Connection[];
  initialMessages: Array<UIMessage>;
  suggestedActions?: SuggestedAction[];
}) {
  const queryClient = useQueryClient();
  const defaultConnection = connections.find((c) => c.isDefault);
  const [connectionId, setConnectionId] = useState<string>(defaultConnection?.id || '');
  const [model, setModel] = useState<string>(defaultLanguageModel);

  const { messages, setMessages, handleSubmit, input, setInput, append, status, stop, reload } = useChat({
    id,
    body: { id, connectionId, model, useArtifacts: true },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error) => {
      console.error(error.message);
      toast.error('An error occured, please try again!');
    }
  });

  const { data: votes } = useQuery<Vote[]>({
    queryKey: ['votes', id],
    queryFn: () => fetcher(`/api/vote?chatId=${id}`),
    enabled: messages.length >= 2
  });

  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="bg-background flex h-full flex-col">
        <ChatHeader
          connections={connections}
          model={model}
          setModel={setModel}
          connectionId={connectionId}
          setConnectionId={setConnectionId}
        />

        <div className="flex-1 space-y-2 overflow-y-auto px-4 pt-6">
          <Messages
            projectId={projectId}
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isArtifactVisible={isArtifactVisible}
          />
        </div>

        <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 pt-2 md:max-w-3xl md:pb-6">
          <MultimodalInput
            suggestedActions={suggestedActions}
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            status={status}
            stop={stop}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        </form>
      </div>

      <Artifact
        projectId={projectId}
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
      />
    </>
  );
}
