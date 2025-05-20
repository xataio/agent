'use client';

import { useChat } from '@ai-sdk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@xata.io/components';
import type { UIMessage } from 'ai';
import { memo, useEffect, useRef, useState } from 'react';
import { Connection, MessageVote } from '~/lib/db/schema';
import { Artifact } from './artifacts/artifact';
import { useArtifactSelector } from './artifacts/use-artifact';
import { ChatHeader } from './header';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { SuggestedAction } from './suggested-actions';
import { fetcher, generateUUID } from './utils';

function PureChat({
  id,
  projectId,
  defaultLanguageModel,
  connections,
  initialMessages,
  initialInput,
  suggestedActions,
  initialConnectionId
}: {
  id: string;
  projectId: string;
  defaultLanguageModel: string;
  connections: Connection[];
  initialMessages?: Array<UIMessage>;
  initialInput?: string;
  suggestedActions?: SuggestedAction[];
  initialConnectionId?: string | null;
}) {
  const queryClient = useQueryClient();
  const defaultConnection = connections.find((c) => c.isDefault);
  const [connectionId, setConnectionId] = useState<string>(initialConnectionId || defaultConnection?.id || '');
  const [model, setModel] = useState<string>(defaultLanguageModel);

  const { messages, setMessages, handleSubmit, input, setInput, append, status, stop, reload } = useChat({
    id,
    body: { id, connectionId, model, useArtifacts: true },
    initialMessages,
    initialInput,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error) => {
      console.error(error.message);
      toast.error('An error occured, please try again!');
    }
  });

  useEffect(() => {
    // On first load, refresh the chat history cache
    void queryClient.invalidateQueries({ queryKey: ['chats'] });
  }, []);

  const { data: votes } = useQuery<MessageVote[]>({
    queryKey: ['votes', id],
    queryFn: () => fetcher(`/api/vote?chatId=${id}`),
    enabled: messages.length >= 2
  });

  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const layoutTopPadding = 'calc(var(--spacing)* 24)';
  const heightScreen = `calc(100vh - ${layoutTopPadding})`;

  // Using useRef to avoid re-initializing the chat on every render
  // This is a workaround to avoid re-initializing the chat when the component is re-mounted
  // and the messages are already loaded
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;

      // If chat has been loaded without an assistant message, we need to reload the chat
      if (initialMessages?.[initialMessages.length - 1]?.role === 'user') {
        void reload();
      }
    }
  }, [initialized, initialMessages, reload]);

  return (
    <>
      <div className="relative flex flex-col" style={{ height: heightScreen }}>
        <div className="sticky top-0">
          <ChatHeader
            connections={connections}
            model={model}
            setModel={setModel}
            connectionId={connectionId}
            setConnectionId={setConnectionId}
          />
        </div>
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

export const Chat = memo(PureChat, (prevProps, nextProps) => {
  return (
    prevProps.connections.length === nextProps.connections.length &&
    prevProps.suggestedActions?.length === nextProps.suggestedActions?.length &&
    prevProps.id === nextProps.id &&
    prevProps.projectId === nextProps.projectId &&
    prevProps.defaultLanguageModel === nextProps.defaultLanguageModel &&
    prevProps.initialMessages?.length === nextProps.initialMessages?.length &&
    prevProps.initialInput === nextProps.initialInput &&
    prevProps.initialConnectionId === nextProps.initialConnectionId
  );
});
