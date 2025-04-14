import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import equal from 'fast-deep-equal';
import { memo } from 'react';
import { MessageVote } from '~/lib/db/schema';
import { XataAgentLogo } from '../logo/xata-agent-logo';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';

interface MessagesProps {
  projectId: string;
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<MessageVote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isArtifactVisible: boolean;
}

function PureMessages({ projectId, chatId, status, votes, messages, setMessages, reload }: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div ref={messagesContainerRef} className="flex h-full flex-1 flex-col gap-6">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center">
          <XataAgentLogo size={300} />
        </div>
      )}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          projectId={projectId}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          vote={votes ? votes.find((vote) => vote.messageId === message.id) : undefined}
          setMessages={setMessages}
          reload={reload}
        />
      ))}

      {status === 'submitted' && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
        <ThinkingMessage />
      )}

      <div ref={messagesEndRef} className="min-h-[24px] min-w-[24px] shrink-0" />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  const prevIsLoading = prevProps.status === 'submitted' || prevProps.status === 'streaming';
  const nextIsLoading = nextProps.status === 'submitted' || nextProps.status === 'streaming';

  if (prevProps.status !== nextProps.status) return false;
  if (prevIsLoading && nextIsLoading) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;

  return true;
});
